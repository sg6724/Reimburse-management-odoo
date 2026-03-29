import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@/types";

type AppUserClaims = {
  id: string;
  role: Role;
  companyId: string;
  mustChangePassword: boolean;
};

const ROLE_SET: Set<Role> = new Set(["ADMIN", "MANAGER", "EMPLOYEE"]);

function toAppUserClaims(user: unknown): AppUserClaims | null {
  if (!user || typeof user !== "object") return null;

  const candidate = user as Record<string, unknown>;
  const role = candidate.role;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.companyId !== "string" ||
    typeof candidate.mustChangePassword !== "boolean" ||
    typeof role !== "string" ||
    !ROLE_SET.has(role as Role)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    role: role as Role,
    companyId: candidate.companyId,
    mustChangePassword: candidate.mustChangePassword,
  };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { company: true },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const claims = toAppUserClaims(user);
      if (claims) {
        token.id = claims.id;
        token.role = claims.role;
        token.companyId = claims.companyId;
        token.mustChangePassword = claims.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        typeof token.id === "string" &&
        typeof token.role === "string" &&
        ROLE_SET.has(token.role as Role) &&
        typeof token.companyId === "string" &&
        typeof token.mustChangePassword === "boolean"
      ) {
        session.user.id = token.id;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
});
