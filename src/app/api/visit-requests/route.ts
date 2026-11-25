import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getExpiryDate,
  isValidIndianPhone,
  normalizeIndianPhone,
} from "@/lib/crypto";
import { sendHostApprovalEmail, resolveRequestBaseUrl } from "@/lib/email";
import { logAudit, AuditActorType } from "@/lib/audit";
import { resolveOrUpsertVisitor } from "@/lib/visit-lifecycle";
import { env } from "@/lib/env";
import { z } from "zod";

const createVisitSchema = z
  .object({
    visitorName: z.string().trim().min(2, "Visitor name is required"),
    visitorEmail: z.string().trim().email("Valid email address is required"),
    visitorPhone: z.string().trim(),
    idType: z.enum(["AADHAAR", "DRIVING_LICENCE", "VOTER_ID", "PASSPORT", "PAN", "OTHER"]),
    purpose: z.string().trim().optional(),
    hostId: z.string().min(1, "Host employee is required"),
    idPhotoPath: z.string().trim().optional().nullable(),
    idNumber: z.string().trim().max(30, "ID number is too long").optional().nullable(),
    selfiePath: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      Boolean(data.idPhotoPath && data.idPhotoPath.length > 0) ||
      Boolean(data.idNumber && data.idNumber.trim().length >= 4),
    {
      message: "Please either take an ID photo or enter a valid ID number (minimum 4 characters).",
    }
  );

// POST: Guard creates a new visit intake request linked to canonical Visitor history
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createVisitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const {
      visitorName,
      visitorEmail,
      visitorPhone,
      idType,
      purpose,
      hostId,
      idPhotoPath,
      idNumber,
      selfiePath,
    } = parsed.data;

    if (!isValidIndianPhone(visitorPhone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeIndianPhone(visitorPhone);

    const host = await db.employee.findUnique({
      where: { id: hostId },
    });

    if (!host || !host.isActive) {
      return NextResponse.json(
        { error: "Selected host employee is inactive or not found." },
        { status: 400 }
      );
    }

    const expiresAt = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);

    const { visit, visitorId, visitNumber } = await db.$transaction(async (tx) => {
      const resolved = await resolveOrUpsertVisitor(tx, {
        visitorName,
        visitorEmail,
        normalizedPhone,
        idType,
        idNumber: idNumber?.trim() || null,
        idPhotoPath: idPhotoPath || null,
        selfiePath: selfiePath || null,
      });

      const createdVisit = await tx.visitRequest.create({
        data: {
          visitorId: resolved.visitorId,
          visitNumber: resolved.visitNumber,
          visitorName,
          visitorEmail: visitorEmail.toLowerCase(),
          visitorPhone: normalizedPhone,
          idType,
          idNumber: idNumber?.trim() || null,
          purpose: purpose || null,
          hostId: host.id,
          idPhotoPath: idPhotoPath || null,
          selfiePath: selfiePath || null,
          status: "WAITING_HOST",
          expiresAt,
          createdByUserId: session.userId,
        },
        include: {
          host: true,
        },
      });

      return {
        visit: createdVisit,
        visitorId: resolved.visitorId,
        visitNumber: resolved.visitNumber,
      };
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    const actorType: AuditActorType = session.role === "ADMIN" ? "ADMIN" : "GUARD";
    const idMethodSummary =
      idPhotoPath && idNumber
        ? `Photo + Number (${idNumber.trim()})`
        : idPhotoPath
        ? "Photo"
        : `ID Number (${idNumber?.trim()})`;

    await logAudit({
      visitRequestId: visit.id,
      visitorId,
      actorUserId: session.userId,
      actorName: session.name,
      action: "CREATED_WAITING_HOST",
      actorType,
      details: `Gate entry (Visit #${visitNumber}) requested by ${session.name} (${session.username}) for visitor ${visitorName} (Host: ${host.name}, ID Type: ${idType}, Method: ${idMethodSummary}).`,
    });

    const baseUrl = resolveRequestBaseUrl(request);
    const emailSent = await sendHostApprovalEmail({
      hostEmail: host.email,
      hostName: host.name,
      visitorName: visit.visitorName,
      visitorPhone: visit.visitorPhone,
      purpose: visit.purpose,
      requestId: visit.id,
      baseUrl,
      expiryMinutes: env.REQUEST_EXPIRY_MINUTES,
    });

    if (!emailSent) {
      console.warn(`[WARN] Approval email dispatch failed for visitRequest ${visit.id}`);
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { emailFailed: true },
      });
      await logAudit({
        visitRequestId: visit.id,
        visitorId,
        action: "EMAIL_DELIVERY_FAILED",
        actorType: "SYSTEM",
        details: `Initial approval email dispatch to ${host.email} failed.`,
      });
    } else {
      await logAudit({
        visitRequestId: visit.id,
        visitorId,
        action: "EMAIL_DELIVERY_SUCCESS",
        actorType: "SYSTEM",
        details: `Initial approval email delivered to ${host.email}.`,
      });
    }

    return NextResponse.json({
      success: true,
      requestId: visit.id,
      visitorId,
      visitNumber,
      status: visit.status,
      hostName: host.name,
      hostDepartment: host.department,
      visitorName: visit.visitorName,
      visitorPhone: visit.visitorPhone,
      expiresAt: visit.expiresAt,
      emailFailed: !emailSent,
    });
  } catch (error) {
    console.error("Create visit request error:", error);
    return NextResponse.json(
      { error: "Failed to record visitor request. Please try again." },
      { status: 500 }
    );
  }
}
