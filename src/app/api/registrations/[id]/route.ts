import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import bcrypt from "bcryptjs";

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

      // TODO: Send rejection email
      
      await AuditService.log({
        userId: session.user.id,
        action: "REGISTRATION_REJECTED",
        targetType: "RegistrationRequest",
        targetId: id,
        details: { reason: adminComment },
      });

      return NextResponse.json({ message: "Request rejected successfully" });
    }

    // Status is APPROVED
    const tempPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          name: request.name,
          email: request.email,
          password: hashedPassword,
          role: request.role === "STUDENT" ? "STUDENT" : "COMPANY",
          isActive: true,
          mustChangePassword: true,
        },
      });

      // 2. Create Profile
      if (request.role === "STUDENT") {
        // In a real scenario, we'd have these fields in RegistrationRequest
        // For now, using placeholders or parsing motivation if structured
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            studentId: "PENDING", // Should be fetched from request
            promotion: "PENDING",
            speciality: "PENDING",
            academicYear: "2024-2025",
          },
        });
      } else {
        await tx.companyProfile.create({
          data: {
            userId: user.id,
            companyName: request.companyName || request.name,
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

    // 4. Send Welcome Email (async-ish)
    await NotificationService.trigger({
      userId: result.id,
      type: "REGISTRATION_APPROVED",
      title: "Registration Approved",
      message: `Your account has been approved. Please login with your email and the temporary password: ${tempPassword}. You will be required to change your password on first login.`,
    });

    await AuditService.log({
      userId: session.user.id,
      action: "REGISTRATION_APPROVED",
      targetType: "User",
      targetId: result.id,
    });

    return NextResponse.json({ message: "Registration approved and account created successfully" });

  } catch (error: any) {
    console.error("Registration review failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
