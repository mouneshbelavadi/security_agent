import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndExpireVisit } from "@/lib/visit-lifecycle";
import { isTeamsNotificationEnabled } from "@/lib/teams";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        createdByUser: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit request not found" }, { status: 404 });
    }

    const currentStatus = await checkAndExpireVisit({
      id: visit.id,
      visitorId: visit.visitorId,
      status: visit.status,
      expiresAt: visit.expiresAt,
      otpExpiresAt: visit.otpExpiresAt,
    });

    let expiresAt: Date | null = null;
    if (currentStatus === "WAITING_HOST") {
      expiresAt = visit.expiresAt;
    } else if (currentStatus === "APPROVED") {
      expiresAt = visit.otpExpiresAt;
    }

    // IMPORTANT: Security rule: Never expose the otpHash or raw OTP to the guard!
    return NextResponse.json({
      id: visit.id,
      visitorId: visit.visitorId,
      visitNumber: visit.visitNumber,
      visitorName: visit.visitorName,
      visitorEmail: visit.visitorEmail,
      visitorPhone: visit.visitorPhone,
      idType: visit.idType,
      idNumber: visit.idNumber,
      purpose: visit.purpose,
      idPhotoPath: visit.idPhotoPath,
      selfiePath: visit.selfiePath,
      status: currentStatus,
      hostName: visit.host.name,
      hostDepartment: visit.host.department,
      hostEmail: visit.host.email,
      emailFailed: visit.emailFailed,
      notificationChannel: isTeamsNotificationEnabled() ? "TEAMS" : "EMAIL",
      otpAttempts: visit.otpAttempts,
      maxAttempts: 3,
      createdAt: visit.createdAt,
      expiresAt: expiresAt?.toISOString() || null,
      approvedAt: visit.approvedAt,
      enteredAt: visit.enteredAt,
      exitedAt: visit.exitedAt,
    });
  } catch (error) {
    console.error("Fetch visit request status error:", error);
    return NextResponse.json({ error: "Failed to fetch request status" }, { status: 500 });
  }
}
