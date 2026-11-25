import { db } from "./db";

export type AuditActorType = "GUARD" | "EMPLOYEE" | "HOST" | "ADMIN" | "SYSTEM";

export function roleToActorType(role?: string | null): AuditActorType {
  if (role === "ADMIN") return "ADMIN";
  if (role === "EMPLOYEE") return "EMPLOYEE";
  if (role === "GUARD") return "GUARD";
  return "SYSTEM";
}

export interface AuditLogParams {
  visitRequestId?: string | null;
  visitorId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  targetUserId?: string | null;
  action: string;
  actorType: AuditActorType;
  details?: string;
}

/**
 * Record an audit trail entry for a visit request, visitor, or system user.
 */
export async function logAudit(params: AuditLogParams) {
  try {
    return await db.auditLog.create({
      data: {
        visitRequestId: params.visitRequestId ?? null,
        visitorId: params.visitorId ?? null,
        actorUserId: params.actorUserId ?? null,
        actorName: params.actorName ?? null,
        targetUserId: params.targetUserId ?? null,
        action: params.action,
        actorType: params.actorType,
        details: params.details ?? null,
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
