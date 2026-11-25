import { env } from "./env";
import { maskPhoneNumber, sendHostApprovalEmail } from "./email";

export type HostNotificationChannel = "TEAMS" | "EMAIL";

export interface HostTeamsNotificationParams {
  requestId: string;
  hostEmail: string;
  hostName: string;
  hostDepartment: string;
  visitorName: string;
  visitorPhone: string;
  purpose?: string | null;
  baseUrl?: string;
  arrivalTime?: string;
  expiryMinutes?: number;
}

export function isTeamsNotificationEnabled(): boolean {
  if (env.HOST_NOTIFICATION_MODE === "email") return false;
  if (env.HOST_NOTIFICATION_MODE === "teams") return true;
  return Boolean(env.TEAMS_WORKFLOW_URL && env.TEAMS_WORKFLOW_URL.trim().length > 0);
}

/**
 * Builds an Adaptive Card v1.4 payload with native 1-click Approve / Deny Submit buttons
 * for Power Automate ("Post adaptive card in a chat or channel and wait for a response"),
 * plus a fallback review URL attachment for standard channel webhooks.
 */
export function buildTeamsAdaptiveCard(params: {
  requestId: string;
  hostName: string;
  hostDepartment: string;
  visitorName: string;
  visitorPhoneMasked: string;
  purpose?: string | null;
  arrivalTime: string;
  expiryMinutes: number;
  reviewUrl: string;
}) {
  const facts = [
    { title: "Visitor", value: params.visitorName },
    { title: "Mobile", value: params.visitorPhoneMasked },
    { title: "Host", value: `${params.hostName} (${params.hostDepartment})` },
    { title: "Purpose", value: params.purpose || "General Visit" },
    { title: "Arrived", value: params.arrivalTime },
  ];

  const interactiveCard = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      {
        type: "TextBlock",
        text: `${env.COMPANY_NAME} - Gate Visitor Approval`,
        weight: "Bolder",
        size: "Medium",
        color: "Accent",
      },
      {
        type: "TextBlock",
        text: `A visitor is waiting at the main gate to meet ${params.hostName}. Approving sends a 6-digit OTP to the visitor's email.`,
        wrap: true,
        spacing: "Small",
      },
      {
        type: "FactSet",
        facts,
        spacing: "Medium",
      },
      {
        type: "TextBlock",
        text: `Request expires in ${params.expiryMinutes} minutes.`,
        isSubtle: true,
        size: "Small",
        wrap: true,
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        id: "APPROVE",
        title: "Approve Entry",
        style: "positive",
        data: {
          decision: "APPROVE",
          requestId: params.requestId,
        },
      },
      {
        type: "Action.Submit",
        id: "DENY",
        title: "Deny Entry",
        style: "destructive",
        data: {
          decision: "DENY",
          requestId: params.requestId,
        },
      },
      {
        type: "Action.OpenUrl",
        title: "Open Dashboard",
        url: params.reviewUrl,
      },
    ],
  };

  return interactiveCard;
}

/**
 * Posts visitor arrival payload + Adaptive Card to the configured Microsoft Power Automate Teams Workflow URL.
 */
export async function sendTeamsApprovalRequest(
  params: HostTeamsNotificationParams
): Promise<{ sent: boolean; error?: string }> {
  const workflowUrl = env.TEAMS_WORKFLOW_URL.trim();
  if (!workflowUrl) {
    return { sent: false, error: "TEAMS_WORKFLOW_URL is not configured." };
  }

  const baseUrl = (params.baseUrl || env.APP_BASE_URL).replace(/\/$/, "");
  const arrivalTime =
    params.arrivalTime ||
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const expiryMinutes = params.expiryMinutes ?? env.REQUEST_EXPIRY_MINUTES;
  const maskedPhone = maskPhoneNumber(params.visitorPhone);
  const reviewUrl = `${baseUrl}/host/requests/${params.requestId}`;
  const callbackUrl = `${baseUrl}/api/integrations/teams/decision`;

  const adaptiveCard = buildTeamsAdaptiveCard({
    requestId: params.requestId,
    hostName: params.hostName,
    hostDepartment: params.hostDepartment,
    visitorName: params.visitorName,
    visitorPhoneMasked: maskedPhone,
    purpose: params.purpose,
    arrivalTime,
    expiryMinutes,
    reviewUrl,
  });

  // Includes structured properties for Power Automate 1-on-1 DM flows AND fallback Teams channel attachment format
  const payload = {
    requestId: params.requestId,
    callbackUrl,
    callbackSecret: env.TEAMS_WEBHOOK_SECRET,
    approveUrl: reviewUrl,
    hostEmail: params.hostEmail,
    hostName: params.hostName,
    hostDepartment: params.hostDepartment,
    visitorName: params.visitorName,
    visitorPhoneMasked: maskedPhone,
    purpose: params.purpose || "General Visit",
    arrivalTime,
    expiryMinutes,
    adaptiveCard,
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          ...adaptiveCard,
          actions: [
            {
              type: "Action.OpenUrl",
              title: "Approve / Deny Visitor",
              url: reviewUrl,
            },
          ],
        },
      },
    ],
  };

  try {
    const res = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[TEAMS] Workflow webhook error ${res.status}:`, text);
      return { sent: false, error: `Teams workflow returned HTTP ${res.status}` };
    }

    return { sent: true };
  } catch (err: any) {
    console.error("[TEAMS] Failed to post approval request:", err);
    return { sent: false, error: err?.message || "Failed to reach Teams workflow" };
  }
}

/**
 * Dispatches host arrival notification via Microsoft Teams (zero employee emails)
 * or falls back to Host Arrival Email when Teams is disabled/unconfigured in auto mode.
 */
export async function notifyHostForApproval(
  params: HostTeamsNotificationParams
): Promise<{ sent: boolean; channel: HostNotificationChannel; error?: string }> {
  if (isTeamsNotificationEnabled()) {
    const teamsRes = await sendTeamsApprovalRequest(params);
    return {
      sent: teamsRes.sent,
      channel: "TEAMS",
      error: teamsRes.error,
    };
  }

  const emailSent = await sendHostApprovalEmail({
    hostEmail: params.hostEmail,
    hostName: params.hostName,
    visitorName: params.visitorName,
    visitorPhone: params.visitorPhone,
    purpose: params.purpose,
    requestId: params.requestId,
    baseUrl: params.baseUrl,
    arrivalTime: params.arrivalTime,
    expiryMinutes: params.expiryMinutes,
  });

  return {
    sent: emailSent,
    channel: "EMAIL",
    error: emailSent ? undefined : "Host email dispatch failed",
  };
}
