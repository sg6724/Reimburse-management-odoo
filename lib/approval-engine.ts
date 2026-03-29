import {
	ApprovalDecision,
	type ApprovalWorkflow,
	type ApprovalWorkflowStep,
	type Expense,
	Prisma,
	type User,
	WorkflowRuleType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
	sendExpenseApprovedEmail,
	sendExpenseFinalApprovedEmail,
	sendExpenseRejectedEmail,
	sendExpenseSubmittedEmail,
} from "@/lib/mail";

type Tx = Prisma.TransactionClient;

type ApprovalWithRelations = Prisma.ExpenseApprovalGetPayload<{
	include: {
		approver: true;
		workflowStep: true;
		expense: {
			include: {
				employee: true;
				company: true;
				workflow: {
					include: {
						steps: true;
					};
				};
			};
		};
	};
}>;

function getThreshold(workflow: ApprovalWorkflow): number {
	return Math.max(1, Math.min(100, workflow.percentageThreshold ?? 100));
}

function isApprovalActionable(
	approval: { id: string; status: ApprovalDecision; isManagerApproval: boolean; workflowStepId: string | null },
	allApprovals: Array<{
		id: string;
		status: ApprovalDecision;
		isManagerApproval: boolean;
		workflowStepId: string | null;
	}>,
	workflow: (ApprovalWorkflow & { steps: ApprovalWorkflowStep[] }) | null
): boolean {
	if (approval.status !== ApprovalDecision.PENDING) return false;
	if (!workflow || !workflow.isSequential) return true;

	if (approval.isManagerApproval) return true;

	if (workflow.managerApproverFirst) {
		const managerApproval = allApprovals.find((a) => a.isManagerApproval);
		if (managerApproval && managerApproval.status !== ApprovalDecision.APPROVED) return false;
	}

	const currentStep = workflow.steps.find((s) => s.id === approval.workflowStepId);
	if (!currentStep) return true;

	const priorStepIds = workflow.steps
		.filter((s) => s.stepOrder < currentStep.stepOrder)
		.map((s) => s.id);

	return allApprovals
		.filter((a) => priorStepIds.includes(a.workflowStepId ?? ""))
		.every((a) => a.status === ApprovalDecision.APPROVED);
}

function resolveExpenseStatus(
	workflow: (ApprovalWorkflow & { steps: ApprovalWorkflowStep[] }) | null,
	approvals: Array<{ approverId: string; status: ApprovalDecision }>
): "PENDING" | "APPROVED" | "REJECTED" {
	const total = approvals.length;
	const approved = approvals.filter((a) => a.status === ApprovalDecision.APPROVED).length;
	const rejected = approvals.filter((a) => a.status === ApprovalDecision.REJECTED).length;

	if (!workflow) {
		if (total === 0) return "APPROVED";
		if (rejected > 0) return "REJECTED";
		return approved === total ? "APPROVED" : "PENDING";
	}

	if (workflow.ruleType === WorkflowRuleType.ALL) {
		if (rejected > 0) return "REJECTED";
		if (approved === total && total > 0) return "APPROVED";
		return "PENDING";
	}

	if (workflow.ruleType === WorkflowRuleType.PERCENTAGE) {
		const threshold = getThreshold(workflow);
		const approvedPct = total > 0 ? (approved / total) * 100 : 0;
		const possibleMaxPct = total > 0 ? ((approved + (total - approved - rejected)) / total) * 100 : 0;

		if (approvedPct >= threshold) return "APPROVED";
		if (possibleMaxPct < threshold) return "REJECTED";
		return "PENDING";
	}

	if (workflow.ruleType === WorkflowRuleType.SPECIFIC_APPROVER) {
		const specificApproverId = workflow.specificApproverId;
		const specific = approvals.find((a) => a.approverId === specificApproverId);
		if (!specific) return "PENDING";
		if (specific.status === ApprovalDecision.APPROVED) return "APPROVED";
		if (specific.status === ApprovalDecision.REJECTED) return "REJECTED";
		return "PENDING";
	}

	const threshold = getThreshold(workflow);
	const approvedPct = total > 0 ? (approved / total) * 100 : 0;
	const possibleMaxPct = total > 0 ? ((approved + (total - approved - rejected)) / total) * 100 : 0;
	const specific = approvals.find((a) => a.approverId === workflow.specificApproverId);

	if (specific?.status === ApprovalDecision.APPROVED || approvedPct >= threshold) return "APPROVED";
	if (specific?.status === ApprovalDecision.REJECTED && possibleMaxPct < threshold) return "REJECTED";
	if (possibleMaxPct < threshold) return "REJECTED";
	return "PENDING";
}

async function notifySubmitted(
	expense: Expense & { employee: User; company: { currencyCode: string } },
	approvals: Array<{ approver: User }>
): Promise<void> {
	const amount = formatCurrency(expense.amountInCompanyCurrency, expense.company.currencyCode);

	await Promise.all(
		approvals.map((a) =>
			sendExpenseSubmittedEmail(
				[a.approver.email],
				a.approver.name,
				expense.employee.name,
				expense.title,
				amount
			)
		)
	);
}

async function notifyNextSequentialApprovers(tx: Tx, expenseId: string): Promise<void> {
	const expense = await tx.expense.findUnique({
		where: { id: expenseId },
		include: {
			employee: true,
			company: { select: { currencyCode: true } },
			workflow: { include: { steps: true } },
			approvals: {
				where: { status: ApprovalDecision.PENDING },
				include: { approver: true },
			},
		},
	});

	if (!expense || !expense.workflow || !expense.workflow.isSequential || expense.status !== "PENDING") {
		return;
	}

	const actionable = expense.approvals.filter((a) =>
		isApprovalActionable(
			{
				id: a.id,
				status: a.status,
				isManagerApproval: a.isManagerApproval,
				workflowStepId: a.workflowStepId,
			},
			expense.approvals.map((item) => ({
				id: item.id,
				status: item.status,
				isManagerApproval: item.isManagerApproval,
				workflowStepId: item.workflowStepId,
			})),
			expense.workflow
		)
	);

	if (actionable.length === 0) return;
	await notifySubmitted(expense, actionable);
}

export async function initializeExpenseApprovals(expenseId: string): Promise<void> {
	const expense = await prisma.expense.findUnique({
		where: { id: expenseId },
		include: {
			employee: true,
			company: true,
			workflow: {
				include: {
					steps: {
						orderBy: { stepOrder: "asc" },
					},
				},
			},
		},
	});

	if (!expense || expense.status !== "PENDING") return;
	if (!expense.workflow) {
		await prisma.expense.update({ where: { id: expense.id }, data: { status: "APPROVED" } });
		await sendExpenseFinalApprovedEmail(expense.employee.email, expense.employee.name, expense.title);
		return;
	}

	const existing = await prisma.expenseApproval.count({ where: { expenseId: expense.id } });
	if (existing > 0) return;

	const records: Prisma.ExpenseApprovalCreateManyInput[] = [];

	if (expense.workflow.managerApproverFirst && expense.employee.managerId) {
		records.push({
			expenseId: expense.id,
			approverId: expense.employee.managerId,
			isManagerApproval: true,
			status: ApprovalDecision.PENDING,
		});
	}

	for (const step of expense.workflow.steps) {
		records.push({
			expenseId: expense.id,
			approverId: step.approverId,
			workflowStepId: step.id,
			isManagerApproval: false,
			status: ApprovalDecision.PENDING,
		});
	}

	if (records.length === 0) {
		await prisma.expense.update({ where: { id: expense.id }, data: { status: "APPROVED" } });
		await sendExpenseFinalApprovedEmail(expense.employee.email, expense.employee.name, expense.title);
		return;
	}

	await prisma.expenseApproval.createMany({ data: records });

	const pending = await prisma.expenseApproval.findMany({
		where: { expenseId: expense.id, status: ApprovalDecision.PENDING },
		include: { approver: true },
	});

	const initial = expense.workflow.isSequential
		? pending.filter((a) =>
				isApprovalActionable(
					{
						id: a.id,
						status: a.status,
						isManagerApproval: a.isManagerApproval,
						workflowStepId: a.workflowStepId,
					},
					pending.map((item) => ({
						id: item.id,
						status: item.status,
						isManagerApproval: item.isManagerApproval,
						workflowStepId: item.workflowStepId,
					})),
					expense.workflow
				)
			)
		: pending;

	await notifySubmitted(expense, initial);
}

export async function getManagerApprovals(managerId: string, companyId: string) {
	const approvals = await prisma.expenseApproval.findMany({
		where: {
			approverId: managerId,
			expense: { companyId },
		},
		include: {
			approver: true,
			workflowStep: true,
			expense: {
				include: {
					employee: { select: { id: true, name: true, email: true } },
					category: { select: { id: true, name: true } },
					company: { select: { currencyCode: true } },
					workflow: { include: { steps: true } },
					approvals: {
						select: {
							id: true,
							status: true,
							isManagerApproval: true,
							workflowStepId: true,
						},
					},
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return approvals.map((approval) => ({
		...approval,
		canAct:
			approval.expense.status === "PENDING" &&
			isApprovalActionable(
				{
					id: approval.id,
					status: approval.status,
					isManagerApproval: approval.isManagerApproval,
					workflowStepId: approval.workflowStepId,
				},
				approval.expense.approvals,
				approval.expense.workflow
			),
	}));
}

async function processDecision(
	tx: Tx,
	approval: ApprovalWithRelations,
	decision: ApprovalDecision,
	comment?: string
) {
	await tx.expenseApproval.update({
		where: { id: approval.id },
		data: {
			status: decision,
			comment: comment ?? null,
			decidedAt: new Date(),
		},
	});

	const updatedApprovals = await tx.expenseApproval.findMany({
		where: { expenseId: approval.expenseId },
		select: { approverId: true, status: true },
	});

	const nextStatus = resolveExpenseStatus(approval.expense.workflow, updatedApprovals);

	if (nextStatus !== "PENDING") {
		await tx.expense.update({ where: { id: approval.expenseId }, data: { status: nextStatus } });
	}

	return nextStatus;
}

export async function approveExpenseApproval(
	approvalId: string,
	approverId: string,
	comment?: string
) {
	const result = await prisma.$transaction(async (tx) => {
		const approval = await tx.expenseApproval.findUnique({
			where: { id: approvalId },
			include: {
				approver: true,
				workflowStep: true,
				expense: {
					include: {
						employee: true,
						company: true,
						workflow: { include: { steps: true } },
						approvals: {
							select: {
								id: true,
								status: true,
								isManagerApproval: true,
								workflowStepId: true,
							},
						},
					},
				},
			},
		});

		if (!approval) throw new Error("Approval not found");
		if (approval.approverId !== approverId) throw new Error("Forbidden");
		if (approval.status !== ApprovalDecision.PENDING) throw new Error("Approval already decided");
		if (approval.expense.status !== "PENDING") throw new Error("Expense is no longer pending");

		const canAct = isApprovalActionable(
			{
				id: approval.id,
				status: approval.status,
				isManagerApproval: approval.isManagerApproval,
				workflowStepId: approval.workflowStepId,
			},
			approval.expense.approvals,
			approval.expense.workflow
		);
		if (!canAct) throw new Error("This approval is not actionable yet");

		const expenseStatus = await processDecision(tx, approval, ApprovalDecision.APPROVED, comment);
		return {
			expenseStatus,
			expense: approval.expense,
			decision: ApprovalDecision.APPROVED,
		};
	});

	await sendExpenseApprovedEmail(
		result.expense.employee.email,
		result.expense.employee.name,
		result.expense.title
	);

	if (result.expenseStatus === "APPROVED") {
		await sendExpenseFinalApprovedEmail(
			result.expense.employee.email,
			result.expense.employee.name,
			result.expense.title
		);
	}

	if (result.expenseStatus === "PENDING") {
		await notifyNextSequentialApprovers(prisma as unknown as Tx, result.expense.id);
	}

	return result;
}

export async function rejectExpenseApproval(
	approvalId: string,
	approverId: string,
	comment: string
) {
	if (!comment.trim()) throw new Error("Rejection comment is required");

	const result = await prisma.$transaction(async (tx) => {
		const approval = await tx.expenseApproval.findUnique({
			where: { id: approvalId },
			include: {
				approver: true,
				workflowStep: true,
				expense: {
					include: {
						employee: true,
						company: true,
						workflow: { include: { steps: true } },
						approvals: {
							select: {
								id: true,
								status: true,
								isManagerApproval: true,
								workflowStepId: true,
							},
						},
					},
				},
			},
		});

		if (!approval) throw new Error("Approval not found");
		if (approval.approverId !== approverId) throw new Error("Forbidden");
		if (approval.status !== ApprovalDecision.PENDING) throw new Error("Approval already decided");
		if (approval.expense.status !== "PENDING") throw new Error("Expense is no longer pending");

		const canAct = isApprovalActionable(
			{
				id: approval.id,
				status: approval.status,
				isManagerApproval: approval.isManagerApproval,
				workflowStepId: approval.workflowStepId,
			},
			approval.expense.approvals,
			approval.expense.workflow
		);
		if (!canAct) throw new Error("This approval is not actionable yet");

		const expenseStatus = await processDecision(tx, approval, ApprovalDecision.REJECTED, comment);
		return {
			expenseStatus,
			expense: approval.expense,
			decision: ApprovalDecision.REJECTED,
			comment,
		};
	});

	await sendExpenseRejectedEmail(
		result.expense.employee.email,
		result.expense.employee.name,
		result.expense.title,
		result.comment
	);

	return result;
}
