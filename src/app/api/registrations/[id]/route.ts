import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { MailService } from "@/lib/services/mail.service";
import { randomUUID } from "crypto";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, adminComment } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const request = await prisma.registrationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (status === "REJECTED") {
      await prisma.registrationRequest.update({
        where: { id },
        data: { status: "REJECTED", adminComment, reviewedAt: new Date() },
      });

      await AuditService.log({
        userId: session.user.id,
        action: "REGISTRATION_REJECTED",
        targetType: "RegistrationRequest",
        targetId: request.name,
        details: { reason: adminComment },
      });

      // Send rejection notification
      try {
        await MailService.sendStatusUpdate(request.email, request.name, "REJECTED", adminComment);
      } catch (e) {
        console.error("Rejection mail failed:", e);
      }

      return NextResponse.json({ message: "Request rejected successfully" });
    }

    // Status is APPROVED
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          id: randomUUID(),
          name: request.name,
          email: request.email,
          password: request.password || "", // This is already hashed from registration
          role: request.role as any, // STUDENT, COMPANY, or TEACHER
          isActive: true,
          mustChangePassword: false, // User set it themselves
          updatedAt: new Date(),
        },
      });

      // 2. Create Profile based on role
      if (request.role === "STUDENT") {
        await tx.studentProfile.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            studentId: request.studentId || "PENDING",
            promotion: request.promotion || "N/A",
            speciality: request.speciality || "N/A",
            academicYear: request.academicYear || "2024-2025",
          },
        });
      } else if (request.role === "TEACHER") {
        await tx.teacherProfile.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            speciality: request.speciality,
            grade: request.grade,
          },
        });
      } else if (request.role === "COMPANY") {
        await tx.companyProfile.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            companyName: request.companyName || request.name,
            sector: request.sector,
            wilaya: request.wilaya,
          },
        });
      }

      // 3. Link request to user and mark as APPROVED
      await tx.registrationRequest.update({
        where: { id },
        data: { 
          status: "APPROVED", 
          userId: user.id, 
          reviewedAt: new Date() 
        },
      });

      return user;
    });

    // 4. Send Welcome Notification
    await NotificationService.trigger({
      userId: result.id,
      type: "REGISTRATION_APPROVED",
      title: "Registration Approved",
      message: `Your account has been approved! You can now login using your email and the password you set during registration.`,
    });

    await AuditService.log({
      userId: session.user.id,
      action: "REGISTRATION_APPROVED",
      targetType: "User",
      targetId: result.name,
    });

    return NextResponse.json({ message: "Registration approved and account created successfully" });

  } catch (error: any) {
    console.error("Registration review failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
