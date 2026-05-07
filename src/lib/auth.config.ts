import type { NextAuthConfig, DefaultSession } from 'next-auth';
import type { StudentLevel } from '@/types/internship';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      isActive: boolean;
      mustChangePassword: boolean;
      level?: StudentLevel | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
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
      }
      if (trigger === "update" && session?.user) {
        if (session.user.image) token.image = session.user.image;
        if (session.user.name) token.name = session.user.name;
        if (session.user.email) token.email = session.user.email;
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
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 60,
  },
} satisfies NextAuthConfig;
