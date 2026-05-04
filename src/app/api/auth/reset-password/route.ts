import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { userId, code, password } = await req.json();

    if (!userId || !code || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify token again for security
    const token = await prisma.passwordResetToken.findFirst({
      where: { 
        userId, 
        code,
        expiresAt: { gt: new Date() }
      }
    });

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired session. Please start over." }, { status: 400 });
    }

    // 2. Hash new password — NFR-S1: minimum 12 salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Update user
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // 4. Delete token
    await prisma.passwordResetToken.delete({
      where: { id: token.id }
    });

    return NextResponse.json({ 
      message: "Password reset successfully. You can now login with your new password.",
      success: true 
    });

  } catch (error: any) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
