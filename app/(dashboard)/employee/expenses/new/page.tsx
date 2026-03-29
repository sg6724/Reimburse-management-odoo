/**
 * app/(dashboard)/employee/expenses/new/page.tsx
 * Owner: Person B
 *
 * Create new expense — loads categories, users, currencies then renders ExpenseForm.
 */

import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllCountryCurrencies } from "@/lib/currency";
import { ExpenseForm } from "@/components/expense/expense-form";

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "EMPLOYEE") redirect("/");

  const { companyId } = session.user;

  const [categories, companyUsers, company] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { companyId, isActive: true },
      select: { id: true, companyId: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { currencyCode: true },
    }),
  ]);

  // Currencies — call lib directly (no HTTP round-trip), Next.js caches for 24h
  let currencies: string[] = [];
  try {
    const all = await fetchAllCountryCurrencies();
    currencies = [...new Set(all.map((c) => c.currencyCode))].sort();
  } catch {
    currencies = ["USD", "EUR", "GBP", "JPY", "INR", "CAD", "AUD", "SGD"];
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <ExpenseForm
        categories={categories}
        companyUsers={companyUsers}
        currencies={currencies}
        companyCurrencyCode={company?.currencyCode ?? "USD"}
      />
    </div>
  );
}