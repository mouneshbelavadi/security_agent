import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { z } from "zod";

const resetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid password" },
        { status: 400 }
      );
    }

    const { newPassword } = parsed.data;
    const passwordHash = await hashPassword(newPassword);

    await db.user.update({
      where: { id: params.id },
      data: {
        passwordHash,
        mustChangePassword: true, // Force change on next login
      },
    });

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset guard password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
