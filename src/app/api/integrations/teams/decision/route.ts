import { NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { executeHostDecision, HostDecisionAction } from "@/lib/host-decision";

function timingSafeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizeDecision(raw: unknown): HostDecisionAction | null {
  if (typeof raw !== "string") return null;
  const val = raw.trim().toUpperCase();
  if (val === "APPROVE" || val === "APPROVED" || val === "ACCEPT" || val === "APPROVE ENTRY") {
    return "APPROVE";
  }
  if (val === "DENY" || val === "DENIED" || val === "REJECT" || val === "REJECTED" || val === "DENY ENTRY") {
    return "DENY";
  }
  return null;
}

/**
 * POST /api/integrations/teams/decision
 * Webhook callback invoked by Microsoft Power Automate once an employee clicks
 * Approve or Deny on their 1-on-1 Teams Adaptive Card.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const headerSecret = request.headers.get("x-teams-secret") || "";
    const bodySecret = typeof body.secret === "string" ? body.secret : "";
    const providedSecret = headerSecret || bodySecret;

    if (!providedSecret || !timingSafeMatch(providedSecret, env.TEAMS_WEBHOOK_SECRET)) {
      return NextResponse.json(
        { error: "Unauthorized Teams webhook secret" },
        { status: 401 }
      );
    }

    const requestId =
      body.requestId ||
      body.data?.requestId ||
      body.submitData?.requestId;

    const rawDecision =
      body.decision ??
      body.submitActionId ??
      body.action ??
      body.data?.decision ??
      body.submitData?.decision;

    const decision = normalizeDecision(rawDecision);

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    if (!decision) {
      return NextResponse.json(
        { error: "Invalid decision. Expected APPROVE or DENY." },
        { status: 400 }
      );
    }

    const visitHost = await db.visitRequest.findUnique({
      where: { id: requestId },
      include: { host: true },
    });

    if (!visitHost) {
      return NextResponse.json({ error: "Visit request not found" }, { status: 404 });
    }

    const responderEmail =
      typeof body.responderEmail === "string" && body.responderEmail.trim()
        ? body.responderEmail.trim().toLowerCase()
        : visitHost.host.email;

    const responderName =
      typeof body.responderName === "string" && body.responderName.trim()
        ? body.responderName.trim()
        : visitHost.host.name;

    // Look up matching User ID for audit log attribution if responder exists in system
    const responderEmployee = await db.employee.findUnique({
      where: { email: responderEmail },
      select: { userId: true },
    });

    const result = await executeHostDecision({
      visitId: requestId,
      decision,
      actorUserId: responderEmployee?.userId ?? visitHost.host.userId ?? null,
      actorName: responderName,
      actorEmail: responderEmail,
      source: "TEAMS",
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: result.httpStatus }
      );
    }

    return NextResponse.json({
      success: true,
      requestId,
      status: result.status,
      otpEmailSent: result.otpEmailSent ?? false,
      message: result.message,
    });
  } catch (error) {
    console.error("Teams decision webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process Microsoft Teams decision" },
      { status: 500 }
    );
  }
}
