import { auth } from "@/lib/auth";
import { MailDeliveryError, sendNewUserPasswordEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

  try {
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

    try {
      await sendNewUserPasswordEmail(email, name, tempPassword);
    } catch (error) {
      await prisma.user.delete({ where: { id: newUser.id } });

      if (error instanceof MailDeliveryError) {
        if (error.code === "SMTP_CONFIG_MISSING") {
          return Response.json(
            {
              error:
                "User was not created because email configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.",
            },
            { status: 500 }
          );
        }

        return Response.json(
          { error: "User was not created because welcome email could not be sent via SMTP." },
          { status: 502 }
        );
      }

      return Response.json(
        { error: "User was not created because welcome email could not be sent." },
        { status: 502 }
      );
    }

    return Response.json(newUser, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }

    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}
