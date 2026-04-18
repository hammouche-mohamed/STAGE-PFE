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
      // Auto-cleanup trigger (1% chance to run on log creation)
      if (Math.random() < 0.01) {
        this.cleanupOldLogs();
      }

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
      });
    } catch (error) {
      console.error("Audit log failed:", error);
    }
  }

  /**
   * Deletes logs older than 365 days to prevent database bloat
   */
  static async cleanupOldLogs() {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const deleted = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: oneYearAgo,
          },
        },
      });
      console.log(`Audit cleanup: Removed ${deleted.count} old log entries.`);
      return deleted.count;
    } catch (error) {
      console.error("Audit cleanup failed:", error);
      return 0;
    }
  }
}
