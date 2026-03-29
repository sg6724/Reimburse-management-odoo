/**
 * app/api/expenses/route.ts
 * Owner: Person B
 *
 * GET  /api/expenses          — Employee: own expenses list  |  Admin: all expenses
 * POST /api/expenses          — Employee: create a new Draft expense
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";       // Person A ships this
import { prisma } from "@/lib/prisma";   // Person A ships this
import type { CreateExpensePayload } from "@/types/expense";

import type { ExpenseStatus as PrismaExpenseStatus } from "@prisma/client";

// ─── GET /api/expenses ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status") ?? undefined;
  // Cast to Prisma enum — only accept valid values, ignore anything else
  const VALID_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const;
  const status = VALID_STATUSES.includes(rawStatus as any)
    ? (rawStatus as PrismaExpenseStatus)
    : undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  // Admins see all company expenses; employees see only their own
  const where = {
    companyId,
    ...(role === "EMPLOYEE" ? { employeeId: userId } : {}),
    ...(status ? { status } : {}),
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { id: true, name: true, email: true, role: true } },
        paidBy:   { select: { id: true, name: true, email: true, role: true } },
        category: { select: { id: true, name: true, isActive: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return NextResponse.json({ expenses, total, page, limit });
}

// ─── POST /api/expenses ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;

  // Only employees may submit expense claims
  if (role !== "EMPLOYEE") {
    return NextResponse.json(
      { error: "Only employees can create expense claims" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as CreateExpensePayload;

  // ── Validate required fields ─────────────────────────────────────────────
  const required: (keyof CreateExpensePayload)[] = [
    "title",
    "amount",
    "currencyCode",
    "categoryId",
    "date",
  ];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  if (typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  // ── Verify category belongs to this company ──────────────────────────────
  const category = await prisma.expenseCategory.findFirst({
    where: { id: body.categoryId, companyId, isActive: true },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Invalid or inactive category" },
      { status: 400 }
    );
  }

  // ── Verify paidById is in the same company (if provided) ─────────────────
  if (body.paidById) {
    const paidByUser = await prisma.user.findFirst({
      where: { id: body.paidById, companyId },
    });
    if (!paidByUser) {
      return NextResponse.json(
        { error: "Invalid paidById user" },
        { status: 400 }
      );
    }
  }

  const expense = await prisma.expense.create({
    data: {
      companyId,
      employeeId: userId,
      title: body.title,
      amount: body.amount,
      currencyCode: body.currencyCode,
      amountInCompanyCurrency: 0,   // set at submission time (Step 6)
      exchangeRateUsed: null,        // set at submission time
      categoryId: body.categoryId,
      description: body.description ?? null,
      paidById: body.paidById ?? null,
      remarks: body.remarks ?? null,
      date: new Date(body.date),
      status: "DRAFT",
    },
    include: {
      employee: { select: { id: true, name: true, email: true, role: true } },
      category: { select: { id: true, name: true, isActive: true } },
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}