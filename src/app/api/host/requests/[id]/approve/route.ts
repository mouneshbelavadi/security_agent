import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateOtp, hashOtp, getExpiryDate, isExpired } from "@/lib/crypto";
import { sendVisitorOtp } from "@/lib/sms";
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

    // 3. Log audit trail
    await logAudit({
      visitRequestId: visit.id,
      action: "STATUS_APPROVED_BY_EMPLOYEE",
      actorType: "EMPLOYEE",
      details: `Host employee ${employee.name} (${employee.email}) approved visitor entry.`,
    });

    // 4. Send SMS to visitor's mobile via small wrapper (prints to console and writes to SmsOutbox table)
    await sendVisitorOtp(visit.visitorPhone, otp);

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      message: "Visitor request approved. SMS code dispatched to visitor.",
    });
  } catch (error) {
    console.error("Host approve error:", error);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
