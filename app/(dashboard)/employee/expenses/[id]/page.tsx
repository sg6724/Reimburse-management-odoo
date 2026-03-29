import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllCountryCurrencies } from "@/lib/currency";
import { ExpenseForm } from "@/components/expense/expense-form";
import { ApprovalLog } from "@/components/approval/approval-log";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { company: { select: { id: true, currencyCode: true } } },
  });

  if (!user) redirect("/login");
  if (user.role !== "EMPLOYEE") redirect("/");

  const { id } = await params;

  const expense = await prisma.expense.findFirst({
    where: { id, companyId: user.company.id, employeeId: user.id },
    include: {
      category: true,
      paidBy: { select: { id: true, name: true, email: true, role: true } },
      employee: { select: { id: true, name: true, email: true, role: true } },
      approvals: {
        include: { approver: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!expense) {
    redirect("/employee/expenses");
  }

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
    <div className="space-y-6">
      <ExpenseForm
        expense={expense}
        categories={categories}
        companyUsers={companyUsers}
        currencies={currencies}
        companyCurrencyCode={user.company.currencyCode}
      />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text">Approval Log</h2>
        <ApprovalLog
          items={expense.approvals.map((approval) => ({
            id: approval.id,
            approverName: approval.approver.name,
            status: approval.status,
            comment: approval.comment,
            decidedAt: approval.decidedAt?.toISOString() ?? null,
            isManagerApproval: approval.isManagerApproval,
          }))}
        />
      </section>
    </div>
  );
}
