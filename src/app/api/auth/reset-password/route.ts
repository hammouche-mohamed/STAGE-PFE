import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuditService } from "@/lib/services/audit.service";

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    
    if (newPassword.length < 12 || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: "Password must be at least 12 characters and include at least one number." }, { status: 400 });
    }

    // Double check token again for security
    const token = await prisma.passwordResetToken.findFirst({
      where: {
        email,
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and delete used token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { 
          password: hashedPassword,
          mustChangePassword: false // Assuming they changed it now
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: token.userId },
      }),
    ]);

    await AuditService.log({
      userId: token.userId,
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "User",
      targetId: token.userId,
      details: { email },
    });

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
