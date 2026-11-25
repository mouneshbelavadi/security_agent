import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { logAudit, roleToActorType } from "@/lib/audit";
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
      include: {
        employee: {
          select: { id: true },
        },
      },
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

    await createSession({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      employeeId: user.employee?.id,
      mustChangePassword: false,
    });

    await logAudit({
      actorUserId: user.id,
      actorName: user.name,
      targetUserId: user.id,
      action: "PASSWORD_CHANGED",
      actorType: roleToActorType(user.role),
      details: `${user.name} (${user.username}) updated their account password.`,
    });

    let redirectUrl = "/guard";
    if (user.role === "ADMIN") redirectUrl = "/admin";
    else if (user.role === "EMPLOYEE") redirectUrl = "/host";

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
