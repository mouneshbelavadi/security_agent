import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  backfillUnlinkedVisitors,
  expireAllStaleVisits,
  getIstDayBounds,
} from "@/lib/visit-lifecycle";

function formatAuditEntry(a: {
  id: string;
  visitRequestId: string | null;
  visitorId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  targetUserId: string | null;
  action: string;
  actorType: string;
  details: string | null;
  createdAt: Date;
  actorUser?: { id: string; name: string; username: string; role: string } | null;
  targetUser?: { id: string; name: string; username: string; role: string } | null;
}) {
  return {
    id: a.id,
    visitRequestId: a.visitRequestId,
    visitorId: a.visitorId,
    actorUserId: a.actorUserId,
    actorName: a.actorName || a.actorUser?.name || null,
    actorUsername: a.actorUser?.username || null,
    targetUserId: a.targetUserId,
    targetName: a.targetUser?.name || null,
    action: a.action,
    actorType: a.actorType,
    details: a.details,
    createdAt: a.createdAt.toISOString(),
  };
}

// GET: Retrieve visitor logs, grouped same-visitor histories, and complete activity audit trail
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    // 1. Keep records and status transitions consistent before reading
    const anyUnlinked = await db.visitRequest.findFirst({
      where: { visitorId: null },
      select: { id: true },
    });
    if (anyUnlinked) {
      await backfillUnlinkedVisitors();
    }
    await expireAllStaleVisits();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dateStr = searchParams.get("date"); // Optional "YYYY-MM-DD"
    const search = searchParams.get("search")?.trim();
    const hostId = searchParams.get("hostId")?.trim();
    const guardId = searchParams.get("guardId")?.trim();
    const visitorId = searchParams.get("visitorId")?.trim();
    const actorUserId = searchParams.get("actorUserId")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(500, Math.max(10, parseInt(searchParams.get("limit") || "100", 10) || 100));

    // 2. Real-time IST Summary Strip Metrics
    const { start: startOfToday, end: endOfToday } = getIstDayBounds();

    const [
      visitorsToday,
      currentlyWaiting,
      enteredToday,
      deniedToday,
      totalVisitsAllTime,
      uniqueVisitorsCount,
    ] = await Promise.all([
      db.visitRequest.count({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      }),
      db.visitRequest.count({
        where: { status: "WAITING_HOST" },
      }),
      db.visitRequest.count({
        where: {
          status: { in: ["ENTERED", "EXITED"] },
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      db.visitRequest.count({
        where: {
          status: "DENIED",
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      db.visitRequest.count(),
      db.visitor.count(),
    ]);

    // 3. Build VisitRequest Filter Conditions
    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (hostId && hostId !== "ALL") {
      where.hostId = hostId;
    }

    if (guardId && guardId !== "ALL") {
      where.createdByUserId = guardId;
    }

    if (visitorId && visitorId !== "ALL") {
      where.visitorId = visitorId;
    }

    if (dateStr && dateStr !== "ALL" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const { start, end } = getIstDayBounds(dateStr);
      where.createdAt = { gte: start, lte: end };
    }

    if (search) {
      where.OR = [
        { visitorName: { contains: search, mode: "insensitive" } },
        { visitorPhone: { contains: search } },
        { visitorEmail: { contains: search, mode: "insensitive" } },
        { idNumber: { contains: search, mode: "insensitive" } },
        { host: { name: { contains: search, mode: "insensitive" } } },
        { createdByUser: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 4. Filter options (all hosts & staff accounts)
    const [allHosts, allStaffUsers] = await Promise.all([
      db.employee.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, department: true, email: true, userId: true },
      }),
      db.user.findMany({
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, username: true, role: true, isActive: true },
      }),
    ]);

    // 5. Fetch Paginated Visit Logs
    const [totalCount, logs] = await Promise.all([
      db.visitRequest.count({ where }),
      db.visitRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          visitor: {
            select: {
              id: true,
              visitCount: true,
              firstVisitAt: true,
              lastVisitAt: true,
            },
          },
          host: {
            select: { id: true, name: true, department: true, email: true, userId: true },
          },
          createdByUser: {
            select: { id: true, name: true, username: true, role: true },
          },
          auditLogs: {
            orderBy: { createdAt: "asc" },
            include: {
              actorUser: {
                select: { id: true, name: true, username: true, role: true },
              },
            },
          },
        },
      }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      visitorId: log.visitorId,
      visitNumber: log.visitNumber,
      visitorTotalVisits: log.visitor?.visitCount || log.visitNumber,
      visitorName: log.visitorName,
      visitorEmail: log.visitorEmail,
      visitorPhone: log.visitorPhone,
      idType: log.idType,
      idNumber: log.idNumber,
      purpose: log.purpose,
      status: log.status,
      hostId: log.hostId,
      hostName: log.host.name,
      hostDepartment: log.host.department,
      hostEmail: log.host.email,
      guardId: log.createdByUserId,
      guardName: log.createdByUser.name,
      guardUsername: log.createdByUser.username,
      idPhotoPath: log.idPhotoPath,
      selfiePath: log.selfiePath,
      emailFailed: log.emailFailed,
      otpAttempts: log.otpAttempts,
      createdAt: log.createdAt.toISOString(),
      expiresAt: log.expiresAt ? log.expiresAt.toISOString() : null,
      approvedAt: log.approvedAt ? log.approvedAt.toISOString() : null,
      enteredAt: log.enteredAt ? log.enteredAt.toISOString() : null,
      exitedAt: log.exitedAt ? log.exitedAt.toISOString() : null,
      auditLogs: log.auditLogs.map((a) => formatAuditEntry(a)),
    }));

    // 6. Build Same-Visitor Grouped Profiles
    const visitorWhere: any = {};
    if (visitorId && visitorId !== "ALL") {
      visitorWhere.id = visitorId;
    }
    if (search) {
      visitorWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { lastIdNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (hostId && hostId !== "ALL") {
      visitorWhere.visitRequests = { some: { hostId } };
    }
    if (guardId && guardId !== "ALL") {
      visitorWhere.visitRequests = {
        ...visitorWhere.visitRequests,
        some: {
          ...(visitorWhere.visitRequests?.some || {}),
          createdByUserId: guardId,
        },
      };
    }

    const visitorsRaw = await db.visitor.findMany({
      where: visitorWhere,
      orderBy: { lastVisitAt: "desc" },
      take: 200,
      include: {
        visitRequests: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            host: { select: { id: true, name: true, department: true, email: true } },
            createdByUser: { select: { id: true, name: true, username: true } },
            auditLogs: {
              orderBy: { createdAt: "asc" },
              include: {
                actorUser: {
                  select: { id: true, name: true, username: true, role: true },
                },
              },
            },
          },
        },
      },
    });

    const formattedVisitors = visitorsRaw.map((v) => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      email: v.email || v.visitRequests[0]?.visitorEmail || "",
      visitCount: Math.max(v.visitCount, v.visitRequests.length),
      firstVisitAt: v.firstVisitAt.toISOString(),
      lastVisitAt: v.lastVisitAt.toISOString(),
      lastIdType: v.lastIdType || v.visitRequests[0]?.idType || "AADHAAR",
      lastIdNumber: v.lastIdNumber,
      lastIdPhotoPath: v.lastIdPhotoPath,
      lastSelfiePath: v.lastSelfiePath,
      visits: v.visitRequests.map((r) => ({
        id: r.id,
        visitorId: r.visitorId,
        visitNumber: r.visitNumber,
        visitorTotalVisits: Math.max(v.visitCount, v.visitRequests.length),
        visitorName: r.visitorName,
        visitorEmail: r.visitorEmail,
        visitorPhone: r.visitorPhone,
        idType: r.idType,
        idNumber: r.idNumber,
        purpose: r.purpose,
        status: r.status,
        hostId: r.hostId,
        hostName: r.host.name,
        hostDepartment: r.host.department,
        hostEmail: r.host.email,
        guardId: r.createdByUserId,
        guardName: r.createdByUser.name,
        guardUsername: r.createdByUser.username,
        idPhotoPath: r.idPhotoPath,
        selfiePath: r.selfiePath,
        emailFailed: r.emailFailed,
        otpAttempts: r.otpAttempts,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
        enteredAt: r.enteredAt ? r.enteredAt.toISOString() : null,
        exitedAt: r.exitedAt ? r.exitedAt.toISOString() : null,
        auditLogs: r.auditLogs.map((a) => formatAuditEntry(a)),
      })),
    }));

    // 7. System & User Activity Audit Log Stream
    const activityWhere: any = {};
    const selectedStaffUserId =
      actorUserId && actorUserId !== "ALL"
        ? actorUserId
        : guardId && guardId !== "ALL"
        ? guardId
        : null;

    if (selectedStaffUserId) {
      activityWhere.OR = [
        { actorUserId: selectedStaffUserId },
        { targetUserId: selectedStaffUserId },
      ];
    }

    if (visitorId && visitorId !== "ALL") {
      activityWhere.visitorId = visitorId;
    }

    if (dateStr && dateStr !== "ALL" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const { start, end } = getIstDayBounds(dateStr);
      activityWhere.createdAt = { gte: start, lte: end };
    }

    if (search) {
      const searchConds = [
        { action: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { actorName: { contains: search, mode: "insensitive" } },
        { visitor: { name: { contains: search, mode: "insensitive" } } },
        { visitor: { phone: { contains: search } } },
        { actorUser: { name: { contains: search, mode: "insensitive" } } },
      ];
      if (activityWhere.OR) {
        activityWhere.AND = [{ OR: activityWhere.OR }, { OR: searchConds }];
        delete activityWhere.OR;
      } else {
        activityWhere.OR = searchConds;
      }
    }

    const activityRaw = await db.auditLog.findMany({
      where: activityWhere,
      orderBy: { createdAt: "desc" },
      take: 250,
      include: {
        actorUser: {
          select: { id: true, name: true, username: true, role: true },
        },
        targetUser: {
          select: { id: true, name: true, username: true, role: true },
        },
        visitor: {
          select: { id: true, name: true, phone: true },
        },
        visitRequest: {
          select: { id: true, visitorName: true, visitNumber: true, status: true },
        },
      },
    });

    const activityLogs = activityRaw.map((a) => ({
      ...formatAuditEntry(a),
      visitorName: a.visitor?.name || a.visitRequest?.visitorName || null,
      visitorPhone: a.visitor?.phone || null,
      visitNumber: a.visitRequest?.visitNumber || null,
      visitStatus: a.visitRequest?.status || null,
    }));

    return NextResponse.json({
      summary: {
        visitorsToday,
        currentlyWaiting,
        enteredToday,
        deniedToday,
        totalVisitsAllTime,
        uniqueVisitorsCount,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
      filterOptions: {
        guards: allStaffUsers.filter((u) => u.role === "GUARD" || u.role === "ADMIN"),
        hosts: allHosts,
        staff: allStaffUsers,
      },
      logs: formattedLogs,
      visitors: formattedVisitors,
      activityLogs,
    });
  } catch (error) {
    console.error("Admin logs fetch error:", error);
    return NextResponse.json({ error: "Failed to retrieve logs" }, { status: 500 });
  }
}
