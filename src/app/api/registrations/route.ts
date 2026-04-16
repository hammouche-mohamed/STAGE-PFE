import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrationSchema } from "@/lib/validations/registration.schema";

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
  // Existing POST logic moved here for completeness or handled in route.ts
  // I already created route.ts for the public POST. 
  // This file handles the Admin GET and potentially other Admin actions.
  try {
    const body = await req.json();
    const validatedData = registrationSchema.parse(body);

    const existingRequest = await prisma.registrationRequest.findUnique({
      where: { email: validatedData.email }
    });

    if (existingRequest) {
      return NextResponse.json({ error: "Request already exists" }, { status: 409 });
    }

    const request = await prisma.registrationRequest.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role,
        motivation: validatedData.motivation,
        companyName: validatedData.companyName,
      }
    });

    return NextResponse.json({ data: request }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
