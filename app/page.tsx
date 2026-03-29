import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const redirectMap: Record<string, string> = {
    ADMIN: "/admin/users",
    MANAGER: "/manager/approvals",
    EMPLOYEE: "/employee/expenses",
  };
  redirect(redirectMap[role] ?? "/login");
}
