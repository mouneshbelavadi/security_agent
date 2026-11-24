import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Retrieve visitor logs with search, status, and date filters, plus real-time summary statistics
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dateStr = searchParams.get("date"); // Optional "YYYY-MM-DD"
    const search = searchParams.get("search")?.trim();

    // 1. Calculate Summary Strip Metrics (Computed from real database data)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [visitorsToday, currentlyWaiting, enteredToday, deniedToday] = await Promise.all([
      // Total visitors created today
      db.visitRequest.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      // Currently waiting for host approval
      db.visitRequest.count({
        where: {
          status: "WAITING_HOST",
        },
      }),
      // Permitted entry today (entered or exited)
      db.visitRequest.count({
        where: {
          status: { in: ["ENTERED", "EXITED"] },
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      // Denied today
      db.visitRequest.count({
        where: {
          status: "DENIED",
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
    ]);

    // 2. Build Filter Conditions for Log Query
    const where: any = {};

    // Status filter
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Date filter
    if (dateStr && dateStr !== "ALL") {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const filterStart = new Date(year, month, day, 0, 0, 0, 0);
        const filterEnd = new Date(year, month, day, 23, 59, 59, 999);

        where.createdAt = {
          gte: filterStart,
          lte: filterEnd,
        };
      }
    }

    // Search filter (name or phone)
    if (search) {
      where.OR = [
        { visitorName: { contains: search, mode: "insensitive" } },
        { visitorPhone: { contains: search } },
      ];
    }

    // 3. Fetch Log Records
    const logs = await db.visitRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        host: {
          select: { name: true, department: true, email: true },
        },
        createdByUser: {
          select: { name: true, username: true },
        },
        auditLogs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      visitorName: log.visitorName,
      visitorEmail: log.visitorEmail,
      visitorPhone: log.visitorPhone,
      idType: log.idType,
      purpose: log.purpose,
      status: log.status,
      hostName: log.host.name,
      hostDepartment: log.host.department,
      hostEmail: log.host.email,
      guardName: log.createdByUser.name,
      guardUsername: log.createdByUser.username,
      idPhotoPath: log.idPhotoPath,
      selfiePath: log.selfiePath,
      createdAt: log.createdAt.toISOString(),
      approvedAt: log.approvedAt ? log.approvedAt.toISOString() : null,
      enteredAt: log.enteredAt ? log.enteredAt.toISOString() : null,
      exitedAt: log.exitedAt ? log.exitedAt.toISOString() : null,
      auditLogs: log.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      summary: {
        visitorsToday,
        currentlyWaiting,
        enteredToday,
        deniedToday,
      },
      logs: formatted,
    });
  } catch (error) {
    console.error("Admin logs fetch error:", error);
    return NextResponse.json({ error: "Failed to retrieve logs" }, { status: 500 });
  }
}
