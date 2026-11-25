import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateGuardSchema = z.object({
  name: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/admin/guards/[id] - Admin activates, deactivates, or edits guard profile
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser || targetUser.role !== "GUARD") {
      return NextResponse.json({ error: "Guard account not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateGuardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      targetUserId: updated.id,
      action: "GUARD_UPDATED",
      actorType: "ADMIN",
      details: `Admin ${session.name} updated guard "${updated.name}" (${updated.username}) - Active: ${updated.isActive ? "Yes" : "No"}.`,
    });

    return NextResponse.json({ success: true, guard: updated });
  } catch (error) {
    console.error("Update guard error:", error);
    return NextResponse.json({ error: "Failed to update guard account" }, { status: 500 });
  }
}
