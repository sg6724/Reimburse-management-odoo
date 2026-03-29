import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  const categories = await prisma.expenseCategory.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(categories);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await request.json();
  if (!name?.trim()) return Response.json({ error: "Name required" }, { status: 400 });

  const category = await prisma.expenseCategory.create({
    data: { companyId: user.companyId, name: name.trim() },
  });

  return Response.json(category, { status: 201 });
}
