import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { isExpired } from "@/lib/crypto";
import { maskPhoneNumber } from "@/lib/email";

// GET /api/host/requests/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const visit = await db.visitRequest.findUnique({
      where: { id: params.id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found." }, { status: 404 });
    }

    // STRICT AUTHORIZATION CHECK: Employee can only see their own requests!
    if (visit.hostId !== employee.id && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied: You are not authorized to view another employee's visit request." },
        { status: 403 }
      );
    }

    let status = visit.status;
    if (status === "WAITING_HOST" && visit.expiresAt && isExpired(visit.expiresAt)) {
      status = "EXPIRED";
      await db.visitRequest.update({
        where: { id: visit.id },
        data: { status: "EXPIRED" },
      });
    }

    // Never return idPhotoPath or idType
    return NextResponse.json({
      id: visit.id,
      visitorName: visit.visitorName,
      visitorPhoneMasked: maskPhoneNumber(visit.visitorPhone),
      purpose: visit.purpose,
      selfiePath: visit.selfiePath,
      status,
      createdAt: visit.createdAt.toISOString(),
      expiresAt: visit.expiresAt?.toISOString() || null,
      approvedAt: visit.approvedAt?.toISOString() || null,
      hostName: visit.host.name,
      hostDepartment: visit.host.department,
    });
  } catch (error) {
    console.error("Host request detail GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
