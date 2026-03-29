import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicPaths = ["/login", "/signup", "/forgot-password"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isPublic) {
    const role = (req.auth?.user as any)?.role;
    const redirectMap: Record<string, string> = {
      ADMIN: "/admin/users",
      MANAGER: "/manager/approvals",
      EMPLOYEE: "/employee/expenses",
    };
    return NextResponse.redirect(
      new URL(redirectMap[role] ?? "/admin/users", req.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
