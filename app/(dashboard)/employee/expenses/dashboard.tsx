"use client";

/**
 * app/(dashboard)/employee/expenses/dashboard.tsx
 * Owner: Person B
 *
 * Interactive client component for the employee expense dashboard.
 * Receives companyCurrencyCode from the server page so it's always accurate.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useExpenses, useExpenseSummary } from "@/hooks/use-expenses";
import { ExpenseTable } from "@/components/expense/expense-table";
import { ExpenseStatus } from "@/components/expense/expense-status-badge";
import { formatCurrency } from "@/lib/utils";

interface Props {
  companyCurrencyCode: string;
}

const STATUS_TABS = [
  { label: "All",              value: undefined },
  { label: "Draft",            value: ExpenseStatus.DRAFT },
  { label: "Waiting Approval", value: ExpenseStatus.PENDING },
  { label: "Approved",         value: ExpenseStatus.APPROVED },
  { label: "Rejected",         value: ExpenseStatus.REJECTED },
] as const;

export function EmployeeExpensesDashboard({ companyCurrencyCode }: Props) {
  const [activeTab, setActiveTab] = useState<ExpenseStatus | undefined>(undefined);

  const { expenses, isLoading } = useExpenses({ status: activeTab });
  const { summary } = useExpenseSummary();

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">My Expenses</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Track and manage your expense claims
          </p>
        </div>
        <Link
          href="/employee/expenses/new"
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg
            bg-[#5E4075] text-white text-sm font-medium
            hover:bg-[#4a3260] transition-colors
          "
        >
          + New Expense
        </Link>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          label="To Submit"
          count={summary?.draftCount ?? 0}
          amount={summary?.draftTotal ?? 0}
          currency={companyCurrencyCode}
          color="neutral"
          onClick={() => setActiveTab(ExpenseStatus.DRAFT)}
          active={activeTab === ExpenseStatus.DRAFT}
        />
        <SummaryCard
          label="Waiting Approval"
          count={summary?.pendingCount ?? 0}
          amount={summary?.pendingTotal ?? 0}
          currency={companyCurrencyCode}
          color="warning"
          onClick={() => setActiveTab(ExpenseStatus.PENDING)}
          active={activeTab === ExpenseStatus.PENDING}
        />
        <SummaryCard
          label="Approved"
          count={summary?.approvedCount ?? 0}
          amount={summary?.approvedTotal ?? 0}
          currency={companyCurrencyCode}
          color="success"
          onClick={() => setActiveTab(ExpenseStatus.APPROVED)}
          active={activeTab === ExpenseStatus.APPROVED}
        />
      </div>

      {/* ── Status tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[#E2E4D8]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(tab.value as ExpenseStatus | undefined)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${
                activeTab === tab.value
                  ? "border-[#5E4075] text-[#5E4075]"
                  : "border-transparent text-[#6B7280] hover:text-[#1A1A2E]"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Expense table ────────────────────────────────────────────────── */}
      <ExpenseTable
        expenses={expenses}
        isLoading={isLoading}
        companyCurrencyCode={companyCurrencyCode}
      />
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  count: number;
  amount: number;
  currency: string;
  color: "neutral" | "warning" | "success";
  onClick: () => void;
  active: boolean;
}

const COLOR_MAP = {
  neutral: {
    bg:     "bg-white",
    border: "border-[#E2E4D8]",
    accent: "text-[#6B7280]",
    dot:    "bg-[#6B7280]",
    ring:   "ring-[#6B7280]/20",
  },
  warning: {
    bg:     "bg-[#FEF3DC]",
    border: "border-[#F0A830]/40",
    accent: "text-[#B97D10]",
    dot:    "bg-[#F0A830]",
    ring:   "ring-[#F0A830]/20",
  },
  success: {
    bg:     "bg-[#E8F8F0]",
    border: "border-[#4CAF7C]/40",
    accent: "text-[#2E7D52]",
    dot:    "bg-[#4CAF7C]",
    ring:   "ring-[#4CAF7C]/20",
  },
};

function SummaryCard({ label, count, amount, currency, color, onClick, active }: SummaryCardProps) {
  const c = COLOR_MAP[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-left p-5 rounded-2xl border transition-all cursor-pointer
        ${c.bg} ${c.border}
        ${active ? `ring-2 ${c.ring}` : "hover:shadow-sm"}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${c.accent}`}>
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-[#1A1A2E]">
        {formatCurrency(amount, currency)}
      </p>
      <p className="text-xs text-[#6B7280] mt-1">
        {count} {count === 1 ? "expense" : "expenses"}
      </p>
    </button>
  );
}
