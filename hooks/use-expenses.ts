/**
 * hooks/use-expenses.ts
 * Owner: Person B
 *
 * React hooks for expense data fetching.
 * Uses the native fetch API with a lightweight SWR-style pattern
 * (can swap to SWR or React Query later without touching callers).
 *
 * Exported hooks:
 *  useExpenses()          — list of all expenses for the current user
 *  useExpense(id)         — single expense with approvals
 *  useExpenseSummary()    — dashboard counters (Draft / Pending / Approved totals)
 *
 * Exported mutations (plain async functions, not hooks):
 *  createExpense()
 *  updateExpense()
 *  submitExpense()
 *  attachReceipt()
 *  deleteExpense()
 */

"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  Expense,
  ExpenseSummary,
  CreateExpensePayload,
  UpdateExpensePayload,
  SubmitExpenseResponse,
} from "@/types/expense";

// ─── Generic async state ──────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

type AsyncAction<T> =
  | { type: "loading" }
  | { type: "success"; payload: T }
  | { type: "error"; payload: string };

function asyncReducer<T>(
  state: AsyncState<T>,
  action: AsyncAction<T>
): AsyncState<T> {
  switch (action.type) {
    case "loading":
      return { ...state, isLoading: true, error: null };
    case "success":
      return { data: action.payload, isLoading: false, error: null };
    case "error":
      return { ...state, isLoading: false, error: action.payload };
  }
}

function useAsync<T>(initialData: T | null = null) {
  const [state, dispatch] = useReducer(asyncReducer<T>, {
    data: initialData,
    isLoading: false,
    error: null,
  });

  const run = useCallback(async (promise: Promise<T>) => {
    dispatch({ type: "loading" });
    try {
      const data = await promise;
      dispatch({ type: "success", payload: data });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      dispatch({ type: "error", payload: message });
      throw err;
    }
  }, []);

  return { ...state, run };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── useExpenses ──────────────────────────────────────────────────────────────

interface UseExpensesOptions {
  status?: string;   // filter by status
  page?: number;
  limit?: number;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const { status, page = 1, limit = 20 } = options;
  const { data, isLoading, error, run } = useAsync<Expense[]>([]);

  // track whether mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetch = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));

    return run(
      apiFetch<{ expenses: Expense[]; total: number }>(`/api/expenses?${params.toString()}`)
        .then((r) => r.expenses)
    );
  }, [status, page, limit, run]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    expenses: data ?? [],
    isLoading,
    error,
    refetch: fetch,
  };
}

// ─── useExpense (single) ──────────────────────────────────────────────────────

export function useExpense(id: string | null) {
  const { data, isLoading, error, run } = useAsync<Expense>(null);

  const fetch = useCallback(() => {
    if (!id) return Promise.resolve(null);
    return run(
      apiFetch<{ expense: Expense }>(`/api/expenses/${id}`)
        .then((r) => r.expense)
    );
  }, [id, run]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    expense: data,
    isLoading,
    error,
    refetch: fetch,
  };
}

// ─── useExpenseSummary ────────────────────────────────────────────────────────

export function useExpenseSummary() {
  const { data, isLoading, error, run } = useAsync<ExpenseSummary>(null);

  useEffect(() => {
    run(apiFetch<ExpenseSummary>("/api/expenses/summary"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    summary: data,
    isLoading,
    error,
  };
}

// ─── Mutations (plain async functions) ───────────────────────────────────────

/** Create a new Draft expense */
export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  const r = await apiFetch<{ expense: Expense }>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return r.expense;
}

/** Update a Draft expense (only allowed while status === DRAFT) */
export async function updateExpense(id: string, payload: UpdateExpensePayload): Promise<Expense> {
  const r = await apiFetch<{ expense: Expense }>(`/api/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return r.expense;
}

/**
 * Submit a Draft → PENDING.
 * Server locks the FX rate, writes amountInCompanyCurrency + exchangeRateUsed.
 * After this, the expense is read-only for the employee.
 */
export async function submitExpense(id: string): Promise<SubmitExpenseResponse> {
  return apiFetch<SubmitExpenseResponse>(`/api/expenses/${id}/submit`, {
    method: "POST",
  });
}

/** Attach a receipt image to a Draft expense */
export async function attachReceipt(
  id: string,
  file: File
): Promise<{ receiptUrl: string }> {
  const formData = new FormData();
  formData.append("receipt", file);

  const res = await fetch(`/api/expenses/${id}/attach`, {
    method: "POST",
    body: formData, // no Content-Type header — browser sets multipart boundary
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Upload failed: ${res.status}`);
  }

  return res.json();
}

/** Delete a Draft expense (DRAFT only — server enforces) */
export async function deleteExpense(id: string): Promise<void> {
  await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
}