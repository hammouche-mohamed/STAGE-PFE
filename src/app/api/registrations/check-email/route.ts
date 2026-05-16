import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true }
    });

    if (existingUser) {
      return NextResponse.json({
        status: "ACCOUNT_EXISTS",
        message: "This email is already registered."
      });
    }

    const pendingRequest = await prisma.registrationRequest.findUnique({
      where: { email },
      select: { status: true }
    });

    if (pendingRequest) {
      if (pendingRequest.status === "PENDING") {
        return NextResponse.json({
          status: "PENDING_REQUEST",
          message: "You already have a pending registration request. You will be accepted as soon as possible."
        });
      }
      if (pendingRequest.status === "REJECTED") {
        return NextResponse.json({
          status: "REJECTED_REQUEST",
          message: "A previous request with this email was rejected. Please contact support or use a different email."
        });
      }
    }

    return NextResponse.json({
      status: "AVAILABLE",
      message: "Email is available"
    });

  } catch (error) {
    console.error("Email check failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
