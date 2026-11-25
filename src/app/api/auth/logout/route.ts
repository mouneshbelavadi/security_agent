import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { logAudit, roleToActorType } from "@/lib/audit";

async function recordLogoutAudit() {
  const session = await getSession();
  if (session) {
    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      targetUserId: session.userId,
      action: "USER_LOGOUT",
      actorType: roleToActorType(session.role),
      details: `${session.name} (${session.username}) signed out.`,
    });
  }
}

export async function POST() {
  await recordLogoutAudit();
  await clearSession();
  return NextResponse.json({ success: true, redirectUrl: "/login" });
}

export async function GET(request: Request) {
  await recordLogoutAudit();
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
