import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  callbackUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const { username, password, callbackUrl } = parsed.data;

    const user = await db.user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        employee: {
          select: { id: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    await createSession({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      employeeId: user.employee?.id,
      mustChangePassword: user.mustChangePassword,
    });

    let redirectUrl = "/guard";
    if (user.mustChangePassword) {
      redirectUrl = "/change-password";
    } else if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      redirectUrl = callbackUrl;
    } else if (user.role === "ADMIN") {
      redirectUrl = "/admin";
    } else if (user.role === "EMPLOYEE") {
      redirectUrl = "/host";
    }

    return NextResponse.json({
      success: true,
      mustChangePassword: user.mustChangePassword,
      redirectUrl,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Authentication system error. Please contact security admin." },
      { status: 500 }
    );
  }
}
