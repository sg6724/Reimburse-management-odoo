/**
 * app/(dashboard)/employee/expenses/page.tsx
 * Owner: Person B
 *
 * Server component shell — fetches company currency, then renders the
 * interactive client dashboard below.
 */

import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployeeExpensesDashboard } from "./dashboard";

export default async function EmployeeExpensesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { companyId } = session.user as { companyId: string };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currencyCode: true },
  });

  return (
    <EmployeeExpensesDashboard
      companyCurrencyCode={company?.currencyCode ?? "USD"}
    />
  );
}
