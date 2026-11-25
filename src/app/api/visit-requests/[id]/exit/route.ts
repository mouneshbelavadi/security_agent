import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const visit = await db.visitRequest.findUnique({
      where: { id: params.id },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found." }, { status: 404 });
    }

    if (visit.status !== "ENTERED") {
      return NextResponse.json(
        { error: "Cannot mark exit for visitor who has not entered." },
        { status: 400 }
      );
    }

    const exitedAt = new Date();
    await db.visitRequest.update({
      where: { id: visit.id },
      data: {
        status: "EXITED",
        exitedAt,
      },
    });

    await logAudit({
      visitRequestId: visit.id,
      visitorId: visit.visitorId,
      actorUserId: session.userId,
      actorName: session.name,
      action: "STATUS_EXITED",
      actorType: session.role === "ADMIN" ? "ADMIN" : "GUARD",
      details: `Visitor exit recorded by ${session.name} (${session.username}).`,
    });

    return NextResponse.json({
      success: true,
      status: "EXITED",
      exitedAt,
    });
  } catch (error) {
    console.error("Record exit error:", error);
    return NextResponse.json({ error: "Failed to record visitor exit." }, { status: 500 });
  }
}
