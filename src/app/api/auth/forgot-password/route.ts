import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MailService } from "@/lib/services/mail.service";
import { randomUUID } from "crypto";
import { isRateLimited, getClientIp } from "@/lib/utils/rateLimiter";

export async function POST(req: NextRequest) {
  // NFR-S4: Rate-limit password reset requests — max 5 per IP per minute
  const ip = getClientIp(req);
  if (isRateLimited(`forgot-pw:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 },
    );
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true }
    });

    if (!user) {
      // For security, don't reveal if user exists or not
      return NextResponse.json({ message: "If an account exists with this email, a code has been sent." });
    }

    // Generate 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in DB (delete any existing tokens for this user first)
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    await prisma.passwordResetToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        email: email,
        code: code,
        expiresAt: expiresAt,
      }
    });

    // Send email
    await MailService.sendPasswordResetCode(email, code);

    return NextResponse.json({ 
      message: "A verification code has been sent to your email.",
      userId: user.id // Returning userId safely to help the next steps in frontend
    });

  } catch (error) {
    console.error("Forgot password failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
