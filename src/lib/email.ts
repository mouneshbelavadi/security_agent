import nodemailer from "nodemailer";
import { env } from "./env";
import { db } from "./db";

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  connectionTimeout: 2500,
  greetingTimeout: 2500,
  auth: env.SMTP_USER
    ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      }
    : undefined,
  tls: {
    rejectUnauthorized: false,
  },
});

export interface HostApprovalEmailParams {
  hostEmail: string;
  hostName: string;
  visitorName: string;
  visitorPhone: string;
  purpose?: string | null;
  requestId: string;
  baseUrl?: string;
  arrivalTime?: string;
  expiryMinutes?: number;
}

/**
 * Resolve runtime base URL from incoming request headers so Preview/Production Vercel URLs work automatically.
 */
export function resolveRequestBaseUrl(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return env.APP_BASE_URL;
}

/**
 * Masks phone number to show only last 4 digits (e.g. ******3210)
 */
export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  const maskedPrefix = "*".repeat(digits.length - 4);
  return `${maskedPrefix}${digits.slice(-4)}`;
}

/**
 * Send employee notification email when a visitor arrives at the gate.
 * Always saves to EmailOutbox (available at /demo/email-inbox for cloud/Vercel previews)
 * and sends via Nodemailer SMTP when an SMTP server is configured.
 */
export async function sendHostApprovalEmail(params: HostApprovalEmailParams): Promise<boolean> {
  const {
    hostEmail,
    hostName,
    visitorName,
    visitorPhone,
    purpose,
    requestId,
    baseUrl = env.APP_BASE_URL,
    arrivalTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  } = params;

  const maskedPhone = maskPhoneNumber(visitorPhone);
  const subject = "A visitor has arrived to meet you";
  const cleanBase = baseUrl.replace(/\/$/, "");
  const dashboardUrl = `${cleanBase}/host/requests/${requestId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #0F172A;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .wrapper {
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 32px;
    }
    .company {
      font-size: 13px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 20px;
    }
    .text {
      font-size: 15px;
      color: #334155;
      margin-bottom: 20px;
    }
    .details {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 28px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #EDF2F7;
      font-size: 14px;
    }
    .row:last-child {
      border-bottom: none;
    }
    .label {
      color: #64748B;
    }
    .value {
      font-weight: 600;
      color: #0F172A;
      text-align: right;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 16px;
    }
    .button {
      background-color: #0284C7;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      display: inline-block;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #F1F5F9;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="company">${env.COMPANY_NAME}</div>
    <div class="title">A visitor has arrived to meet you</div>
    <div class="text">
      Hello ${hostName},<br><br>
      A visitor has arrived to meet you. Please open the dashboard to review and accept the request.
    </div>

    <div class="details">
      <div class="row">
        <span class="label">Visitor Name</span>
        <span class="value">${visitorName}</span>
      </div>
      <div class="row">
        <span class="label">Mobile Number</span>
        <span class="value" style="font-family: monospace;">${maskedPhone}</span>
      </div>
      ${purpose ? `
      <div class="row">
        <span class="label">Purpose</span>
        <span class="value">${purpose}</span>
      </div>
      ` : ""}
      <div class="row">
        <span class="label">Arrival Time</span>
        <span class="value">${arrivalTime}</span>
      </div>
    </div>

    <div class="btn-container">
      <a href="${dashboardUrl}" class="button" target="_blank" rel="noopener noreferrer">Open dashboard</a>
    </div>

    <div class="footer">
      ${env.COMPANY_NAME} Gate Access Verification
    </div>
  </div>
</body>
</html>`;

  const text = `${env.COMPANY_NAME} - Visitor Verification
==================================================

A visitor has arrived to meet you

Hello ${hostName},

A visitor has arrived to meet you. Please open the dashboard to review and accept the request.

Visitor Details:
- Visitor Name: ${visitorName}
- Mobile Number: ${maskedPhone}
${purpose ? `- Purpose: ${purpose}\n` : ""}- Arrival Time: ${arrivalTime}

Open dashboard:
${dashboardUrl}
`;

  // 1. Always capture into EmailOutbox (powers /demo/email-inbox on Vercel & local fallback)
  try {
    await db.emailOutbox.create({
      data: {
        toEmail: hostEmail,
        toName: hostName,
        subject,
        htmlBody: html,
        textBody: text,
        requestId,
      },
    });
  } catch (err) {
    console.error("Failed to persist EmailOutbox entry:", err);
  }

  // 2. Skip localhost SMTP attempt on Vercel cloud when no external SMTP host is configured
  const isVercelWithoutExternalSmtp =
    process.env.VERCEL === "1" && (env.SMTP_HOST === "localhost" || env.SMTP_HOST === "127.0.0.1");

  if (isVercelWithoutExternalSmtp) {
    console.log(`[CLOUD DEMO EMAIL] Recorded notification for ${hostEmail} (view at /demo/email-inbox).`);
    return true;
  }

  // 3. Dispatch through Nodemailer (Mailpit locally or configured company SMTP)
  try {
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: hostEmail,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send host approval email:", error);
    return false;
  }
}
