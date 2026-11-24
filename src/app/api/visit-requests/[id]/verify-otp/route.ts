import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyOtp, isExpired } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
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

    if (visit.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Cannot verify OTP. Current request status is ${visit.status}.`, status: visit.status },
        { status: 400 }
      );
    }

    if (isExpired(visit.otpExpiresAt)) {
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { status: "EXPIRED" },
      });
      await logAudit({
        visitRequestId: visit.id,
        action: "STATUS_EXPIRED_OTP_TIMEOUT",
        actorType: "SYSTEM",
        details: "OTP expired before verification.",
      });
      return NextResponse.json(
        { error: "OTP has expired. Please initiate a new visit request.", status: "EXPIRED" },
        { status: 400 }
      );
    }

    if (!visit.otpHash) {
      return NextResponse.json(
        { error: "No OTP on record for this request." },
        { status: 400 }
      );
    }

    // Verify OTP
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
        action: isNowLocked ? "STATUS_LOCKED_FAILED_OTP" : "FAILED_OTP_ATTEMPT",
        actorType: "GUARD",
        details: isNowLocked
          ? `3 incorrect OTP attempts. Request locked by Guard ${session.name}.`
          : `Incorrect OTP entered by Guard ${session.name} (Attempt ${updatedAttempts} of 3).`,
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

    // OTP Verified! Allow Entry!
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
      action: "STATUS_ENTERED",
      actorType: "GUARD",
      details: `OTP verified successfully by Guard ${session.name}. Visitor entry allowed.`,
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
