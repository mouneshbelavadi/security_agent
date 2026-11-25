import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndExpireVisit, getIstDayBounds } from "@/lib/visit-lifecycle";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { start, end } = getIstDayBounds();

    const visits = await db.visitRequest.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
      include: {
        host: {
          select: { name: true, department: true },
        },
        visitor: {
          select: { visitCount: true },
        },
      },
    });

    const formatted = [];
    for (const v of visits) {
      const currentStatus = await checkAndExpireVisit({
        id: v.id,
        visitorId: v.visitorId,
        status: v.status,
        expiresAt: v.expiresAt,
        otpExpiresAt: v.otpExpiresAt,
      });

      formatted.push({
        id: v.id,
        visitorId: v.visitorId,
        visitNumber: v.visitNumber,
        visitorTotalVisits: v.visitor?.visitCount || v.visitNumber,
        visitorName: v.visitorName,
        visitorEmail: v.visitorEmail,
        visitorPhone: v.visitorPhone,
        idType: v.idType,
        hasIdPhoto: Boolean(v.idPhotoPath),
        hasIdNumber: Boolean(v.idNumber),
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
