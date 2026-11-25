import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { maskPhoneNumber } from "@/lib/email";
import { checkAndExpireVisit } from "@/lib/visit-lifecycle";

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

    const pendingRaw = await db.visitRequest.findMany({
      where: {
        hostId: employee.id,
        status: "WAITING_HOST",
      },
      orderBy: { createdAt: "desc" },
    });

    const pending = [];
    for (const req of pendingRaw) {
      const updatedStatus = await checkAndExpireVisit({
        id: req.id,
        visitorId: req.visitorId,
        status: req.status,
        expiresAt: req.expiresAt,
        otpExpiresAt: req.otpExpiresAt,
      });

      if (updatedStatus === "WAITING_HOST") {
        pending.push({
          id: req.id,
          visitNumber: req.visitNumber,
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

    const recentRaw = await db.visitRequest.findMany({
      where: {
        hostId: employee.id,
        status: { not: "WAITING_HOST" },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const recent = recentRaw.map((req) => ({
      id: req.id,
      visitNumber: req.visitNumber,
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
