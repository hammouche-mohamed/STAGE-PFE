import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrationSchema } from "@/lib/validations/registration.schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { isRateLimited, getClientIp } from "@/lib/utils/rateLimiter";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // NFR-SC2: paginate – max 20 per page
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;
    const statusFilter = searchParams.get("status"); // optional filter

    const where = statusFilter ? { status: statusFilter as "PENDING" | "APPROVED" | "REJECTED" } : {};

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

    const existingRequest = await prisma.registrationRequest.findUnique({
      where: { email: validatedData.email },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "A registration request already exists for this email address." },
        { status: 409 },
      );
    }

    // NFR-S5: explicit password strength check before hashing
    if (!validatedData.password || validatedData.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
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
        promotion: validatedData.promotion,
        academicYear: validatedData.academicYear,
        // NFR-RDI3: persist academic level for eligibility enforcement at approval time
        level: (validatedData.level as "L1" | "L2" | "L3" | "M1" | "M2" | undefined) ?? null,
        // Company specific
        companyName: validatedData.companyName,
        sector: validatedData.sector,
        wilaya: validatedData.wilaya,
        // Teacher specific
        grade: validatedData.grade,
      },
    });

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
