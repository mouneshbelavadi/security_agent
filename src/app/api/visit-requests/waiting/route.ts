import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isExpired } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch requests currently in active waiting states
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

    // Background expiration check for each request
    for (const req of requests) {
      if (req.status === "WAITING_HOST" && isExpired(req.expiresAt)) {
        await db.visitRequest.update({
          where: { id: req.id },
          data: { status: "EXPIRED" },
        });
        await logAudit({
          visitRequestId: req.id,
          action: "STATUS_EXPIRED_HOST_TIMEOUT",
          actorType: "SYSTEM",
          details: "Approval window timed out.",
        });
      } else if (req.status === "APPROVED" && isExpired(req.otpExpiresAt)) {
        await db.visitRequest.update({
          where: { id: req.id },
          data: { status: "EXPIRED" },
        });
        await logAudit({
          visitRequestId: req.id,
          action: "STATUS_EXPIRED_OTP_TIMEOUT",
          actorType: "SYSTEM",
          details: "OTP validity window expired.",
        });
      } else {
        activeList.push({
          id: req.id,
          visitorName: req.visitorName,
          visitorPhone: req.visitorPhone,
          purpose: req.purpose,
          status: req.status,
          hostName: req.host.name,
          hostDepartment: req.host.department,
          createdAt: req.createdAt,
          expiresAt: req.status === "WAITING_HOST" ? req.expiresAt : req.otpExpiresAt,
        });
      }
    }

    return NextResponse.json({ requests: activeList });
  } catch (error) {
    console.error("Fetch waiting requests error:", error);
    return NextResponse.json({ error: "Failed to fetch waiting requests" }, { status: 500 });
  }
}
