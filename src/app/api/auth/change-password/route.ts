import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Update active session cookie
    await createSession({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      mustChangePassword: false,
    });

    const redirectUrl = user.role === "ADMIN" ? "/admin" : "/guard";

    return NextResponse.json({
      success: true,
      redirectUrl,
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Unable to update password. Please try again." },
      { status: 500 }
    );
  }
}
