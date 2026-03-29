/**
 * expense-status-badge.tsx
 * Owner: Person B
 *
 * Exports:
 *  - ExpenseStatus enum  ← Person C imports this too (do NOT redefine elsewhere)
 *  - ExpenseStatusBadge component
 *
 * Design tokens match PRD Section 7:
 *  DRAFT           → muted/neutral
 *  PENDING         → warning  #F0A830
 *  APPROVED        → success  #4CAF7C
 *  REJECTED        → danger   #E05252
 */

import React from "react";

// ─── Enum ────────────────────────────────────────────────────────────────────
// Mirrors Prisma's ExpenseStatus enum exactly.
// Everyone imports from here — never redefine.

export enum ExpenseStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

// ─── Display helpers ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; className: string }
> = {
  [ExpenseStatus.DRAFT]: {
    label: "Draft",
    className:
      "bg-[#F0F1E6] text-[#6B7280] border border-[#E2E4D8]",
  },
  [ExpenseStatus.PENDING]: {
    label: "Waiting Approval",
    className:
      "bg-[#FEF3DC] text-[#B97D10] border border-[#F0A830]/40",
  },
  [ExpenseStatus.APPROVED]: {
    label: "Approved",
    className:
      "bg-[#E8F8F0] text-[#2E7D52] border border-[#4CAF7C]/40",
  },
  [ExpenseStatus.REJECTED]: {
    label: "Rejected",
    className:
      "bg-[#FDEAEA] text-[#B83232] border border-[#E05252]/40",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus | string;
  className?: string;
}

export function ExpenseStatusBadge({
  status,
  className = "",
}: ExpenseStatusBadgeProps) {
  const config =
    STATUS_CONFIG[status as ExpenseStatus] ?? STATUS_CONFIG[ExpenseStatus.DRAFT];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-0.5
        rounded-full text-xs font-medium
        whitespace-nowrap
        ${config.className}
        ${className}
      `}
    >
      <StatusDot status={status as ExpenseStatus} />
      {config.label}
    </span>
  );
}

// Small coloured dot inside the badge
function StatusDot({ status }: { status: ExpenseStatus }) {
  const dotColor: Record<ExpenseStatus, string> = {
    [ExpenseStatus.DRAFT]: "bg-[#6B7280]",
    [ExpenseStatus.PENDING]: "bg-[#F0A830]",
    [ExpenseStatus.APPROVED]: "bg-[#4CAF7C]",
    [ExpenseStatus.REJECTED]: "bg-[#E05252]",
  };

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor[status] ?? "bg-[#6B7280]"}`}
      aria-hidden="true"
    />
  );
}

// ─── Utility: is the expense still editable? ─────────────────────────────────
// Centralise this check so both B (form) and C (approval view) agree.

export function isExpenseEditable(status: ExpenseStatus | string): boolean {
  return status === ExpenseStatus.DRAFT;
}

// ─── Utility: human-readable label without rendering the full badge ───────────

export function getStatusLabel(status: ExpenseStatus | string): string {
  return STATUS_CONFIG[status as ExpenseStatus]?.label ?? status;
}