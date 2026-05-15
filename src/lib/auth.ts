import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import type { StudentLevel } from '@/types/internship';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    async signOut(message: any) {
      try {
        const userId = message?.token?.id || message?.session?.user?.id;
        if (!userId) return;
        const { AuditService } = await import('./services/audit.service');
        await AuditService.log({
          userId,
          action: 'USER_LOGOUT',
          targetType: 'User',
          targetId: userId,
        });
      } catch {
        // never block a logout on an audit failure
      }
    },
  },
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

        // Lockout check + user fetch are independent — run them in parallel
        // (one DB round-trip instead of two against the remote DB). The user
        // query also pulls the admin/teacher profile so the JWT callback
        // doesn't need a separate round-trip on sign-in.
        const [loginAttempt, user] = await Promise.all([
          (prisma as any).loginAttempt.findUnique({
            where: { email_ip: { email: normalizedEmail, ip: "global" } },
          }),
          prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { adminprofile: true, teacherprofile: true } as any,
          }) as any,
        ]);

        if (loginAttempt?.lockoutUntil && loginAttempt.lockoutUntil > new Date()) {
          const waitTime = Math.ceil((loginAttempt.lockoutUntil.getTime() - Date.now()) / 60000);
          throw new Error(`TOO_MANY_ATTEMPTS:${waitTime}`);
        }

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

        // Success. The attempt-reset and audit write are NOT on the critical
        // path — fire them off without blocking the login response.
        void (prisma as any).loginAttempt
          .deleteMany({ where: { email: normalizedEmail } })
          .catch(() => {});

        void import('./services/audit.service')
          .then(({ AuditService }) =>
            AuditService.log({
              userId: user.id,
              action: 'USER_LOGIN',
              targetType: 'User',
              targetId: user.id,
              details: { email: normalizedEmail, role: user.role },
            }),
          )
          .catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? null,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          level: (user.level as StudentLevel | null) ?? null,
          // Carried so the JWT callback skips its extra profile round-trip.
          isSuperAdmin: user.adminprofile?.isSuperAdmin ?? false,
          filiereId:
            user.adminprofile?.filiereId ??
            user.teacherprofile?.filiereId ??
            null,
        } as any;
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
