/**
 * app/(dashboard)/employee/expenses/[id]/page.tsx
 * Owner: Person B
 *
 * Expense detail view.
 *  - Draft: renders editable ExpenseForm
 *  - Submitted: renders read-only ExpenseForm + ApprovalLog (Person C's component)
 *
 * KEY: displays amountInCompanyCurrency and exchangeRateUsed directly from DB
 *      — never re-fetches or recalculates the exchange rate.
 */

import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseForm } from "@/components/expense/expense-form";
import { ExpenseStatusBadge } from "@/components/expense/expense-status-badge";
import { ApprovalLog } from "@/components/approval/approval-log"; // Person C owns this
import { formatCurrency, formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: userId, companyId, role } = session.user as {
    id: string;
    companyId: string;
    role: string;
  };

  const expense = await prisma.expense.findFirst({
    where: {
      id,
      companyId,
      // Employees see only their own; admins see all
      ...(role === "EMPLOYEE" ? { employeeId: userId } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, email: true, role: true } },
      paidBy:   { select: { id: true, name: true, email: true, role: true } },
      category: { select: { id: true, name: true, isActive: true } },
      approvals: {
        orderBy: { createdAt: "asc" },
        include: {
          approver: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  if (!expense) notFound();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currencyCode: true },
  });

  const [categories, companyUsers] = await Promise.all([
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
  ]);

  const isDraft = expense.status === "DRAFT";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">

      {/* ── Edit form (draft) or read-only detail view ───────────────────── */}
      {isDraft ? (
        <ExpenseForm
          expense={expense as any}
          categories={categories}
          companyUsers={companyUsers}
          currencies={[expense.currencyCode]} // read-only — currency locked
          companyCurrencyCode={company?.currencyCode ?? "USD"}
        />
      ) : (
        <ReadOnlyDetail expense={expense} companyCurrencyCode={company?.currencyCode ?? "USD"} />
      )}

      {/* ── Approval log — rendered by Person C's component ─────────────── */}
      {expense.approvals.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">
            Approval History
          </h2>
          <ApprovalLog approvals={expense.approvals as any} />
        </section>
      )}
    </div>
  );
}

// ─── Read-only detail card (non-draft expenses) ───────────────────────────────

function ReadOnlyDetail({
  expense,
  companyCurrencyCode,
}: {
  expense: any;
  companyCurrencyCode: string;
}) {
  const rows: [string, React.ReactNode][] = [
    ["Title",       expense.title],
    ["Date",        formatDate(expense.date)],
    ["Category",    expense.category?.name ?? "—"],
    ["Paid By",     expense.paidBy?.name ?? "—"],
    ["Amount",      formatCurrency(expense.amount, expense.currencyCode)],
    // KEY: always read locked fields from DB — never recalculate
    [
      `Amount (${companyCurrencyCode})`,
      <>
        {formatCurrency(expense.amountInCompanyCurrency, companyCurrencyCode)}
        {expense.exchangeRateUsed && (
          <span className="ml-2 text-xs text-[#6B7280]">
            @ {expense.exchangeRateUsed.toFixed(6)}
          </span>
        )}
      </>,
    ],
    ["Description", expense.description ?? "—"],
    ["Remarks",     expense.remarks ?? "—"],
    [
      "Receipt",
      expense.receiptUrl ? (
        <a
          href={expense.receiptUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[#5E4075] underline text-sm"
        >
          View receipt
        </a>
      ) : (
        "No receipt attached"
      ),
    ],
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E2E4D8] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E4D8] bg-[#F8F9ED]">
        <h1 className="text-lg font-semibold text-[#1A1A2E]">{expense.title}</h1>
        <ExpenseStatusBadge status={expense.status} />
      </div>

      {/* Detail grid */}
      <dl className="divide-y divide-[#E2E4D8]">
        {rows.map(([label, value]) => (
          <div key={label} className="px-6 py-3 grid grid-cols-3 gap-4">
            <dt className="text-sm font-medium text-[#6B7280]">{label}</dt>
            <dd className="text-sm text-[#1A1A2E] col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}