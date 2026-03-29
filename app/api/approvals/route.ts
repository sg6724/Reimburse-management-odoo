import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagerApprovals } from "@/lib/approval-engine";

export async function GET() {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const user = await prisma.user.findUnique({ where: { id: session.user.id } });
	if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
	if (user.role !== "MANAGER" && user.role !== "ADMIN") {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const approvals = await getManagerApprovals(user.id, user.companyId);
	return Response.json(approvals);
}
