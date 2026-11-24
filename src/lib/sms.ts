import { db } from "./db";
import { env } from "./env";

/**
 * Small wrapper for dispatching outbound SMS messages.
 * For the demo, this prints the message to the server console and persists
 * it in the SmsOutbox database table. A real SMS gateway (e.g. Twilio, MSG91)
 * can easily replace this implementation.
 */
export async function sendSms(mobile: string, message: string): Promise<boolean> {
  // 1. Print message to server console
  console.log("--------------------------------------------------");
  console.log("[SMS OUTBOX DISPATCH]");
  console.log(`  Recipient: ${mobile}`);
  console.log(`  Message:   ${message}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log("--------------------------------------------------");

  // 2. Persist to SmsOutbox table
  try {
    await db.smsOutbox.create({
      data: {
        mobile,
        message,
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to write SMS to SmsOutbox:", error);
    return false;
  }
}

/**
 * Generates the standardized visitor OTP message and dispatches it via sendSms.
 * Message format: "Your visitor code for [COMPANY_NAME] is [OTP]. Valid for 5 minutes."
 */
export async function sendVisitorOtp(mobile: string, otp: string): Promise<boolean> {
  const message = `Your visitor code for ${env.COMPANY_NAME} is ${otp}. Valid for 5 minutes.`;
  return sendSms(mobile, message);
}
