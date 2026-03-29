import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const expiredSession = request.nextUrl.searchParams.get("expired") === "1";
  const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req: request, secret: authSecret });
  const isLoggedIn = !!token;

  const publicPaths = ["/login", "/signup", "/forgot-password"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && isPublic && !expiredSession) {
    const role = token?.role as string | undefined;
    const redirectMap: Record<string, string> = {
      ADMIN: "/admin/users",
      MANAGER: "/manager/approvals",
      EMPLOYEE: "/employee/expenses",
    };

    return NextResponse.redirect(
      new URL(redirectMap[role ?? ""] ?? "/admin/users", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
