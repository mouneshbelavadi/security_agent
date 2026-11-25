import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndExpireVisit } from "@/lib/visit-lifecycle";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await db.visitRequest.findMany({
      where: {
        status: { in: ["WAITING_HOST", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        host: {
          select: { name: true, department: true },
        },
      },
    });

    const activeList = [];

    for (const req of requests) {
      const updatedStatus = await checkAndExpireVisit({
        id: req.id,
        visitorId: req.visitorId,
        status: req.status,
        expiresAt: req.expiresAt,
        otpExpiresAt: req.otpExpiresAt,
      });

      if (updatedStatus !== "EXPIRED") {
        activeList.push({
          id: req.id,
          visitorId: req.visitorId,
          visitNumber: req.visitNumber,
          visitorName: req.visitorName,
          visitorPhone: req.visitorPhone,
          purpose: req.purpose,
          status: updatedStatus,
          hostName: req.host.name,
          hostDepartment: req.host.department,
          createdAt: req.createdAt,
          expiresAt: updatedStatus === "WAITING_HOST" ? req.expiresAt : req.otpExpiresAt,
        });
      }
    }

    return NextResponse.json({ requests: activeList });
  } catch (error) {
    console.error("Fetch waiting requests error:", error);
    return NextResponse.json({ error: "Failed to fetch waiting requests" }, { status: 500 });
  }
}
