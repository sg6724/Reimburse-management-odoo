import type { Role } from "@/types";
import type { DefaultSession } from "next-auth";

type AppClaims = {
  id: string;
  role: Role;
  companyId: string;
  mustChangePassword: boolean;
};

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & AppClaims;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    companyId?: string;
    mustChangePassword?: boolean;
  }
}
