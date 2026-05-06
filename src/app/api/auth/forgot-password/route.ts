import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MailService } from "@/lib/services/mail.service";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save to DB
    await prisma.passwordResetToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        email: user.email,
        code,
        expiresAt,
      },
    });

    // Send Email
    await MailService.sendPasswordResetCode(email, code);

    return NextResponse.json({ message: "Verification code sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
