/**
 * app/api/expenses/[id]/route.ts
 * Owner: Person B
 *
 * GET    /api/expenses/[id]   — get single expense with approvals
 * PATCH  /api/expenses/[id]   — edit Draft expense (blocked if not DRAFT)
 * DELETE /api/expenses/[id]   — delete Draft expense
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UpdateExpensePayload } from "@/types/expense";

// ─── Shared expense include ───────────────────────────────────────────────────

const EXPENSE_INCLUDE = {
  employee: { select: { id: true, name: true, email: true, role: true } },
  paidBy:   { select: { id: true, name: true, email: true, role: true } },
  category: { select: { id: true, name: true, isActive: true } },
  approvals: {
    orderBy: { createdAt: "asc" as const },
    include: {
      approver: { select: { id: true, name: true, email: true, role: true } },
    },
  },
} as const;

// ─── Helper: load and authorise expense ──────────────────────────────────────

async function getAuthorisedExpense(
  id: string,
  userId: string,
  companyId: string,
  role: string
) {
  const expense = await prisma.expense.findFirst({
    where: {
      id,
      companyId,
      // Employees see only their own; admins/managers see all in company
      ...(role === "EMPLOYEE" ? { employeeId: userId } : {}),
    },
    include: EXPENSE_INCLUDE,
  });

  return expense;
}

// ─── GET /api/expenses/[id] ───────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;
  const { id } = await params;
  const expense = await getAuthorisedExpense(id, userId, companyId, role);

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json({ expense });
}

// ─── PATCH /api/expenses/[id] ─────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;
  const { id } = await params;

  const expense = await getAuthorisedExpense(id, userId, companyId, role);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Business rule: only DRAFT expenses can be edited
  if (expense.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only Draft expenses can be edited" },
      { status: 409 }
    );
  }

  // Employees can only edit their own
  if (role === "EMPLOYEE" && expense.employeeId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as UpdateExpensePayload;

  // Validate amount if provided
  if (body.amount !== undefined && (typeof body.amount !== "number" || body.amount <= 0)) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  // Validate category if provided
  if (body.categoryId) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id: body.categoryId, companyId, isActive: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Invalid or inactive category" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(body.title       !== undefined && { title: body.title }),
      ...(body.amount      !== undefined && { amount: body.amount }),
      ...(body.currencyCode !== undefined && { currencyCode: body.currencyCode }),
      ...(body.categoryId  !== undefined && { categoryId: body.categoryId }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.paidById    !== undefined && { paidById: body.paidById }),
      ...(body.remarks     !== undefined && { remarks: body.remarks }),
      ...(body.date        !== undefined && { date: new Date(body.date) }),
    },
    include: EXPENSE_INCLUDE,
  });

  return NextResponse.json({ expense: updated });
}

// ─── DELETE /api/expenses/[id] ───────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;
  const { id } = await params;

  const expense = await getAuthorisedExpense(id, userId, companyId, role);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (expense.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only Draft expenses can be deleted" },
      { status: 409 }
    );
  }

  if (role === "EMPLOYEE" && expense.employeeId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id } });

  return NextResponse.json({ success: true });
}