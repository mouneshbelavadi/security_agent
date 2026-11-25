import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getExpiryDate } from "@/lib/crypto";
import { resolveRequestBaseUrl } from "@/lib/email";
import { notifyHostForApproval } from "@/lib/teams";
import { logAudit, roleToActorType } from "@/lib/audit";
import { env } from "@/lib/env";

// POST /api/visit-requests/[id]/resend-email
// Guard or Admin retries sending the host approval notification (Teams or Email fallback)
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
        { error: `Cannot resend notification for a request in status ${visit.status}.` },
        { status: 400 }
      );
    }

    const expiresAt = getExpiryDate(env.REQUEST_EXPIRY_MINUTES);

    await db.visitRequest.update({
      where: { id: visit.id },
      data: {
        expiresAt,
      },
    });

    const baseUrl = resolveRequestBaseUrl(request);
    const notifyResult = await notifyHostForApproval({
      hostEmail: visit.host.email,
      hostName: visit.host.name,
      hostDepartment: visit.host.department,
      visitorName: visit.visitorName,
      visitorPhone: visit.visitorPhone,
      purpose: visit.purpose,
      requestId: visit.id,
      baseUrl,
      expiryMinutes: env.REQUEST_EXPIRY_MINUTES,
    });

    const actorType = roleToActorType(session.role);
    const isTeams = notifyResult.channel === "TEAMS";

    if (notifyResult.sent) {
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { emailFailed: false },
      });

      await logAudit({
        visitRequestId: visit.id,
        visitorId: visit.visitorId,
        actorUserId: session.userId,
        actorName: session.name,
        action: isTeams ? "TEAMS_NOTIFICATION_RESENT" : "EMAIL_RESENT_SUCCESS",
        actorType,
        details: isTeams
          ? `Teams approval card resent for host ${visit.host.name} (${visit.host.email}) by ${session.name}.`
          : `Approval email resent to host ${visit.host.name} (${visit.host.email}) by ${session.name}.`,
      });

      return NextResponse.json({
        success: true,
        notificationChannel: notifyResult.channel,
        message: isTeams
          ? "Teams approval request sent to host successfully."
          : "Email sent to host successfully.",
        expiresAt,
      });
    } else {
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { emailFailed: true },
      });

      await logAudit({
        visitRequestId: visit.id,
        visitorId: visit.visitorId,
        actorUserId: session.userId,
        actorName: session.name,
        action: isTeams ? "TEAMS_NOTIFICATION_RESENT_FAILED" : "EMAIL_RESENT_FAILED",
        actorType,
        details: isTeams
          ? `Retry Teams notification for ${visit.host.email} failed: ${notifyResult.error || "Unknown error"}.`
          : `Retry approval email dispatch to ${visit.host.email} failed.`,
      });

      return NextResponse.json(
        {
          success: false,
          notificationChannel: notifyResult.channel,
          error: isTeams
            ? "Microsoft Teams notification could not be sent. Please call the host."
            : "Email could not be sent. Please call the host.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Resend notification error:", error);
    return NextResponse.json(
      { error: "Server error attempting to resend host notification." },
      { status: 500 }
    );
  }
}
