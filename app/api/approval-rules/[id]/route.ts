import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkflowRuleType } from "@prisma/client";
import { z } from "zod";

const stepSchema = z.object({
	approverId: z.string().min(1),
	label: z.string().trim().min(1).max(120).optional(),
});

const patchRuleSchema = z.object({
	name: z.string().trim().min(2).max(120).optional(),
	isActive: z.boolean().optional(),
	isSequential: z.boolean().optional(),
	managerApproverFirst: z.boolean().optional(),
	ruleType: z.nativeEnum(WorkflowRuleType).optional(),
	percentageThreshold: z.number().int().min(1).max(100).nullable().optional(),
	specificApproverId: z.string().nullable().optional(),
	steps: z.array(stepSchema).optional(),
});

async function getAdminContext() {
	const session = await auth();
	if (!session?.user?.id) return { error: "Unauthorized", status: 401 as const };

	const user = await prisma.user.findUnique({ where: { id: session.user.id } });
	if (!user) return { error: "Unauthorized", status: 401 as const };
	if (user.role !== "ADMIN") return { error: "Forbidden", status: 403 as const };

	return { user };
}

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const ctx = await getAdminContext();
	if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

	const { id } = await params;
	const rule = await prisma.approvalWorkflow.findFirst({
		where: { id, companyId: ctx.user.companyId },
		include: {
			specificApprover: { select: { id: true, name: true } },
			steps: {
				include: { approver: { select: { id: true, name: true } } },
				orderBy: { stepOrder: "asc" },
			},
		},
	});

	if (!rule) return Response.json({ error: "Rule not found" }, { status: 404 });
	return Response.json(rule);
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const ctx = await getAdminContext();
	if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

	const { id } = await params;
	const body = await request.json().catch(() => null);
	const parsed = patchRuleSchema.safeParse(body);
	if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

	const existing = await prisma.approvalWorkflow.findFirst({
		where: { id, companyId: ctx.user.companyId },
		include: { steps: true },
	});
	if (!existing) return Response.json({ error: "Rule not found" }, { status: 404 });

	const data = parsed.data;
	const nextSteps = data.steps ?? existing.steps.map((s) => ({ approverId: s.approverId, label: s.label }));
	const distinctApproverIds = [...new Set(nextSteps.map((s) => s.approverId))];

	const specificApproverId = data.specificApproverId !== undefined
		? data.specificApproverId
		: existing.specificApproverId;

	if (specificApproverId && !distinctApproverIds.includes(specificApproverId)) {
		return Response.json(
			{ error: "Specific approver must be included in steps" },
			{ status: 400 }
		);
	}

	const approverCount = await prisma.user.count({
		where: {
			companyId: ctx.user.companyId,
			id: { in: distinctApproverIds },
		},
	});
	if (approverCount !== distinctApproverIds.length) {
		return Response.json({ error: "One or more approvers are invalid" }, { status: 400 });
	}

	const updated = await prisma.$transaction(async (tx) => {
		if (data.isActive === true) {
			await tx.approvalWorkflow.updateMany({
				where: { companyId: ctx.user.companyId, isActive: true, NOT: { id } },
				data: { isActive: false },
			});
		}

		if (data.steps) {
			await tx.approvalWorkflowStep.deleteMany({ where: { workflowId: id } });
		}

		return tx.approvalWorkflow.update({
			where: { id },
			data: {
				...(data.name !== undefined && { name: data.name }),
				...(data.isActive !== undefined && { isActive: data.isActive }),
				...(data.isSequential !== undefined && { isSequential: data.isSequential }),
				...(data.managerApproverFirst !== undefined && {
					managerApproverFirst: data.managerApproverFirst,
				}),
				...(data.ruleType !== undefined && { ruleType: data.ruleType }),
				...(data.percentageThreshold !== undefined && {
					percentageThreshold: data.percentageThreshold,
				}),
				...(data.specificApproverId !== undefined && {
					specificApproverId: data.specificApproverId,
				}),
				...(data.steps && {
					steps: {
						create: data.steps.map((step, index) => ({
							approverId: step.approverId,
							stepOrder: index + 1,
							label: step.label?.trim() || `Step ${index + 1}`,
						})),
					},
				}),
			},
			include: {
				specificApprover: { select: { id: true, name: true } },
				steps: {
					include: { approver: { select: { id: true, name: true } } },
					orderBy: { stepOrder: "asc" },
				},
			},
		});
	});

	return Response.json(updated);
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const ctx = await getAdminContext();
	if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status });

	const { id } = await params;
	const rule = await prisma.approvalWorkflow.findFirst({
		where: { id, companyId: ctx.user.companyId },
	});

	if (!rule) return Response.json({ error: "Rule not found" }, { status: 404 });
	if (rule.isActive) {
		return Response.json({ error: "Deactivate rule before deleting" }, { status: 409 });
	}

	const inUse = await prisma.expense.count({ where: { workflowId: id } });
	if (inUse > 0) {
		return Response.json(
			{ error: "Rule is in use by historical expenses and cannot be deleted" },
			{ status: 409 }
		);
	}

	await prisma.approvalWorkflow.delete({ where: { id } });
	return Response.json({ ok: true });
}
