/**
 * app/api/expenses/[id]/submit/route.ts
 * Owner: Person B
 *
 * POST /api/expenses/[id]/submit
 *
 * Critical business logic:
 *  1. Verify expense is DRAFT and belongs to the requesting employee
 *  2. Fetch the live FX rate (call /api/currencies/convert — Person A's route)
 *  3. Write amountInCompanyCurrency + exchangeRateUsed to the Expense record  ← LOCKED FOREVER
 *  4. Set status → PENDING
 *  5. Capture the currently active ApprovalWorkflow → store workflowId on Expense
 *  6. Create the first ExpenseApproval row(s) (first step in the workflow)
 *  7. Fire Resend email to approver(s) via lib/mail.ts (Person A's helpers)
 *
 * KEY RULE: After this route runs, amountInCompanyCurrency and exchangeRateUsed
 * are NEVER recalculated. All historical views read directly from these DB fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyApprovers } from "@/lib/mail";  // Person A writes template, B calls helper

// ─── POST /api/expenses/[id]/submit ──────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;
  const { id } = await params;

  // Only employees may submit
  if (role !== "EMPLOYEE") {
    return NextResponse.json(
      { error: "Only employees can submit expense claims" },
      { status: 403 }
    );
  }

  // ── Load expense ────────────────────────────────────────────────────────
  const expense = await prisma.expense.findFirst({
    where: { id, companyId, employeeId: userId },
    include: {
      employee: { select: { id: true, name: true, email: true, managerId: true } },
      category: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  if (expense.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only Draft expenses can be submitted" },
      { status: 409 }
    );
  }

  // ── Load company (need base currency) ──────────────────────────────────
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currencyCode: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 500 });
  }

  // ── FX Rate Conversion ──────────────────────────────────────────────────
  //
  // Call the internal currency convert proxy (Person A's /api/currencies/convert).
  // We call it via internal fetch so we reuse Person A's caching/error handling.
  //
  // If the expense is already in company currency, rate = 1.
  let amountInCompanyCurrency: number;
  let exchangeRateUsed: number;

  if (expense.currencyCode === company.currencyCode) {
    amountInCompanyCurrency = expense.amount;
    exchangeRateUsed = 1;
  } else {
    const convertUrl = new URL("/api/currencies/convert", req.url);
    convertUrl.searchParams.set("from", expense.currencyCode);
    convertUrl.searchParams.set("to", company.currencyCode);
    convertUrl.searchParams.set("amount", String(expense.amount));

    const convertRes = await fetch(convertUrl.toString());

    if (!convertRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch exchange rate. Please try again." },
        { status: 502 }
      );
    }

    const convertData = await convertRes.json();
    amountInCompanyCurrency = convertData.convertedAmount;
    exchangeRateUsed = convertData.rate;
  }

  // ── Load active ApprovalWorkflow ────────────────────────────────────────
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: { companyId, isActive: true },
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
        include: {
          approver: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // ── Atomic update: lock FX + set PENDING + create approval rows ─────────
  const updatedExpense = await prisma.$transaction(async (tx) => {
    // 1. Lock rate and submit
    const updated = await tx.expense.update({
      where: { id },
      data: {
        status: "PENDING",
        amountInCompanyCurrency,
        exchangeRateUsed,
        workflowId: workflow?.id ?? null,
      },
    });

    if (!workflow) {
      // No active workflow — auto-approve (admin can configure later)
      await tx.expense.update({
        where: { id },
        data: { status: "APPROVED" },
      });
      return updated;
    }

    // 2. Create first approval request(s)
    //    - If managerApproverFirst → create a manager approval row first
    //    - If sequential → only create step 1
    //    - If parallel → create all steps at once

    const approvalRows: {
      expenseId: string;
      approverId: string;
      workflowStepId: string | null;
      isManagerApproval: boolean;
      status: "PENDING";
    }[] = [];

    if (workflow.managerApproverFirst && expense.employee?.managerId) {
      approvalRows.push({
        expenseId: id,
        approverId: expense.employee.managerId,
        workflowStepId: null,
        isManagerApproval: true,
        status: "PENDING",
      });

      if (!workflow.isSequential) {
        for (const step of workflow.steps) {
          approvalRows.push({
            expenseId: id,
            approverId: step.approverId,
            workflowStepId: step.id,
            isManagerApproval: false,
            status: "PENDING",
          });
        }
      }
    } else {
      if (workflow.isSequential && workflow.steps.length > 0) {
        const firstStep = workflow.steps[0];
        approvalRows.push({
          expenseId: id,
          approverId: firstStep.approverId,
          workflowStepId: firstStep.id,
          isManagerApproval: false,
          status: "PENDING",
        });
      } else {
        for (const step of workflow.steps) {
          approvalRows.push({
            expenseId: id,
            approverId: step.approverId,
            workflowStepId: step.id,
            isManagerApproval: false,
            status: "PENDING",
          });
        }
      }
    }

    if (approvalRows.length > 0) {
      await tx.expenseApproval.createMany({ data: approvalRows });
    }

    return updated;
  });

  // ── Fire email notifications (outside transaction — non-blocking) ────────
  // Person A writes the email templates in lib/mail.ts; we just call the helper.
  try {
    const approvalRecords = await prisma.expenseApproval.findMany({
      where: { expenseId: id, status: "PENDING" },
      include: {
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    await notifyApprovers({
      expense: updatedExpense,
      employee: expense.employee!,
      approvers: approvalRecords.map((a) => a.approver!),
      companyCurrencyCode: company.currencyCode,
    });
  } catch (emailErr) {
    // Email failure should not block the submission
    console.error("[submit] Email notification failed:", emailErr);
  }

  return NextResponse.json({
    expense: updatedExpense,
    convertedAmount: amountInCompanyCurrency,
    exchangeRateUsed,
    companyCurrencyCode: company.currencyCode,
  });
}