/**
 * app/api/expenses/summary/route.ts
 * Owner: Person B
 *
 * GET /api/expenses/summary
 *
 * Returns the three dashboard counter values for the employee:
 *   draftCount / draftTotal         → "To Submit" card
 *   pendingCount / pendingTotal      → "Waiting Approval" card
 *   approvedCount / approvedTotal    → "Approved" card
 *
 * Totals are in the employee's original submitted currency
 * (since a single employee may have multiple currencies, we sum the raw amounts).
 * For approved totals we use amountInCompanyCurrency so it's comparable.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;

  // For simplicity, only employee-scoped summaries are exposed here.
  // Admin-level aggregates would be a separate analytics endpoint.
  if (role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [drafts, pending, approved] = await Promise.all([
    // DRAFT — "To Submit"
    prisma.expense.aggregate({
      where: { companyId, employeeId: userId, status: "DRAFT" },
      _count: { id: true },
      _sum: { amount: true },
    }),
    // PENDING — "Waiting Approval"
    prisma.expense.aggregate({
      where: { companyId, employeeId: userId, status: "PENDING" },
      _count: { id: true },
      _sum: { amount: true },
    }),
    // APPROVED — use company currency total so it's meaningful
    prisma.expense.aggregate({
      where: { companyId, employeeId: userId, status: "APPROVED" },
      _count: { id: true },
      _sum: { amountInCompanyCurrency: true },
    }),
  ]);

  return NextResponse.json({
    draftCount:    drafts._count.id ?? 0,
    draftTotal:    drafts._sum.amount ?? 0,

    pendingCount:  pending._count.id ?? 0,
    pendingTotal:  pending._sum.amount ?? 0,

    approvedCount: approved._count.id ?? 0,
    approvedTotal: approved._sum.amountInCompanyCurrency ?? 0,
  });
}