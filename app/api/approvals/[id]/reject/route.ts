import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectExpenseApproval } from "@/lib/approval-engine";
import { z } from "zod";

const rejectSchema = z.object({
	comment: z.string().trim().min(1).max(1000),
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
	const parsed = rejectSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "Comment is required" }, { status: 400 });
	}

	try {
		const result = await rejectExpenseApproval(id, user.id, parsed.data.comment);
		return Response.json({
			ok: true,
			decision: result.decision,
			expenseStatus: result.expenseStatus,
			expenseId: result.expense.id,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Rejection failed";
		const status = message === "Forbidden" ? 403 : 400;
		return Response.json({ error: message }, { status });
	}
}
