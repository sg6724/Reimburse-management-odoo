import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendNewUserPasswordEmail } from "@/lib/mail";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    include: { manager: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(users);
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
  managerId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (admin.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const { name, email, role, managerId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: "Email already in use" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const newUser = await prisma.user.create({
    data: {
      companyId: admin.companyId,
      name,
      email,
      passwordHash,
      role,
      managerId: managerId ?? null,
      mustChangePassword: true,
    },
  });

  await sendNewUserPasswordEmail(email, name, tempPassword);

  return Response.json(newUser, { status: 201 });
}
