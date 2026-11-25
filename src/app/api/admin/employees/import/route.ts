import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const importEmployeeItemSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Valid email required"),
  department: z.string().trim().min(2, "Department is required"),
});

const bulkImportSchema = z.object({
  employees: z.array(importEmployeeItemSchema).min(1, "At least one employee is required"),
});

// POST: Bulk import validated employees
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid payload format" },
        { status: 400 }
      );
    }

    const incoming = parsed.data.employees;

    // Fetch existing emails to prevent conflicts
    const existingEmails = new Set(
      (
        await db.employee.findMany({
          select: { email: true },
        })
      ).map((e) => e.email.toLowerCase())
    );

    const validToInsert: { name: string; email: string; department: string; isActive: boolean }[] = [];
    const skippedEmails: string[] = [];

    for (const item of incoming) {
      const normalizedEmail = item.email.toLowerCase();
      if (existingEmails.has(normalizedEmail)) {
        skippedEmails.push(normalizedEmail);
      } else {
        existingEmails.add(normalizedEmail);
        validToInsert.push({
          name: item.name,
          email: normalizedEmail,
          department: item.department,
          isActive: true,
        });
      }
    }

    if (validToInsert.length === 0) {
      return NextResponse.json(
        {
          error: "All provided employee emails already exist in the directory.",
          skippedCount: skippedEmails.length,
        },
        { status: 400 }
      );
    }

    // Insert employees
    const created = await db.$transaction(
      validToInsert.map((data) => db.employee.create({ data }))
    );

    await logAudit({
      actorUserId: session.userId,
      actorName: session.name,
      action: "EMPLOYEES_BULK_IMPORTED",
      actorType: "ADMIN",
      details: `Admin ${session.name} imported ${created.length} employee(s) (${skippedEmails.length} skipped).`,
    });

    return NextResponse.json({
      success: true,
      importedCount: created.length,
      skippedCount: skippedEmails.length,
      employees: created,
    });
  } catch (error) {
    console.error("Bulk employee import error:", error);
    return NextResponse.json({ error: "Failed to process bulk import" }, { status: 500 });
  }
}
