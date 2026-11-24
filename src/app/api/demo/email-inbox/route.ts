import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/demo/email-inbox
// Public endpoint for cloud/Vercel demo preview: returns latest 10 simulated host emails
export async function GET() {
  try {
    const emails = await db.emailOutbox.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      emails: emails.map((e) => ({
        id: e.id,
        toEmail: e.toEmail,
        toName: e.toName,
        subject: e.subject,
        textBody: e.textBody,
        requestId: e.requestId,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Email inbox fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch email inbox" }, { status: 500 });
  }
}
