import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const activateSchema = z.object({
	isActive: z.boolean().optional().default(true),
});

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const user = await prisma.user.findUnique({ where: { id: session.user.id } });
	if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
	if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

	const { id } = await params;
	const body = await request.json().catch(() => ({}));
	const parsed = activateSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "Invalid input" }, { status: 400 });
	}

	const rule = await prisma.approvalWorkflow.findFirst({
		where: { id, companyId: user.companyId },
	});
	if (!rule) return Response.json({ error: "Rule not found" }, { status: 404 });

	const updated = await prisma.$transaction(async (tx) => {
		if (parsed.data.isActive) {
			// Deactivate every other rule in the company first (one active rule at a time)
			await tx.approvalWorkflow.updateMany({
				where: { companyId: user.companyId, isActive: true, NOT: { id } },
				data: { isActive: false },
			});
		}

		return tx.approvalWorkflow.update({
			where: { id },
			data: { isActive: parsed.data.isActive },
			include: {
				steps: {
					include: { approver: { select: { id: true, name: true } } },
					orderBy: { stepOrder: "asc" },
				},
			},
		});
	});

	return Response.json(updated);
}
