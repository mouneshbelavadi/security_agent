import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { env } from "./env";
import { db } from "./db";

function createMailer() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export const mailer = createMailer();

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

export interface VisitorOtpEmailParams {
  visitorEmail: string;
  visitorName: string;
  hostName: string;
  hostDepartment: string;
  otp: string;
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

function getLogoAttachment():
  | { attachments: Array<{ filename: string; path: string; cid: string }>; logoImgTag: string }
  | { attachments: undefined; logoImgTag: string } {
  try {
    const logoPath = path.resolve(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      return {
        attachments: [
          {
            filename: "logo.png",
            path: logoPath,
            cid: "vstechsol-logo",
          },
        ],
        logoImgTag: `<img src="cid:vstechsol-logo" alt="${env.COMPANY_NAME} Logo" width="44" height="44" style="display: block; object-fit: contain;" />`,
      };
    }
  } catch {
    // Fallback cleanly if filesystem read isn't available
  }
  return {
    attachments: undefined,
    logoImgTag: "",
  };
}

/**
 * Send employee notification email when a visitor arrives at the gate.
 * Sends via configured SMTP (Gmail SMTP) and records host notifications in EmailOutbox for fallback preview.
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
  const { attachments, logoImgTag } = getLogoAttachment();

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
      padding: 6px 0;
      border-bottom: 1px solid #EDF2F7;
      font-size: 14px;
    }
    .row:last-child {
      border-bottom: none;
    }
    .label {
      color: #64748B;
      display: inline-block;
      min-width: 130px;
    }
    .value {
      font-weight: 600;
      color: #0F172A;
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
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
      <tr>
        ${logoImgTag ? `<td style="padding-right: 12px; vertical-align: middle;">${logoImgTag}</td>` : ""}
        <td style="vertical-align: middle;"><div class="company">${env.COMPANY_NAME}</div></td>
      </tr>
    </table>
    <div class="title">A visitor has arrived to meet you</div>
    <div class="text">
      Hello ${hostName},<br><br>
      A visitor has arrived to meet you. Please open the dashboard to review and accept the request.
    </div>

    <div class="details">
      <div class="row">
        <span class="label">Visitor Name:</span>
        <span class="value">${visitorName}</span>
      </div>
      <div class="row">
        <span class="label">Mobile Number:</span>
        <span class="value" style="font-family: monospace;">${maskedPhone}</span>
      </div>
      ${
        purpose
          ? `
      <div class="row">
        <span class="label">Purpose:</span>
        <span class="value">${purpose}</span>
      </div>
      `
          : ""
      }
      <div class="row">
        <span class="label">Arrival Time:</span>
        <span class="value">${arrivalTime}</span>
      </div>
    </div>

    <div class="btn-container">
      <a href="${dashboardUrl}" class="button" target="_blank" rel="noopener noreferrer">Open dashboard</a>
    </div>

    <div class="footer">
      ${env.COMPANY_NAME} Internal Gate Access Verification
    </div>
  </div>
</body>
</html>`;

  const text = `${env.COMPANY_NAME} - Internal Visitor Verification
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

  // Capture host arrival notification in EmailOutbox (helpful for seeded @example.com demo hosts)
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

  try {
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: hostEmail,
      subject,
      text,
      html,
      attachments,
    });
    return true;
  } catch (error) {
    console.error("Failed to send host approval email:", error);
    return false;
  }
}

/**
 * Sends the 6-digit OTP gate entry code directly to the visitor's email via Gmail SMTP.
 */
export async function sendVisitorOtpEmail(params: VisitorOtpEmailParams): Promise<boolean> {
  const {
    visitorEmail,
    visitorName,
    hostName,
    hostDepartment,
    otp,
    expiryMinutes = env.OTP_EXPIRY_MINUTES,
  } = params;

  const subject = `Your ${env.COMPANY_NAME} Gate Pass Verification Code`;
  const { attachments, logoImgTag } = getLogoAttachment();

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
      max-width: 520px;
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
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 12px;
    }
    .text {
      font-size: 15px;
      color: #334155;
      margin-bottom: 20px;
    }
    .otp-box {
      background-color: #F0FDF4;
      border: 2px solid #15803D;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #14532D;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #0F172A;
    }
    .expiry {
      font-size: 13px;
      color: #475569;
      text-align: center;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #F1F5F9;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
      <tr>
        ${logoImgTag ? `<td style="padding-right: 12px; vertical-align: middle;">${logoImgTag}</td>` : ""}
        <td style="vertical-align: middle;"><div class="company">${env.COMPANY_NAME}</div></td>
      </tr>
    </table>
    <div class="title">Visit Approved</div>
    <div class="text">
      Hello ${visitorName},<br><br>
      Your request to visit <strong>${hostName}</strong> (${hostDepartment}) at <strong>${env.COMPANY_NAME}</strong> has been approved.
    </div>

    <div class="otp-box">
      <div class="otp-label">Your Gate Pass Verification Code</div>
      <div class="otp-code">${otp}</div>
    </div>

    <div class="expiry">
      Please share this 6-digit code with the security guard at the gate.<br>
      This code is valid for <strong>${expiryMinutes} minutes</strong>.
    </div>

    <div class="footer">
      ${env.COMPANY_NAME} Internal Gate Access Verification
    </div>
  </div>
</body>
</html>`;

  const text = `${env.COMPANY_NAME} - Gate Pass Verification Code
==================================================

Hello ${visitorName},

Your request to visit ${hostName} (${hostDepartment}) at ${env.COMPANY_NAME} has been approved.

Your 6-digit Gate Pass OTP Code: ${otp}

Please share this code with the security guard at the gate.
This code is valid for ${expiryMinutes} minutes.
`;

  try {
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to: visitorEmail,
      subject,
      text,
      html,
      attachments,
    });
    return true;
  } catch (error) {
    console.error("Failed to send visitor OTP email:", error);
    return false;
  }
}
