import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/demo/sms-inbox
// Public endpoint for demo simulation: returns latest 10 SMS messages
export async function GET() {
  try {
    const messages = await db.smsOutbox.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        mobile: m.mobile,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("SMS Inbox fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch SMS inbox" }, { status: 500 });
  }
}
