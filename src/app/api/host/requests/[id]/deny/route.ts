import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

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
      include: { host: true },
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

    if (visit.status !== "WAITING_HOST") {
      return NextResponse.json(
        { error: `Request cannot be denied (current status: ${visit.status}).` },
        { status: 400 }
      );
    }

    // 1. Update VisitRequest status to DENIED
    await db.visitRequest.update({
      where: { id: visit.id },
      data: {
        status: "DENIED",
      },
    });

    // 2. Log audit trail
    await logAudit({
      visitRequestId: visit.id,
      action: "STATUS_DENIED_BY_EMPLOYEE",
      actorType: "EMPLOYEE",
      details: `Host employee ${employee.name} (${employee.email}) denied visitor entry.`,
    });

    return NextResponse.json({
      success: true,
      status: "DENIED",
      message: "Visitor request denied.",
    });
  } catch (error) {
    console.error("Host deny error:", error);
    return NextResponse.json({ error: "Failed to process denial" }, { status: 500 });
  }
}
