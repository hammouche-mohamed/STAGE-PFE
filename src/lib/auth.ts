import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import type { StudentLevel } from '@/types/internship';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = (credentials.email as string).trim().toLowerCase();

        // Dynamically import prisma to prevent it from loading in the Edge/Middleware runtime
        const { default: prisma } = await import('./prisma');

        // 1. Brute-force protection: Check for lockout
        const loginAttempt = await (prisma as any).loginAttempt.findUnique({
          where: { email_ip: { email: normalizedEmail, ip: "global" } } // Simplified to email-based global for now
        });

        if (loginAttempt?.lockoutUntil && loginAttempt.lockoutUntil > new Date()) {
          const waitTime = Math.ceil((loginAttempt.lockoutUntil.getTime() - Date.now()) / 60000);
          throw new Error(`TOO_MANY_ATTEMPTS:${waitTime}`);
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          await handleFailedAttempt(normalizedEmail, prisma);
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          (credentials.password as string).trim(),
          user.password.trim(),
        );
        
        if (!passwordMatch) {
          await handleFailedAttempt(normalizedEmail, prisma);
          return null;
        }

        // 2. Success: Reset failed attempts
        await (prisma as any).loginAttempt.deleteMany({
          where: { email: normalizedEmail }
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? null,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          level: (user.level as StudentLevel | null) ?? null,
        };
      },
    }),
  ],
});

async function handleFailedAttempt(email: string, prisma: any) {
  const attempt = await (prisma as any).loginAttempt.findUnique({
    where: { email_ip: { email, ip: "global" } }
  });

  if (!attempt) {
    await (prisma as any).loginAttempt.create({
      data: { email, ip: "global", attempts: 1 }
    });
  } else {
    const newAttempts = attempt.attempts + 1;
    let lockoutUntil = null;

    if (newAttempts > 5) {
      const minutesToLock = (newAttempts - 5) * 5;
      lockoutUntil = new Date(Date.now() + minutesToLock * 60000);
    }

    await (prisma as any).loginAttempt.update({
      where: { id: attempt.id },
      data: { attempts: newAttempts, lockoutUntil }
    });
  }
}
