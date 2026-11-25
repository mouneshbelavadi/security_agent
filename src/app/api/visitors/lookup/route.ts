import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { backfillUnlinkedVisitors } from "@/lib/visit-lifecycle";

// GET /api/visitors/lookup?q=...
// Looks up returning visitors by mobile number, email, name, or ID number for faster guard intake.
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    if (q.length < 2) {
      return NextResponse.json({ visitors: [] });
    }

    const anyUnlinked = await db.visitRequest.findFirst({
      where: { visitorId: null },
      select: { id: true },
    });
    if (anyUnlinked) {
      await backfillUnlinkedVisitors();
    }

    const digitsOnly = q.replace(/\D/g, "");
    const orFilters: any[] = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { lastIdNumber: { contains: q, mode: "insensitive" } },
    ];
    if (digitsOnly.length >= 3) {
      orFilters.push({ phone: { contains: digitsOnly } });
    }

    const visitors = await db.visitor.findMany({
      where: { OR: orFilters },
      orderBy: { lastVisitAt: "desc" },
      take: 6,
      include: {
        visitRequests: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            host: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const formatted = visitors.map((v) => {
      const latestVisit = v.visitRequests[0] || null;
      return {
        id: v.id,
        name: v.name,
        email: v.email || latestVisit?.visitorEmail || "",
        phone: v.phone,
        visitCount: v.visitCount,
        firstVisitAt: v.firstVisitAt.toISOString(),
        lastVisitAt: v.lastVisitAt.toISOString(),
        lastIdType: v.lastIdType || latestVisit?.idType || "AADHAAR",
        lastIdNumber: v.lastIdNumber || null,
        lastIdPhotoPath: v.lastIdPhotoPath || null,
        lastSelfiePath: v.lastSelfiePath || null,
        lastPurpose: latestVisit?.purpose || null,
        lastStatus: latestVisit?.status || null,
        lastHost: latestVisit?.host || null,
        recentVisits: v.visitRequests.map((r) => ({
          id: r.id,
          visitNumber: r.visitNumber,
          status: r.status,
          purpose: r.purpose,
          hostName: r.host.name,
          hostDepartment: r.host.department,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({ visitors: formatted });
  } catch (error) {
    console.error("Visitor lookup error:", error);
    return NextResponse.json({ error: "Failed to lookup visitors" }, { status: 500 });
  }
}
