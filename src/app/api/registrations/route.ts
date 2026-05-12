import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrationSchema } from "@/lib/validations/registration.schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { isRateLimited, getClientIp } from "@/lib/utils/rateLimiter";
import { MailService } from "@/lib/services/mail.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // NFR-SC2: paginate – max 20 per page
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {
      AND: [
        statusFilter ? { status: statusFilter } : {},
        search ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { studentId: { contains: search } }
          ]
        } : {}
      ]
    };

    const [requests, total] = await Promise.all([
      prisma.registrationRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        // NFR-P2: explicit field selection — never over-fetch
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          motivation: true,
          companyName: true,
          studentId: true,
          promotion: true,
          speciality: true,
          level: true,
          academicYear: true,
          grade: true,
          sector: true,
          wilaya: true,
          adminComment: true,
          userId: true,
          createdAt: true,
          reviewedAt: true,
        },
      }),
      prisma.registrationRequest.count({ where }),
    ]);

    return NextResponse.json({
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Fetch registrations failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // NFR-S4: Rate-limit registration submissions — max 5 per IP per minute
  const ip = getClientIp(req);
  if (isRateLimited(`register:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const validatedData = registrationSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists.", status: "ACCOUNT_EXISTS" },
        { status: 409 },
      );
    }

    // Check Blocklist
    const isBlocked = await (prisma as any).blockedEmail.findUnique({
      where: { email: validatedData.email },
    });

    if (isBlocked) {
      return NextResponse.json(
        { error: "This email address is not authorized to register." },
        { status: 403 },
      );
    }

    const existingRequest = await prisma.registrationRequest.findUnique({
      where: { email: validatedData.email },
    });

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return NextResponse.json(
          { 
            error: "You already have a pending registration request.", 
            status: "PENDING_REQUEST" 
          },
          { status: 409 },
        );
      }
      if (existingRequest.status === "REJECTED") {
        // Automatically delete the old rejected request to allow a fresh submission
        await prisma.registrationRequest.delete({
          where: { id: existingRequest.id }
        });
      } else {
        return NextResponse.json(
          { error: "A registration request already exists for this email address.", status: "REQUEST_EXISTS" },
          { status: 409 },
        );
      }
    }

    // Check for duplicate Student ID
    if (validatedData.role === "STUDENT" && validatedData.studentId) {
      const existingIdInProfile = await prisma.studentProfile.findUnique({
        where: { studentId: validatedData.studentId },
      });

      if (existingIdInProfile) {
        return NextResponse.json(
          { error: "This Student ID is already registered to an active account." },
          { status: 409 },
        );
      }

      const pendingRequestWithId = await prisma.registrationRequest.findFirst({
        where: { 
          studentId: validatedData.studentId,
          status: "PENDING"
        },
      });

      if (pendingRequestWithId) {
        return NextResponse.json(
          { 
            error: "A registration request with this Student ID is already pending review.",
            status: "PENDING_REQUEST" 
          },
          { status: 409 },
        );
      }
    }

    // NFR-S5: explicit password strength check before hashing
    if (!validatedData.password || validatedData.password.length < 12 || !/[0-9]/.test(validatedData.password)) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters and include at least one number." },
        { status: 400 },
      );
    }

    // NFR-S1: Passwords hashed with bcrypt using minimum 12 salt rounds
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const request = await prisma.registrationRequest.create({
      data: {
        id: randomUUID(),
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role as "STUDENT" | "COMPANY" | "TEACHER",
        password: hashedPassword,
        motivation: validatedData.motivation,
        // Shared fields
        speciality: validatedData.speciality,
        // Student specific
        studentId: validatedData.studentId,
        promotion: validatedData.promotion || (validatedData.role === "STUDENT" ? validatedData.level : null),
        academicYear: validatedData.academicYear,
        // NFR-RDI3: persist academic level for eligibility enforcement at approval time
        level: (validatedData.level as any) ?? null,
        // Company specific
        companyName: validatedData.companyName,
        sector: validatedData.sector,
        wilaya: validatedData.wilaya,
        // Teacher specific
        grade: validatedData.grade,
      },
    });

    // 1. Find matching department if speciality is provided
    let targetFiliereId = null;
    if (validatedData.speciality) {
      const filiere = await prisma.filiere.findFirst({
        where: { name: validatedData.speciality }
      });
      if (filiere) targetFiliereId = filiere.id;
    }

    // 2. Notify relevant admins
    const admins = await prisma.user.findMany({ 
      where: { 
        role: "ADMIN",
        ...(targetFiliereId ? {
          OR: [
            { adminProfile: { isSuperAdmin: true } },
            { adminProfile: { filiereId: targetFiliereId } }
          ]
        } : {})
      },
      select: { id: true } 
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          id: randomUUID(),
          userId: admin.id,
          type: "REGISTRATION_SUBMITTED",
          title: "New Registration Request",
          message: `${validatedData.name} has submitted a registration request as a ${validatedData.role.toLowerCase()}.`,
          relatedId: request.id,
          relatedType: "REGISTRATION_REQUEST",
          link: "/admin/registrations",
        }))
      });
    }
    
    // NFR-N1: Send confirmation email to the user
    // We do this asynchronously to avoid blocking the response
    MailService.sendRegistrationReceived(validatedData.email, validatedData.name).catch(err => 
      console.error("Delayed registration email failed:", err)
    );

    return NextResponse.json(
      { data: { id: request.id, status: request.status } },
      { status: 201 },
    );
  } catch (error: unknown) {
    if ((error as { name?: string })?.name === "ZodError") {
      return NextResponse.json(
        { error: "Please check your input and try again." },
        { status: 400 },
      );
    }
    console.error("Registration submission failed:", error);
    // NFR-U2: never expose internal error details to the client
    return NextResponse.json(
      { error: "Registration could not be processed. Please try again later." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { count } = await prisma.registrationRequest.deleteMany({
      where: {
        status: { in: ["APPROVED", "REJECTED"] }
      }
    });

    return NextResponse.json({ 
      message: `${count} handled requests cleared from history.` 
    });
  } catch (error) {
    console.error("Bulk delete registrations failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
