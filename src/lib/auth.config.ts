import type { NextAuthConfig, DefaultSession } from 'next-auth';
import type { StudentLevel } from '@/types/internship';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      isActive: boolean;
      mustChangePassword: boolean;
      isSuperAdmin?: boolean;
      filiereId?: string | null;
      level?: StudentLevel | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
    isSuperAdmin?: boolean;
    filiereId?: string | null;
    level?: StudentLevel | null;
  }
}

export const authConfig = {
  providers: [], // Providers are added in the full auth.ts
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image;
        token.isActive = user.isActive;
        token.mustChangePassword = user.mustChangePassword;
        token.level = user.level ?? null;

        // Fetch role-specific fields (isSuperAdmin for Admin, filiereId for Admin/Teacher)
        // Only fetch on sign-in or if fields are missing to avoid hammering the DB
        const shouldFetch = trigger === "signIn" || 
                           (user.role === "ADMIN" && token.isSuperAdmin === undefined) ||
                           (user.role === "TEACHER" && token.filiereId === undefined);

        if (shouldFetch && (user.role === "ADMIN" || user.role === "TEACHER")) {
          try {
            const { default: prisma } = await import('./prisma');
            if (user.role === "ADMIN") {
              const adminProfile = await prisma.adminProfile.findUnique({
                where: { userId: user.id }
              });
              if (adminProfile) {
                token.isSuperAdmin = adminProfile.isSuperAdmin;
                token.filiereId = adminProfile.filiereId || null;
              }
            } else if (user.role === "TEACHER") {
              const teacherProfile = await prisma.teacherProfile.findUnique({
                where: { userId: user.id }
              });
              if (teacherProfile) {
                token.filiereId = teacherProfile.filiereId || null;
              }
            }
          } catch (error) {
            console.error("JWT Callback Error:", error);
          }
        }
      }
      if (trigger === "update" && session?.user) {
        if (session.user.image) token.image = session.user.image;
        if (session.user.name) token.name = session.user.name;
        if (session.user.email) token.email = session.user.email;
        if (typeof session.user.mustChangePassword === 'boolean') {
          token.mustChangePassword = session.user.mustChangePassword;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.image = token.image as string | null;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.isActive = token.isActive as boolean;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.level = (token.level as StudentLevel | null) ?? null;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.filiereId = token.filiereId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    // 5-minute idle timeout (NFR-S6). updateAge < maxAge gives a sliding
    // window: any request within ~2 min of expiry refreshes the token, so
    // active users stay signed in while idle ones are kicked out at 5 min.
    maxAge: 5 * 60,
    updateAge: 2 * 60,
  },
} satisfies NextAuthConfig;
