import { db } from "./db";

interface AuditLogParams {
  visitRequestId: string;
  action: string;
  actorType: "GUARD" | "EMPLOYEE" | "HOST" | "ADMIN" | "SYSTEM";
  details?: string;
}

/**
 * Record an audit trail entry for a visit request
 */
export async function logAudit(params: AuditLogParams) {
  try {
    return await db.auditLog.create({
      data: {
        visitRequestId: params.visitRequestId,
        action: params.action,
        actorType: params.actorType,
        details: params.details,
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
