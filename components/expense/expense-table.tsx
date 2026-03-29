/**
 * components/expense/expense-table.tsx
 * Owner: Person B
 *
 * Renders the employee expense list on /employee/expenses.
 * Columns: Description · Date · Category · Paid By · Remarks · Amount · Status
 */

"use client";

import React from "react";
import Link from "next/link";
import type { Expense } from "@/types/expense";
import { ExpenseStatusBadge } from "./expense-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils"; // Person A's helpers

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading?: boolean;
  companyCurrencyCode: string;
}

export function ExpenseTable({
  expenses,
  isLoading,
  companyCurrencyCode,
}: ExpenseTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 text-[#6B7280] text-sm">
        <p className="text-4xl mb-3">📋</p>
        <p className="font-medium">No expenses yet</p>
        <p className="mt-1">Create your first expense to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E4D8]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E2E4D8] bg-[#F8F9ED]">
            {[
              "Description",
              "Date",
              "Category",
              "Paid By",
              "Amount",
              "Status",
              "",
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, i) => (
            <tr
              key={expense.id}
              className={`
                border-b border-[#E2E4D8] last:border-0
                hover:bg-[#F8F9ED]/60 transition-colors
                ${i % 2 === 0 ? "bg-white" : "bg-[#F8F9ED]/30"}
              `}
            >
              {/* Description */}
              <td className="px-4 py-3 max-w-[200px]">
                <p className="font-medium text-[#1A1A2E] truncate">{expense.title}</p>
                {expense.remarks && (
                  <p className="text-xs text-[#6B7280] truncate mt-0.5">{expense.remarks}</p>
                )}
              </td>

              {/* Date */}
              <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                {formatDate(expense.date)}
              </td>

              {/* Category */}
              <td className="px-4 py-3 text-[#1A1A2E]">
                {expense.category?.name ?? "—"}
              </td>

              {/* Paid By */}
              <td className="px-4 py-3 text-[#6B7280]">
                {expense.paidBy?.name ?? "—"}
              </td>

              {/* Amount */}
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="font-medium text-[#1A1A2E]">
                  {formatCurrency(expense.amount, expense.currencyCode)}
                </p>
                {/* Show locked converted amount if already submitted */}
                {expense.amountInCompanyCurrency > 0 &&
                  expense.currencyCode !== companyCurrencyCode && (
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      ≈ {formatCurrency(expense.amountInCompanyCurrency, companyCurrencyCode)}
                    </p>
                  )}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <ExpenseStatusBadge status={expense.status} />
              </td>

              {/* Action */}
              <td className="px-4 py-3">
                <Link
                  href={`/employee/expenses/${expense.id}`}
                  className="text-[#5E4075] hover:text-[#4a3260] text-xs font-medium"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-[#E2E4D8] overflow-hidden">
      <div className="bg-[#F8F9ED] h-10 border-b border-[#E2E4D8]" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-3 border-b border-[#E2E4D8] last:border-0 animate-pulse"
        >
          <div className="h-4 bg-[#E2E4D8] rounded w-40" />
          <div className="h-4 bg-[#E2E4D8] rounded w-20" />
          <div className="h-4 bg-[#E2E4D8] rounded w-24" />
          <div className="h-4 bg-[#E2E4D8] rounded w-16" />
          <div className="h-4 bg-[#E2E4D8] rounded w-20" />
          <div className="h-4 bg-[#E2E4D8] rounded w-20" />
        </div>
      ))}
    </div>
  );
}