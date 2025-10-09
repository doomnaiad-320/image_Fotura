import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email({ message: "邮箱格式不正确" }),
  password: z.string().min(8, { message: "密码至少 8 位" })
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signin"
  },
  providers: [
    CredentialsProvider({
      name: "邮箱密码登录",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          credits: user.credits
        } as any;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.credits = Number(token.credits ?? 0);
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.credits = (user as any).credits;
        token.name = user.name;
        token.email = user.email;
      }

      if (!user && token?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            credits: true
          }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.credits = dbUser.credits;
          token.email = dbUser.email;
          token.name = dbUser.name ?? undefined;
        }
      }

      return token;
    }
  }
};

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  credits: number;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getCurrentSession();
  const sessionUser = session?.user as
    | (CurrentUser & { id: string })
    | undefined;

  if (!sessionUser?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      credits: true
    }
  });

  return user ?? null;
}

export async function registerUser({
  email,
  name,
  password
}: {
  email: string;
  name: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("邮箱已注册");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const isFirstUser = (await prisma.user.count()) === 0;

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: isFirstUser ? "admin" : "user",
      credits: isFirstUser ? 100_000 : 5_000
    }
  });
}
