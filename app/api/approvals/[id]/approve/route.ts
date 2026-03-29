import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveExpenseApproval } from "@/lib/approval-engine";
import { z } from "zod";

const approveSchema = z.object({
	comment: z.string().max(500).optional(),
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
	if (user.role !== "MANAGER" && user.role !== "ADMIN") {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const { id } = await params;
	const body = await request.json().catch(() => ({}));
	const parsed = approveSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "Invalid input" }, { status: 400 });
	}

	try {
		const result = await approveExpenseApproval(id, user.id, parsed.data.comment);
		return Response.json({
			ok: true,
			decision: result.decision,
			expenseStatus: result.expenseStatus,
			expenseId: result.expense.id,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Approval failed";
		const status = message === "Forbidden" ? 403 : 400;
		return Response.json({ error: message }, { status });
	}
}
