import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { checkAndExpireVisit } from "@/lib/visit-lifecycle";
import { z } from "zod";

const verifySchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit numerical OTP." },
        { status: 400 }
      );
    }

    const { otp } = parsed.data;

    const visit = await db.visitRequest.findUnique({
      where: { id: params.id },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found." }, { status: 404 });
    }

    if (visit.status === "LOCKED") {
      return NextResponse.json(
        { error: "Request is locked due to 3 failed attempts. Please start a new request.", status: "LOCKED" },
        { status: 403 }
      );
    }

    if (visit.status === "ENTERED") {
      return NextResponse.json(
        { message: "Visitor has already entered.", status: "ENTERED" },
        { status: 200 }
      );
    }

    const currentStatus = await checkAndExpireVisit({
      id: visit.id,
      visitorId: visit.visitorId,
      status: visit.status,
      expiresAt: visit.expiresAt,
      otpExpiresAt: visit.otpExpiresAt,
    });

    if (currentStatus === "EXPIRED") {
      return NextResponse.json(
        { error: "OTP has expired. Please initiate a new visit request.", status: "EXPIRED" },
        { status: 400 }
      );
    }

    if (currentStatus !== "APPROVED") {
      return NextResponse.json(
        { error: `Cannot verify OTP. Current request status is ${currentStatus}.`, status: currentStatus },
        { status: 400 }
      );
    }

    if (!visit.otpHash) {
      return NextResponse.json(
        { error: "No OTP on record for this request." },
        { status: 400 }
      );
    }

    const actorType = session.role === "ADMIN" ? "ADMIN" : "GUARD";
    const isMatch = verifyOtp(otp, visit.otpHash);

    if (!isMatch) {
      const updatedAttempts = visit.otpAttempts + 1;
      const isNowLocked = updatedAttempts >= 3;
      const newStatus = isNowLocked ? "LOCKED" : "APPROVED";

      await db.visitRequest.update({
        where: { id: visit.id },
        data: {
          otpAttempts: updatedAttempts,
          status: newStatus,
        },
      });

      await logAudit({
        visitRequestId: visit.id,
        visitorId: visit.visitorId,
        actorUserId: session.userId,
        actorName: session.name,
        action: isNowLocked ? "STATUS_LOCKED_FAILED_OTP" : "FAILED_OTP_ATTEMPT",
        actorType,
        details: isNowLocked
          ? `3 incorrect OTP attempts. Request locked by ${session.name} (${session.username}).`
          : `Incorrect OTP entered by ${session.name} (${session.username}) (Attempt ${updatedAttempts} of 3).`,
      });

      if (isNowLocked) {
        return NextResponse.json(
          {
            error: "Maximum 3 wrong attempts reached. Request is locked. Guard must start a new request.",
            status: "LOCKED",
            attemptsRemaining: 0,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: `Incorrect OTP. ${3 - updatedAttempts} attempt(s) remaining.`,
          status: "APPROVED",
          attemptsRemaining: 3 - updatedAttempts,
        },
        { status: 400 }
      );
    }

    const enteredAt = new Date();
    await db.visitRequest.update({
      where: { id: visit.id },
      data: {
        status: "ENTERED",
        enteredAt,
      },
    });

    await logAudit({
      visitRequestId: visit.id,
      visitorId: visit.visitorId,
      actorUserId: session.userId,
      actorName: session.name,
      action: "STATUS_ENTERED",
      actorType,
      details: `OTP verified successfully by ${session.name} (${session.username}). Visitor entry allowed.`,
    });

    return NextResponse.json({
      success: true,
      status: "ENTERED",
      enteredAt,
      message: "Allow Entry",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Server error verifying OTP." },
      { status: 500 }
    );
  }
}
