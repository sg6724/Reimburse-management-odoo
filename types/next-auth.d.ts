import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MANAGER" | "EMPLOYEE";
      companyId: string;
      mustChangePassword?: boolean;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    companyId: string;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    companyId: string;
    mustChangePassword?: boolean;
  }
}