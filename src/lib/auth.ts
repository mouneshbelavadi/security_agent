import { cookies } from "next/headers";
import crypto from "crypto";
import { env } from "./env";
import { db } from "./db";

export interface SessionPayload {
  userId: string;
  name: string;
  username: string;
  role: "GUARD" | "EMPLOYEE" | "ADMIN";
  employeeId?: string;
  mustChangePassword: boolean;
  expiresAt: number;
}

const COOKIE_NAME = "vv_session";
const SESSION_DURATION_HOURS = 12;

/**
 * Sign payload using HMAC-SHA256
 */
function signPayload(payloadString: string): string {
  const signature = crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(payloadString)
    .digest("base64url");
  return `${Buffer.from(payloadString).toString("base64url")}.${signature}`;
}

/**
 * Verify and decode HMAC-signed session string
 */
function verifySessionString(sessionString: string): SessionPayload | null {
  try {
    const parts = sessionString.split(".");
    if (parts.length !== 2) return null;

    const [dataB64, signature] = parts;
    const dataString = Buffer.from(dataB64, "base64url").toString("utf-8");
    const expectedSig = crypto
      .createHmac("sha256", env.SESSION_SECRET)
      .update(dataString)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(dataString) as SessionPayload;
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create session cookie
 */
export async function createSession(user: {
  id: string;
  name: string;
  username: string;
  role: string;
  employeeId?: string;
  mustChangePassword: boolean;
}): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
  let normalizedRole: "GUARD" | "EMPLOYEE" | "ADMIN" = "GUARD";
  if (user.role === "ADMIN") normalizedRole = "ADMIN";
  else if (user.role === "EMPLOYEE") normalizedRole = "EMPLOYEE";

  const payload: SessionPayload = {
    userId: user.id,
    name: user.name,
    username: user.username,
    role: normalizedRole,
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword,
    expiresAt,
  };

  const token = signPayload(JSON.stringify(payload));
  const cookieStore = cookies();

  const isSecureCookie =
    process.env.VERCEL === "1" || env.APP_BASE_URL.startsWith("https://");

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
  });
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    return verifySessionString(sessionCookie.value);
  } catch {
    return null;
  }
}

/**
 * Clear session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  const isSecureCookie =
    process.env.VERCEL === "1" || env.APP_BASE_URL.startsWith("https://");

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Resolve the authenticated employee record for a given user ID
 */
export async function getAuthenticatedEmployee(userId: string) {
  let employee = await db.employee.findUnique({
    where: { userId },
  });
  if (!employee) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      employee = await db.employee.findUnique({
        where: { email: user.username },
      });
    }
  }
  return employee;
}
