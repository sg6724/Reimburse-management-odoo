import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllCountryCurrencies } from "@/lib/currency";
import { ExpenseForm } from "@/components/expense/expense-form";

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: { select: { id: true, currencyCode: true } } },
  });

  if (!user) redirect("/login");
  if (user.role !== "EMPLOYEE") redirect("/");

  const [categories, companyUsers, countryCurrencies] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { companyId: user.company.id },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId: user.company.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    fetchAllCountryCurrencies(),
  ]);

  const currencies = Array.from(new Set(countryCurrencies.map((c) => c.currencyCode))).sort();

  return (
    <ExpenseForm
      categories={categories}
      companyUsers={companyUsers}
      currencies={currencies}
      companyCurrencyCode={user.company.currencyCode}
    />
  );
}
