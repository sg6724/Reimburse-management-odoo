/**
 * types/expense.ts
 * Merged version (old + new)
 */

import type { ApprovalDecision } from "./approval";

// ─── Status ──────────────────────────────────────────────────────────────────

export type ExpenseStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

// ─── Core Supporting Types ───────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  createdAt?: string; // optional — not always selected from DB
}

/** Minimal user shape used inside expense views */
export interface ExpenseUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

// ─── Approval Log ────────────────────────────────────────────────────────────

export interface ExpenseApprovalEntry {
  id: string;
  expenseId: string;
  approverId: string;
  status: ApprovalDecision; // "PENDING" | "APPROVED" | "REJECTED" — not "DRAFT"
  comment: string | null;
  isManagerApproval: boolean;
  createdAt: string;
  decidedAt: string | null;

  approver?: ExpenseUser;
}

// ─── Main Expense Type ───────────────────────────────────────────────────────

export interface Expense {
  id: string;
  companyId: string;
  employeeId: string;

  // Core fields
  title: string;
  amount: number;
  currencyCode: string;

  // FX handling
  amountInCompanyCurrency: number;
  exchangeRateUsed: number | null; // added

  categoryId: string;
  description: string | null;
  paidById: string | null;
  remarks: string | null;
  date: string;

  status: ExpenseStatus;
  receiptUrl: string | null;
  workflowId: string | null;

  createdAt: string;
  updatedAt: string;

  // Relations (optional, replaces old ExpenseWithRelations)
  employee?: ExpenseUser;
  paidBy?: ExpenseUser | null;
  category?: ExpenseCategory;
  approvals?: ExpenseApprovalEntry[];
}

// ─── Form State (Client-only) ────────────────────────────────────────────────

export interface ExpenseFormValues {
  title: string;
  amount: string;
  currencyCode: string;
  categoryId: string;
  description: string;
  paidById: string;
  remarks: string;
  date: string;
  receiptUrl: string | null;
}

export const EXPENSE_FORM_DEFAULTS: ExpenseFormValues = {
  title: "",
  amount: "",
  currencyCode: "",
  categoryId: "",
  description: "",
  paidById: "",
  remarks: "",
  date: new Date().toISOString().split("T")[0],
  receiptUrl: null,
};

// ─── API DTOs ────────────────────────────────────────────────────────────────

export interface CreateExpensePayload {
  title: string;
  amount: number;
  currencyCode: string;
  categoryId: string;
  description?: string;
  paidById?: string;
  remarks?: string;
  date: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export interface SubmitExpenseResponse {
  expense: Expense;
  convertedAmount: number;
  exchangeRateUsed: number;
  companyCurrencyCode: string;
}

// ─── Dashboard Summary ───────────────────────────────────────────────────────

export interface ExpenseSummary {
  draftCount: number;
  draftTotal: number;

  pendingCount: number;
  pendingTotal: number;

  approvedCount: number;
  approvedTotal: number;
}