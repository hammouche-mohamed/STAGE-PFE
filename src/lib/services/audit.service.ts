import prisma from "../prisma";

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
      return await prisma.auditLog.create({
        data: {
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
}
