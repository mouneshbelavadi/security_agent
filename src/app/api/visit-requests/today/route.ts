import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isExpired } from "@/lib/crypto";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Start of current day (local server time)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const visits = await db.visitRequest.findMany({
      where: {
        createdAt: { gte: startOfDay },
      },
      orderBy: { createdAt: "desc" },
      include: {
        host: {
          select: { name: true, department: true },
        },
      },
    });

    // Check expiration on pending items
    const formatted = [];
    for (const v of visits) {
      let currentStatus = v.status;
      if (currentStatus === "WAITING_HOST" && isExpired(v.expiresAt)) {
        currentStatus = "EXPIRED";
        await db.visitRequest.update({ where: { id: v.id }, data: { status: "EXPIRED" } });
      } else if (currentStatus === "APPROVED" && isExpired(v.otpExpiresAt)) {
        currentStatus = "EXPIRED";
        await db.visitRequest.update({ where: { id: v.id }, data: { status: "EXPIRED" } });
      }

      formatted.push({
        id: v.id,
        visitorName: v.visitorName,
        visitorPhone: v.visitorPhone,
        purpose: v.purpose,
        status: currentStatus,
        hostName: v.host.name,
        hostDepartment: v.host.department,
        createdAt: v.createdAt,
        approvedAt: v.approvedAt,
        enteredAt: v.enteredAt,
        exitedAt: v.exitedAt,
      });
    }

    return NextResponse.json({ visitors: formatted });
  } catch (error) {
    console.error("Fetch today's visitors error:", error);
    return NextResponse.json({ error: "Failed to fetch today's visitors" }, { status: 500 });
  }
}
