import crypto from "crypto";
import bcrypt from "bcrypt";
import { env } from "./env";

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random token (hex format).
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Hash a token using SHA-256 for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a 6-digit numerical OTP.
 */
export function generateOtp(): string {
  // Generates integer between 100000 and 999999 inclusive
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP using SHA-256 with session secret as HMAC key for speed and tamper protection.
 */
export function hashOtp(otp: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(otp)
    .digest("hex");
}

/**
 * Check if a given OTP matches the stored hash in constant time.
 */
export function verifyOtp(otp: string, storedHash: string): boolean {
  const computed = hashOtp(otp);
  if (computed.length !== storedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

/**
 * Check if a date has passed.
 */
export function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
}

/**
 * Calculate expiration Date based on minutes from now.
 */
export function getExpiryDate(minutesFromNow: number): Date {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
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
 * Validate Indian 10-digit mobile phone number.
 * Valid Indian mobile numbers start with 6, 7, 8, or 9 followed by 9 digits.
 */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\+]/g, "");
  // Handle optional 91 or +91 prefix
  const nationalNumber = cleaned.startsWith("91") && cleaned.length === 12 ? cleaned.slice(2) : cleaned;
  return /^[6-9]\d{9}$/.test(nationalNumber);
}

/**
 * Normalize Indian phone number to 10-digit format.
 */
export function normalizeIndianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\+]/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  return cleaned;
}
