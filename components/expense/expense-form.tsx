/**
 * components/expense/expense-form.tsx
 * Owner: Person B
 *
 * Used for both creating a new expense and editing a draft.
 * Read-only when status !== DRAFT (business rule: submitted = locked).
 *
 * Depends on:
 *  - components/ui/* (Person A's primitives — button, input, dropdown, badge)
 *  - components/expense/receipt-upload.tsx
 *  - components/expense/expense-status-badge.tsx
 *  - lib/ocr.ts (via ocr-scanner.tsx)
 *  - hooks/use-expenses.ts (createExpense, updateExpense, submitExpense)
 *  - types/expense.ts
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Expense, ExpenseFormValues, ExpenseCategory } from "@/types/expense";
import { EXPENSE_FORM_DEFAULTS } from "@/types/expense";
import { ExpenseStatus, ExpenseStatusBadge, isExpenseEditable } from "./expense-status-badge";
import { ReceiptUpload } from "./receipt-upload";
import { OcrScanner } from "./ocr-scanner";
import {
  createExpense,
  updateExpense,
  submitExpense,
} from "@/hooks/use-expenses";

// Importing from Person A's ui primitives
// These will exist after A's first PR — adjust import path to match A's barrel export
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExpenseFormProps {
  /** Existing expense for edit mode; undefined = create mode */
  expense?: Expense;
  /** List of active categories from /api/categories */
  categories: ExpenseCategory[];
  /** List of company users for "Paid By" dropdown */
  companyUsers: Array<{ id: string; name: string }>;
  /** List of currency codes e.g. ["USD","EUR","INR",...] */
  currencies: string[];
  /** Company base currency e.g. "USD" */
  companyCurrencyCode: string;
}

export function ExpenseForm({
  expense,
  categories,
  companyUsers,
  currencies,
  companyCurrencyCode,
}: ExpenseFormProps) {
  const router = useRouter();
  const isEdit = !!expense;
  const editable = !expense || isExpenseEditable(expense.status);

  const [form, setForm] = useState<ExpenseFormValues>(() => {
    if (expense) {
      return {
        title:        expense.title,
        amount:       String(expense.amount),
        currencyCode: expense.currencyCode,
        categoryId:   expense.categoryId,
        description:  expense.description ?? "",
        paidById:     expense.paidById ?? "",
        remarks:      expense.remarks ?? "",
        date:         expense.date.split("T")[0],
        receiptUrl:   expense.receiptUrl,
      };
    }
    return { ...EXPENSE_FORM_DEFAULTS, currencyCode: companyCurrencyCode };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormValues, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setField<K extends keyof ExpenseFormValues>(
    key: K,
    value: ExpenseFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ── OCR autofill callback ─────────────────────────────────────────────────
  // OCR returns a category *name* (e.g. "Food"), not a DB id.
  // Resolve it here before merging into form state.
  function handleOcrFill(partial: Partial<ExpenseFormValues>) {
    const resolved = { ...partial };
    if (resolved.categoryId) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === resolved.categoryId!.toLowerCase()
      );
      resolved.categoryId = match?.id ?? "";
    }
    setForm((prev) => ({ ...prev, ...resolved }));
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Partial<Record<keyof ExpenseFormValues, string>> = {};
    if (!form.title.trim())       errs.title       = "Title is required";
    if (!form.amount.trim())      errs.amount      = "Amount is required";
    if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
                                  errs.amount      = "Enter a valid positive amount";
    if (!form.currencyCode)       errs.currencyCode = "Select a currency";
    if (!form.categoryId)         errs.categoryId  = "Select a category";
    if (!form.date)               errs.date        = "Date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save Draft ────────────────────────────────────────────────────────────
  async function handleSaveDraft() {
    if (!validate()) return;
    setIsSaving(true);
    setSubmitError(null);

    try {
      const payload = buildPayload();
      if (isEdit && expense) {
        await updateExpense(expense.id, payload);
      } else {
        const created = await createExpense(payload);
        router.push(`/employee/expenses/${created.id}`);
        return;
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Submit for Approval ───────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    if (!expense) {
      // Need to create first, then submit
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const created = await createExpense(buildPayload());
        await submitExpense(created.id);
        router.push("/employee/expenses");
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to submit");
        setIsSubmitting(false);
      }
      return;
    }

    // Edit mode — save changes then submit
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateExpense(expense.id, buildPayload());
      await submitExpense(expense.id);
      router.push("/employee/expenses");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit");
      setIsSubmitting(false);
    }
  }

  function buildPayload() {
    return {
      title:        form.title.trim(),
      amount:       Number(form.amount),
      currencyCode: form.currencyCode,
      categoryId:   form.categoryId,
      description:  form.description.trim() || undefined,
      paidById:     form.paidById || undefined,
      remarks:      form.remarks.trim() || undefined,
      date:         form.date,
    };
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">
          {isEdit ? "Edit Expense" : "New Expense"}
        </h1>
        {expense && <ExpenseStatusBadge status={expense.status} />}
      </div>

      {/* Read-only notice */}
      {!editable && (
        <div className="mb-6 p-3 rounded-lg bg-[#FEF3DC] border border-[#F0A830]/40 text-sm text-[#B97D10]">
          This expense has been submitted and is read-only.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E4D8] p-6 space-y-5">

        {/* OCR Scanner — only in create/draft mode */}
        {editable && (
          <OcrScanner
            onFill={handleOcrFill}
            expenseId={expense?.id}
            onReceiptUploaded={(url) => setField("receiptUrl", url)}
          />
        )}

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <Field label="Title *" error={errors.title}>
          <Input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g. Client dinner – Mumbai"
            disabled={!editable}
          />
        </Field>

        {/* ── Date ──────────────────────────────────────────────────────── */}
        <Field label="Expense Date *" error={errors.date}>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setField("date", e.target.value)}
            disabled={!editable}
          />
        </Field>

        {/* ── Amount + Currency ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *" error={errors.amount}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              placeholder="0.00"
              disabled={!editable}
            />
          </Field>
          <Field label="Currency *" error={errors.currencyCode}>
            <select
              className={selectClass(!!errors.currencyCode, !editable)}
              value={form.currencyCode}
              onChange={(e) => setField("currencyCode", e.target.value)}
              disabled={!editable}
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── Category ──────────────────────────────────────────────────── */}
        <Field label="Category *" error={errors.categoryId}>
          <select
            className={selectClass(!!errors.categoryId, !editable)}
            value={form.categoryId}
            onChange={(e) => setField("categoryId", e.target.value)}
            disabled={!editable}
          >
            <option value="">Select category</option>
            {categories.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        {/* ── Paid By ───────────────────────────────────────────────────── */}
        <Field label="Paid By">
          <select
            className={selectClass(false, !editable)}
            value={form.paidById}
            onChange={(e) => setField("paidById", e.target.value)}
            disabled={!editable}
          >
            <option value="">Select person (optional)</option>
            {companyUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>

        {/* ── Description ───────────────────────────────────────────────── */}
        <Field label="Description">
          <textarea
            className={textareaClass(!editable)}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Optional details about this expense"
            rows={2}
            disabled={!editable}
          />
        </Field>

        {/* ── Remarks ───────────────────────────────────────────────────── */}
        <Field label="Remarks">
          <textarea
            className={textareaClass(!editable)}
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            placeholder="e.g. Client dinner before product demo"
            rows={2}
            disabled={!editable}
          />
        </Field>

        {/* ── Receipt (read-only view if already attached) ───────────────── */}
        {expense?.receiptUrl && (
          <Field label="Receipt">
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#5E4075] underline hover:opacity-75"
            >
              View attached receipt
            </a>
          </Field>
        )}

        {/* ── Error message ─────────────────────────────────────────────── */}
        {submitError && (
          <p className="text-sm text-[#E05252]">{submitError}</p>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        {editable && (
          <div className="flex items-center gap-3 pt-2">
            {/* Submit for Approval — primary CTA */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isSaving}
              className="bg-[#5E4075] hover:bg-[#4a3260] text-white px-6"
            >
              {isSubmitting ? "Submitting…" : "Submit for Approval"}
            </Button>

            {/* Save Draft */}
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isSaving}
            >
              {isSaving ? "Saving…" : "Save Draft"}
            </Button>

            {/* Cancel */}
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-[#6B7280] hover:text-[#1A1A2E] ml-auto"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[#1A1A2E]">{label}</label>
      {children}
      {error && <p className="text-xs text-[#E05252]">{error}</p>}
    </div>
  );
}

function selectClass(hasError: boolean, disabled: boolean) {
  return [
    "w-full h-10 px-3 rounded-lg border text-sm",
    "focus:outline-none focus:ring-2 focus:ring-[#5E4075]/30",
    hasError
      ? "border-[#E05252] bg-[#FDEAEA]"
      : "border-[#E2E4D8] bg-white",
    disabled ? "opacity-60 cursor-not-allowed bg-[#F8F9ED]" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function textareaClass(disabled: boolean) {
  return [
    "w-full px-3 py-2 rounded-lg border border-[#E2E4D8] text-sm",
    "focus:outline-none focus:ring-2 focus:ring-[#5E4075]/30",
    "resize-none",
    disabled ? "opacity-60 cursor-not-allowed bg-[#F8F9ED]" : "bg-white",
  ]
    .filter(Boolean)
    .join(" ");
}