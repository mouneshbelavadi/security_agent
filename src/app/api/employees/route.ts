import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";

const DEFAULT_DEMO_PASSWORD = "GatePass2026!";

const employeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Valid email required"),
  department: z.string().trim().min(2, "Department is required"),
  isActive: z.boolean().default(true),
});

// GET: List employees (active only for guards, all for admin)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const where = all && session.role === "ADMIN" ? {} : { isActive: true };

    const employees = await db.employee.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Fetch employees error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve employee directory" },
      { status: 500 }
    );
  }
}

// POST: Add new employee & create employee login account (Admin only)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const emailLower = parsed.data.email.toLowerCase();

    const existing = await db.employee.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 400 }
      );
    }

    // 1. Create or link User login account for employee
    const passwordHash = await bcrypt.hash(DEFAULT_DEMO_PASSWORD, 10);
    const user = await db.user.upsert({
      where: { username: emailLower },
      update: {
        name: parsed.data.name,
        role: "EMPLOYEE",
        isActive: parsed.data.isActive,
      },
      create: {
        name: parsed.data.name,
        username: emailLower,
        role: "EMPLOYEE",
        passwordHash,
        mustChangePassword: false,
        isActive: parsed.data.isActive,
      },
    });

    // 2. Create Employee record linked to user
    const employee = await db.employee.create({
      data: {
        name: parsed.data.name,
        email: emailLower,
        department: parsed.data.department,
        isActive: parsed.data.isActive,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      employee,
      loginCreated: {
        username: user.username,
        role: user.role,
        defaultPassword: DEFAULT_DEMO_PASSWORD,
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
