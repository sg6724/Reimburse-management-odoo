import { auth } from "@/lib/auth";
import { MailDeliveryError, sendNewUserPasswordEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (admin.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id, companyId: admin.companyId },
  });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const previousPasswordHash = user.passwordHash;
  const previousMustChangePassword = user.mustChangePassword;

  await prisma.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });

  try {
    await sendNewUserPasswordEmail(user.email, user.name, tempPassword);
  } catch (error) {
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: previousPasswordHash,
        mustChangePassword: previousMustChangePassword,
      },
    });

    if (error instanceof MailDeliveryError) {
      if (error.code === "SMTP_CONFIG_MISSING") {
        return Response.json(
          {
            error:
              "Email configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.",
          },
          { status: 500 }
        );
      }

      return Response.json(
        { error: "Could not send password email via SMTP. Please check credentials." },
        { status: 502 }
      );
    }

    return Response.json(
      { error: "Could not send password email. Please try again." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
