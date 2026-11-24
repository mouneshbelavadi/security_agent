import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true, redirectUrl: "/login" });
}

export async function GET(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
