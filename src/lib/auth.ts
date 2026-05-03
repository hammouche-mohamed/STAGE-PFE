import NextAuth, { DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import type { StudentLevel } from '@/types/internship';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      isActive: boolean;
      mustChangePassword: boolean;
      // Academic level for internship type eligibility checks
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? null,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          // Include level so eligibility checks work in API routes without extra DB query
          level: (user.level as StudentLevel | null) ?? null,
        };
      },
    }),
  ],
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
  session: { strategy: 'jwt' },
});
