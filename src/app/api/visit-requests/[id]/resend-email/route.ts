import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getExpiryDate } from "@/lib/crypto";
import { sendHostApprovalEmail, resolveRequestBaseUrl } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";

// POST /api/visit-requests/[id]/resend-email
// Guard or Admin retries sending the host approval email
export async function POST(
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
      include: { host: true },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found." }, { status: 404 });
    }

    if (visit.status !== "WAITING_HOST") {
      return NextResponse.json(
        { error: `Cannot resend email for a request in status ${visit.status}.` },
        { status: 400 }
      );
    }

    // Reset expiry for host decision
    const expiresAt = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);

    await db.visitRequest.update({
      where: { id: visit.id },
      data: {
        expiresAt,
      },
    });

    const baseUrl = resolveRequestBaseUrl(request);
    const emailSent = await sendHostApprovalEmail({
      hostEmail: visit.host.email,
      hostName: visit.host.name,
      visitorName: visit.visitorName,
      visitorPhone: visit.visitorPhone,
      purpose: visit.purpose,
      requestId: visit.id,
      baseUrl,
      expiryMinutes: env.REQUEST_EXPIRY_MINUTES,
    });

    if (emailSent) {
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { emailFailed: false },
      });

      await logAudit({
        visitRequestId: visit.id,
        action: "EMAIL_RESENT_SUCCESS",
        actorType: session.role === "ADMIN" ? "ADMIN" : "GUARD",
        details: `Approval email resent to host ${visit.host.name} (${visit.host.email}) by ${session.name}.`,
      });

      return NextResponse.json({
        success: true,
        message: "Email sent to host successfully.",
        expiresAt,
      });
    } else {
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { emailFailed: true },
      });

      await logAudit({
        visitRequestId: visit.id,
        action: "EMAIL_RESENT_FAILED",
        actorType: session.role === "ADMIN" ? "ADMIN" : "GUARD",
        details: `Retry approval email dispatch to ${visit.host.email} failed.`,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Email could not be sent. Please call the host.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Resend email error:", error);
    return NextResponse.json(
      { error: "Server error attempting to resend email." },
      { status: 500 }
    );
  }
}
