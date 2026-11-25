import { db } from "./db";
import { generateOtp, hashOtp, getExpiryDate } from "./crypto";
import { sendVisitorOtpEmail } from "./email";
import { logAudit } from "./audit";
import { checkAndExpireVisit } from "./visit-lifecycle";
import { env } from "./env";

export type HostDecisionAction = "APPROVE" | "DENY";

export interface ExecuteHostDecisionParams {
  visitId: string;
  decision: HostDecisionAction;
  actorUserId?: string | null;
  actorName: string;
  actorEmail?: string | null;
  source: "WEB" | "TEAMS";
}

export interface ExecuteHostDecisionResult {
  ok: boolean;
  httpStatus: number;
  status: string;
  otpEmailSent?: boolean;
  message: string;
  error?: string;
}

/**
 * Shared business logic for host APPROVE / DENY actions coming from either
 * the web host dashboard or a Microsoft Teams Adaptive Card webhook callback.
 */
export async function executeHostDecision(
  params: ExecuteHostDecisionParams
): Promise<ExecuteHostDecisionResult> {
  const visit = await db.visitRequest.findUnique({
    where: { id: params.visitId },
    include: { host: true },
  });

  if (!visit) {
    return {
      ok: false,
      httpStatus: 404,
      status: "NOT_FOUND",
      message: "Visit request not found.",
      error: "Visit request not found.",
    };
  }

  const currentStatus = await checkAndExpireVisit({
    id: visit.id,
    visitorId: visit.visitorId,
    status: visit.status,
    expiresAt: visit.expiresAt,
    otpExpiresAt: visit.otpExpiresAt,
  });

  if (currentStatus === "EXPIRED") {
    return {
      ok: false,
      httpStatus: 400,
      status: "EXPIRED",
      message: "This visit request has expired.",
      error: "This visit request has expired.",
    };
  }

  if (currentStatus !== "WAITING_HOST") {
    return {
      ok: false,
      httpStatus: 400,
      status: currentStatus,
      message: `Request has already been processed (current status: ${currentStatus}).`,
      error: `Request cannot be modified (current status: ${currentStatus}).`,
    };
  }

  const channelSuffix = params.source === "TEAMS" ? " via Microsoft Teams" : "";
  const actorLabel = params.actorEmail
    ? `${params.actorName} (${params.actorEmail})`
    : params.actorName;

  if (params.decision === "DENY") {
    await db.visitRequest.update({
      where: { id: visit.id },
      data: { status: "DENIED" },
    });

    await logAudit({
      visitRequestId: visit.id,
      visitorId: visit.visitorId,
      actorUserId: params.actorUserId ?? visit.host.userId ?? null,
      actorName: params.actorName,
      action: params.source === "TEAMS" ? "STATUS_DENIED_VIA_TEAMS" : "STATUS_DENIED_BY_EMPLOYEE",
      actorType: "EMPLOYEE",
      details: `Host employee ${actorLabel} denied visitor entry${channelSuffix}.`,
    });

    return {
      ok: true,
      httpStatus: 200,
      status: "DENIED",
      message: `Visitor request denied${channelSuffix}.`,
    };
  }

  // APPROVE: Generate hashed 6-digit OTP & send ONLY to the visitor's email
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const otpExpiresAt = getExpiryDate(env.OTP_EXPIRY_MINUTES);

  await db.visitRequest.update({
    where: { id: visit.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      otpHash,
      otpExpiresAt,
    },
  });

  const otpEmailSent = await sendVisitorOtpEmail({
    visitorEmail: visit.visitorEmail,
    visitorName: visit.visitorName,
    hostName: visit.host.name,
    hostDepartment: visit.host.department,
    otp,
    expiryMinutes: env.OTP_EXPIRY_MINUTES,
  });

  const actionName =
    params.source === "TEAMS"
      ? otpEmailSent
        ? "STATUS_APPROVED_VIA_TEAMS_OTP_EMAILED"
        : "STATUS_APPROVED_VIA_TEAMS_OTP_FAILED"
      : otpEmailSent
      ? "STATUS_APPROVED_OTP_EMAILED"
      : "STATUS_APPROVED_OTP_EMAIL_FAILED";

  await logAudit({
    visitRequestId: visit.id,
    visitorId: visit.visitorId,
    actorUserId: params.actorUserId ?? visit.host.userId ?? null,
    actorName: params.actorName,
    action: actionName,
    actorType: "EMPLOYEE",
    details: otpEmailSent
      ? `Host ${actorLabel} approved visitor entry${channelSuffix}. 6-digit OTP emailed to ${visit.visitorEmail}.`
      : `Host ${actorLabel} approved visitor entry${channelSuffix}, but OTP email dispatch to ${visit.visitorEmail} failed.`,
  });

  return {
    ok: true,
    httpStatus: 200,
    status: "APPROVED",
    otpEmailSent,
    message: otpEmailSent
      ? `Visitor approved${channelSuffix}. 6-digit code sent via email to ${visit.visitorEmail}.`
      : `Visitor approved${channelSuffix}, but failed to send OTP email to ${visit.visitorEmail}. Please verify SMTP settings.`,
  };
}
