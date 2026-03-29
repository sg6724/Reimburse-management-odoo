import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkflowRuleType } from "@prisma/client";
import { z } from "zod";

const stepSchema = z.object({
	approverId: z.string().min(1),
	label: z.string().trim().min(1).max(120).optional(),
});

const createRuleSchema = z.object({
	name: z.string().trim().min(2).max(120),
	isActive: z.boolean().optional().default(false),
	isSequential: z.boolean().optional().default(false),
	managerApproverFirst: z.boolean().optional().default(false),
	ruleType: z.nativeEnum(WorkflowRuleType).optional().default(WorkflowRuleType.ALL),
	percentageThreshold: z.number().int().min(1).max(100).nullable().optional(),
	specificApproverId: z.string().nullable().optional(),
	steps: z.array(stepSchema).default([]),
});

export async function GET() {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const user = await prisma.user.findUnique({ where: { id: session.user.id } });
	if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
	if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

	const rules = await prisma.approvalWorkflow.findMany({
		where: { companyId: user.companyId },
		include: {
			specificApprover: { select: { id: true, name: true } },
			steps: {
				include: { approver: { select: { id: true, name: true } } },
				orderBy: { stepOrder: "asc" },
			},
		},
		orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
	});

	return Response.json(rules);
}

export async function POST(request: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const user = await prisma.user.findUnique({ where: { id: session.user.id } });
	if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
	if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

	const body = await request.json().catch(() => null);
	const parsed = createRuleSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "Invalid input" }, { status: 400 });
	}

	const data = parsed.data;
	const distinctApproverIds = [...new Set(data.steps.map((s) => s.approverId))];

	if (data.specificApproverId && !distinctApproverIds.includes(data.specificApproverId)) {
		return Response.json(
			{ error: "Specific approver must be included in steps" },
			{ status: 400 }
		);
	}

	const approverCount = await prisma.user.count({
		where: {
			companyId: user.companyId,
			id: { in: distinctApproverIds },
		},
	});
	if (approverCount !== distinctApproverIds.length) {
		return Response.json({ error: "One or more approvers are invalid" }, { status: 400 });
	}

	const created = await prisma.$transaction(async (tx) => {
		if (data.isActive) {
			await tx.approvalWorkflow.updateMany({
				where: { companyId: user.companyId, isActive: true },
				data: { isActive: false },
			});
		}

		return tx.approvalWorkflow.create({
			data: {
				companyId: user.companyId,
				name: data.name,
				isActive: data.isActive,
				isSequential: data.isSequential,
				managerApproverFirst: data.managerApproverFirst,
				ruleType: data.ruleType,
				percentageThreshold: data.percentageThreshold ?? null,
				specificApproverId: data.specificApproverId ?? null,
				steps: {
					create: data.steps.map((step, index) => ({
						approverId: step.approverId,
						stepOrder: index + 1,
						label: step.label?.trim() || `Step ${index + 1}`,
					})),
				},
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

	return Response.json(created, { status: 201 });
}
