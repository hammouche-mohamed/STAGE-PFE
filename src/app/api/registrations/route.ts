import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrationSchema } from "@/lib/validations/registration.schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await prisma.registrationRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error("Fetch registrations failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registrationSchema.parse(body);

    const existingRequest = await prisma.registrationRequest.findUnique({
      where: { email: validatedData.email }
    });

    if (existingRequest) {
      return NextResponse.json({ error: "Request already exists" }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const request = await prisma.registrationRequest.create({
      data: {
        id: randomUUID(),
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role as any, // Cast to ensure compatibility with generated client
        password: hashedPassword,
        motivation: validatedData.motivation,
        // Shared fields
        speciality: validatedData.speciality,
        // Student specific
        studentId: validatedData.studentId,
        promotion: validatedData.promotion,
        academicYear: validatedData.academicYear,
        // Company specific
        companyName: validatedData.companyName,
        sector: validatedData.sector,
        wilaya: validatedData.wilaya,
        // Teacher specific
        grade: validatedData.grade,
      }
    });

    return NextResponse.json({ data: request }, { status: 201 });
  } catch (error: any) {
    console.error("Registration submission failed:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
