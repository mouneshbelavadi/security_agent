import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getExpiryDate,
  isValidIndianPhone,
  normalizeIndianPhone,
} from "@/lib/crypto";
import { sendHostApprovalEmail, resolveRequestBaseUrl } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { z } from "zod";

const createVisitSchema = z.object({
  visitorName: z.string().trim().min(2, "Visitor name is required"),
  visitorEmail: z.string().trim().email("Valid email address is required"),
  visitorPhone: z.string().trim(),
  idType: z.enum(["AADHAAR", "DRIVING_LICENCE", "VOTER_ID", "PASSPORT", "PAN", "OTHER"]),
  purpose: z.string().trim().optional(),
  hostId: z.string().min(1, "Host employee is required"),
  idPhotoPath: z.string().min(1, "Visitor ID photo is required"),
  selfiePath: z.string().optional(),
});

// POST: Guard creates a new visit intake request
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

    const { visitorName, visitorEmail, visitorPhone, idType, purpose, hostId, idPhotoPath, selfiePath } = parsed.data;

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

    // Calculate request expiry
    const expiresAt = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);

    const visit = await db.visitRequest.create({
      data: {
        visitorName,
        visitorEmail: visitorEmail.toLowerCase(),
        visitorPhone: normalizedPhone,
        idType,
        purpose: purpose || null,
        hostId: host.id,
        idPhotoPath,
        selfiePath: selfiePath || null,
        status: "WAITING_HOST",
        expiresAt,
        createdByUserId: session.userId,
      },
      include: {
        host: true,
      },
    });

    // Log audit trail
    await logAudit({
      visitRequestId: visit.id,
      action: "CREATED_WAITING_HOST",
      actorType: "GUARD",
      details: `Gate entry requested by Guard ${session.name} (${session.username}) for visitor ${visitorName} (ID Type: ${idType}).`,
    });

    // Dispatch notification email to host with link to host dashboard
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
        action: "EMAIL_DELIVERY_FAILED",
        actorType: "SYSTEM",
        details: `Initial approval email dispatch to ${host.email} failed.`,
      });
    } else {
      await logAudit({
        visitRequestId: visit.id,
        action: "EMAIL_DELIVERY_SUCCESS",
        actorType: "SYSTEM",
        details: `Initial approval email delivered to ${host.email}.`,
      });
    }

    return NextResponse.json({
      success: true,
      requestId: visit.id,
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
