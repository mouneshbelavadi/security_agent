import { IdType, Prisma } from "@prisma/client";
import { db } from "./db";
import { isExpired } from "./crypto";
import { logAudit } from "./audit";

export interface VisitExpiryCandidate {
  id: string;
  visitorId?: string | null;
  status: string;
  expiresAt: Date | null;
  otpExpiresAt: Date | null;
}

/**
 * Checks whether a single active visit request has crossed its host-approval or OTP expiry window.
 * Uses conditional updateMany so concurrent pollers do not write duplicate expiration audit logs.
 */
export async function checkAndExpireVisit(visit: VisitExpiryCandidate): Promise<string> {
  if (visit.status === "WAITING_HOST" && isExpired(visit.expiresAt)) {
    const updated = await db.visitRequest.updateMany({
      where: { id: visit.id, status: "WAITING_HOST" },
      data: { status: "EXPIRED" },
    });
    if (updated.count > 0) {
      await logAudit({
        visitRequestId: visit.id,
        visitorId: visit.visitorId ?? null,
        action: "STATUS_EXPIRED_HOST_TIMEOUT",
        actorType: "SYSTEM",
        details: "Host approval window elapsed without decision.",
      });
    }
    return "EXPIRED";
  }

  if (visit.status === "APPROVED" && isExpired(visit.otpExpiresAt)) {
    const updated = await db.visitRequest.updateMany({
      where: { id: visit.id, status: "APPROVED" },
      data: { status: "EXPIRED" },
    });
    if (updated.count > 0) {
      await logAudit({
        visitRequestId: visit.id,
        visitorId: visit.visitorId ?? null,
        action: "STATUS_EXPIRED_OTP_TIMEOUT",
        actorType: "SYSTEM",
        details: "Visitor OTP validity window elapsed before verification.",
      });
    }
    return "EXPIRED";
  }

  return visit.status;
}

/**
 * Bulk-expires any stale WAITING_HOST or APPROVED requests before reporting counts/logs.
 */
export async function expireAllStaleVisits(): Promise<void> {
  const now = new Date();
  const stale = await db.visitRequest.findMany({
    where: {
      OR: [
        { status: "WAITING_HOST", expiresAt: { lt: now } },
        { status: "APPROVED", otpExpiresAt: { lt: now } },
      ],
    },
    select: {
      id: true,
      visitorId: true,
      status: true,
      expiresAt: true,
      otpExpiresAt: true,
    },
  });

  for (const visit of stale) {
    await checkAndExpireVisit(visit);
  }
}

export interface UpsertVisitorParams {
  visitorName: string;
  visitorEmail: string;
  normalizedPhone: string;
  idType: IdType;
  idNumber?: string | null;
  idPhotoPath?: string | null;
  selfiePath?: string | null;
}

/**
 * Creates or updates the canonical Visitor profile matched by normalized phone number,
 * and returns the visitor plus chronological visitNumber for the new VisitRequest.
 */
export async function resolveOrUpsertVisitor(
  tx: Prisma.TransactionClient,
  params: UpsertVisitorParams
): Promise<{ visitorId: string; visitNumber: number }> {
  const emailLower = params.visitorEmail.trim().toLowerCase();
  const cleanIdNumber = params.idNumber?.trim() || null;

  const existing = await tx.visitor.findUnique({
    where: { phone: params.normalizedPhone },
  });

  if (existing) {
    const nextVisitNumber = existing.visitCount + 1;
    const updated = await tx.visitor.update({
      where: { id: existing.id },
      data: {
        name: params.visitorName,
        email: emailLower,
        lastIdType: params.idType,
        lastIdNumber: cleanIdNumber ?? existing.lastIdNumber,
        lastIdPhotoPath: params.idPhotoPath || existing.lastIdPhotoPath,
        lastSelfiePath: params.selfiePath || existing.lastSelfiePath,
        visitCount: nextVisitNumber,
        lastVisitAt: new Date(),
      },
    });
    return { visitorId: updated.id, visitNumber: nextVisitNumber };
  }

  const created = await tx.visitor.create({
    data: {
      phone: params.normalizedPhone,
      email: emailLower,
      name: params.visitorName,
      lastIdType: params.idType,
      lastIdNumber: cleanIdNumber,
      lastIdPhotoPath: params.idPhotoPath || null,
      lastSelfiePath: params.selfiePath || null,
      visitCount: 1,
      firstVisitAt: new Date(),
      lastVisitAt: new Date(),
    },
  });

  return { visitorId: created.id, visitNumber: 1 };
}

/**
 * Ensures any legacy VisitRequest rows without a linked Visitor record are backfilled cleanly.
 */
export async function backfillUnlinkedVisitors(): Promise<void> {
  const unlinked = await db.visitRequest.findMany({
    where: { visitorId: null },
    orderBy: { createdAt: "asc" },
  });

  if (unlinked.length === 0) return;

  for (const visit of unlinked) {
    const existing = await db.visitor.findUnique({
      where: { phone: visit.visitorPhone },
    });

    if (existing) {
      const priorCount = await db.visitRequest.count({
        where: { visitorId: existing.id },
      });
      const visitNumber = priorCount + 1;

      await db.$transaction([
        db.visitRequest.update({
          where: { id: visit.id },
          data: { visitorId: existing.id, visitNumber },
        }),
        db.visitor.update({
          where: { id: existing.id },
          data: {
            name: visit.visitorName,
            email: visit.visitorEmail.toLowerCase(),
            visitCount: Math.max(existing.visitCount, visitNumber),
            lastVisitAt:
              visit.createdAt > existing.lastVisitAt ? visit.createdAt : existing.lastVisitAt,
            lastIdType: visit.idType,
            lastIdNumber: visit.idNumber ?? existing.lastIdNumber,
            lastIdPhotoPath: visit.idPhotoPath || existing.lastIdPhotoPath,
            lastSelfiePath: visit.selfiePath || existing.lastSelfiePath,
          },
        }),
        db.auditLog.updateMany({
          where: { visitRequestId: visit.id, visitorId: null },
          data: { visitorId: existing.id },
        }),
      ]);
    } else {
      const createdVisitor = await db.visitor.create({
        data: {
          phone: visit.visitorPhone,
          email: visit.visitorEmail.toLowerCase(),
          name: visit.visitorName,
          lastIdType: visit.idType,
          lastIdNumber: visit.idNumber,
          lastIdPhotoPath: visit.idPhotoPath,
          lastSelfiePath: visit.selfiePath,
          visitCount: 1,
          firstVisitAt: visit.createdAt,
          lastVisitAt: visit.createdAt,
        },
      });

      await db.$transaction([
        db.visitRequest.update({
          where: { id: visit.id },
          data: { visitorId: createdVisitor.id, visitNumber: 1 },
        }),
        db.auditLog.updateMany({
          where: { visitRequestId: visit.id, visitorId: null },
          data: { visitorId: createdVisitor.id },
        }),
      ]);
    }
  }
}

/**
 * Returns IST (Asia/Kolkata, UTC+05:30) day boundaries so "Today" matches local Indian
 * gate operations both on localhost and on UTC Vercel serverless functions.
 */
export function getIstDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function getIstDayBounds(dateStr?: string | null): { start: Date; end: Date } {
  const resolved =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getIstDateString();
  return {
    start: new Date(`${resolved}T00:00:00.000+05:30`),
    end: new Date(`${resolved}T23:59:59.999+05:30`),
  };
}
