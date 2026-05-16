import prisma from "../prisma";
import { randomUUID } from "crypto";

export class AuditService {
  static async log({
    userId,
    action,
    targetType,
    targetId,
    details = null,
    ipAddress = null,
  }: {
    userId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: any;
    ipAddress?: string | null;
  }) {
    try {
      // Audit logs are append-only compliance records — retained
      // indefinitely and never auto-pruned.

      return await prisma.auditLog.create({
        data: {
          id: randomUUID(),
          userId,
          action,
          targetType,
          targetId,
          details: details ? JSON.stringify(details) : undefined,
          ipAddress,
        },
      })
    } catch (error) {
      console.error("Audit log failed:", error);
    }
  }

  /**
   * Retained for API compatibility. Audit logs are compliance records and
   * are NEVER deleted (never expire, kept in the archive indefinitely), so
   * this is intentionally a no-op that purges nothing.
   */
  static async cleanupOldLogs() {
    try {
      // No-op: audit logs are kept forever by policy.
      return 0;
    } catch (error) {
      console.error("Audit cleanup failed:", error);
      return 0;
    }
  }
}
