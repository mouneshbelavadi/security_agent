import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createGuardSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  username: z.string().trim().toLowerCase().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// GET: List all guard users
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const guards = await db.user.findMany({
      where: { role: "GUARD" },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ guards });
  } catch (error) {
    console.error("List guards error:", error);
    return NextResponse.json({ error: "Failed to list guard accounts" }, { status: 500 });
  }
}

// POST: Create new guard user
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createGuardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, username, password } = parsed.data;

    const existing = await db.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const guard = await db.user.create({
      data: {
        name,
        username,
        passwordHash,
        role: "GUARD",
        isActive: true,
        mustChangePassword: true, // Forces password change on first login
      },
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
      targetUserId: guard.id,
      action: "GUARD_CREATED",
      actorType: "ADMIN",
      details: `Admin ${session.name} created guard account "${guard.name}" (${guard.username}).`,
    });

    return NextResponse.json({ success: true, guard });
  } catch (error) {
    console.error("Create guard error:", error);
    return NextResponse.json({ error: "Failed to create guard account" }, { status: 500 });
  }
}
