import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateOtp, hashOtp, getExpiryDate, isExpired } from "@/lib/crypto";
import { sendVisitorOtpEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";

// POST /api/host/requests/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await getAuthenticatedEmployee(session.userId);
    if (!employee) {
      return NextResponse.json(
        { error: "No employee profile linked to your account." },
        { status: 403 }
      );
    }

    const visit = await db.visitRequest.findUnique({
      where: { id: params.id },
      include: { host: true },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found." }, { status: 404 });
    }

    // STRICT PERMISSION CHECK: Employee can only approve their own request!
    if (visit.hostId !== employee.id && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied: You cannot approve a request addressed to another employee." },
        { status: 403 }
      );
    }

    if (visit.status !== "WAITING_HOST") {
      return NextResponse.json(
        { error: `Request cannot be approved (current status: ${visit.status}).` },
        { status: 400 }
      );
    }

    if (visit.expiresAt && isExpired(visit.expiresAt)) {
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This visit request has expired." },
        { status: 400 }
      );
    }

    // 1. Generate 6-digit OTP and hash it (never store plain OTP in database)
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = getExpiryDate(env.OTP_EXPIRY_MINUTES);

    // 2. Update VisitRequest status to APPROVED
    await db.visitRequest.update({
      where: { id: visit.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        otpHash,
        otpExpiresAt,
      },
    });

    // 3. Send 6-digit OTP directly to visitor's email via Gmail SMTP
    const otpEmailSent = await sendVisitorOtpEmail({
      visitorEmail: visit.visitorEmail,
      visitorName: visit.visitorName,
      hostName: visit.host.name,
      hostDepartment: visit.host.department,
      otp,
      expiryMinutes: env.OTP_EXPIRY_MINUTES,
    });

    // 4. Log audit trail
    await logAudit({
      visitRequestId: visit.id,
      action: otpEmailSent ? "STATUS_APPROVED_OTP_EMAILED" : "STATUS_APPROVED_OTP_EMAIL_FAILED",
      actorType: "EMPLOYEE",
      details: otpEmailSent
        ? `Host employee ${employee.name} (${employee.email}) approved visitor entry. 6-digit OTP emailed to ${visit.visitorEmail}.`
        : `Host employee ${employee.name} (${employee.email}) approved visitor entry, but OTP email dispatch to ${visit.visitorEmail} failed.`,
    });

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      otpEmailSent,
      message: otpEmailSent
        ? `Visitor approved. 6-digit code sent via email to ${visit.visitorEmail}.`
        : `Visitor approved, but failed to send OTP email to ${visit.visitorEmail}. Please verify SMTP settings.`,
    });
  } catch (error) {
    console.error("Host approve error:", error);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
