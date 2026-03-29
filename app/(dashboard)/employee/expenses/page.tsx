import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployeeExpensesDashboard } from "./dashboard";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: { select: { currencyCode: true } } },
  });

  if (!user) redirect("/login");
  if (user.role !== "EMPLOYEE") redirect("/");

  return <EmployeeExpensesDashboard companyCurrencyCode={user.company.currencyCode} />;
}
