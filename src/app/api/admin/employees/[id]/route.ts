import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  department: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid data" }, { status: 400 });
    }

    const { email } = parsed.data;
    if (email) {
      const existing = await db.employee.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id: params.id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "An employee with this email already exists" }, { status: 400 });
      }
    }

    const dataToUpdate: any = { ...parsed.data };
    if (email) {
      dataToUpdate.email = email.toLowerCase();
    }

    const updated = await db.employee.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error) {
    console.error("Update employee error:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}
