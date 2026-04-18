import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return NextResponse.json({ error: "User ID and code are required" }, { status: 400 });
    }

    const token = await prisma.passwordResetToken.findFirst({
      where: { 
        userId, 
        code,
        expiresAt: { gt: new Date() }
      }
    });

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    return NextResponse.json({ 
      message: "Code verified successfully.",
      success: true 
    });

  } catch (error: any) {
    console.error("Code verification failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
