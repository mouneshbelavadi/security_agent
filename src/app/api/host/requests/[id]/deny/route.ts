import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeHostDecision } from "@/lib/host-decision";

// POST /api/host/requests/[id]/deny
export async function POST(
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
        { error: "No employee profile linked to your account." },
        { status: 403 }
      );
    }

    const visit = await db.visitRequest.findUnique({
      where: { id: params.id },
      select: { id: true, hostId: true },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found." }, { status: 404 });
    }

    // STRICT PERMISSION CHECK: Employee can only deny their own request!
    if (visit.hostId !== employee.id && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied: You cannot deny a request addressed to another employee." },
        { status: 403 }
      );
    }

    const result = await executeHostDecision({
      visitId: visit.id,
      decision: "DENY",
      actorUserId: session.userId,
      actorName: employee.name,
      actorEmail: employee.email,
      source: "WEB",
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: result.httpStatus }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message,
    });
  } catch (error) {
    console.error("Host deny error:", error);
    return NextResponse.json({ error: "Failed to process denial" }, { status: 500 });
  }
}
