import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const token = await prisma.passwordResetToken.findFirst({
      where: {
        email,
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    return NextResponse.json({ message: "Code verified successfully", valid: true });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
