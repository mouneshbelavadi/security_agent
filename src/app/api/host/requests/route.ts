import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { isExpired } from "@/lib/crypto";
import { maskPhoneNumber } from "@/lib/email";

// GET /api/host/requests
// Returns pending and recent decisions strictly for the logged-in employee
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await getAuthenticatedEmployee(session.userId);
    if (!employee) {
      return NextResponse.json(
        {
          error: `You are currently signed in as ${session.name} (${session.role}). Please sign in with an Employee Host account.`,
          code: "NOT_AN_EMPLOYEE",
          currentUser: session.name,
          currentRole: session.role,
        },
        { status: 403 }
      );
    }

    // 1. Fetch pending requests
    const pendingRaw = await db.visitRequest.findMany({
      where: {
        hostId: employee.id,
        status: "WAITING_HOST",
      },
      orderBy: { createdAt: "desc" },
    });

    // Check expiration on any pending requests
    const pending = [];
    for (const req of pendingRaw) {
      if (req.expiresAt && isExpired(req.expiresAt)) {
        await db.visitRequest.update({
          where: { id: req.id },
          data: { status: "EXPIRED" },
        });
      } else {
        pending.push({
          id: req.id,
          visitorName: req.visitorName,
          visitorPhoneMasked: maskPhoneNumber(req.visitorPhone),
          purpose: req.purpose,
          selfiePath: req.selfiePath,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
          expiresAt: req.expiresAt?.toISOString() || null,
        });
      }
    }

    // 2. Fetch recent decisions (decided requests)
    const recentRaw = await db.visitRequest.findMany({
      where: {
        hostId: employee.id,
        status: { not: "WAITING_HOST" },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const recent = recentRaw.map((req) => ({
      id: req.id,
      visitorName: req.visitorName,
      visitorPhoneMasked: maskPhoneNumber(req.visitorPhone),
      purpose: req.purpose,
      selfiePath: req.selfiePath,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
      approvedAt: req.approvedAt?.toISOString() || null,
      enteredAt: req.enteredAt?.toISOString() || null,
      exitedAt: req.exitedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
      },
      pending,
      recent,
    });
  } catch (error) {
    console.error("Host requests GET error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
