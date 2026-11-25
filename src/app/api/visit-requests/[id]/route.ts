import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isExpired } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const visit = await db.visitRequest.findUnique({
      where: { id: params.id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found" }, { status: 404 });
    }

    // Check expiration if still in WAITING_HOST or APPROVED status
    let currentStatus = visit.status;

    if (currentStatus === "WAITING_HOST" && isExpired(visit.expiresAt)) {
      currentStatus = "EXPIRED";
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { status: "EXPIRED" },
      });
      await logAudit({
        visitRequestId: visit.id,
        action: "STATUS_EXPIRED_HOST_TIMEOUT",
        actorType: "SYSTEM",
        details: "Host approval window elapsed without decision.",
      });
    } else if (currentStatus === "APPROVED" && isExpired(visit.otpExpiresAt)) {
      currentStatus = "EXPIRED";
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { status: "EXPIRED" },
      });
      await logAudit({
        visitRequestId: visit.id,
        action: "STATUS_EXPIRED_OTP_TIMEOUT",
        actorType: "SYSTEM",
        details: "Visitor OTP validity window elapsed before verification.",
      });
    }

    // Determine relevant expiration timestamp for live countdown
    let expiresAt: Date | null = null;
    if (currentStatus === "WAITING_HOST") {
      expiresAt = visit.expiresAt;
    } else if (currentStatus === "APPROVED") {
      expiresAt = visit.otpExpiresAt;
    }

    // IMPORTANT: Security rule: Never expose the otpHash or raw OTP to the guard!
    return NextResponse.json({
      id: visit.id,
      visitorName: visit.visitorName,
      visitorEmail: visit.visitorEmail,
      visitorPhone: visit.visitorPhone,
      idType: visit.idType,
      idNumber: visit.idNumber,
      purpose: visit.purpose,
      idPhotoPath: visit.idPhotoPath,
      selfiePath: visit.selfiePath,
      status: currentStatus,
      hostName: visit.host.name,
      hostDepartment: visit.host.department,
      hostEmail: visit.host.email,
      emailFailed: visit.emailFailed,
      otpAttempts: visit.otpAttempts,
      maxAttempts: 3,
      createdAt: visit.createdAt,
      expiresAt: expiresAt?.toISOString() || null,
      approvedAt: visit.approvedAt,
      enteredAt: visit.enteredAt,
      exitedAt: visit.exitedAt,
    });
  } catch (error) {
    console.error("Fetch visit request status error:", error);
    return NextResponse.json({ error: "Failed to fetch request status" }, { status: 500 });
  }
}
