import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { MailDeliveryError, sendPasswordResetEmail } from "@/lib/mail";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return Response.json(
      { error: "No account found. Please sign up first.", signupRequired: true },
      { status: 404 }
    );
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const previousPasswordHash = user.passwordHash;
  const previousMustChangePassword = user.mustChangePassword;

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: true },
  });

  try {
    await sendPasswordResetEmail(user.email, user.name, tempPassword);
  } catch (error) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: previousPasswordHash,
        mustChangePassword: previousMustChangePassword,
      },
    });

    console.error("Failed to send forgot-password email", error);

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

      if (error.code === "SMTP_SEND_FAILED") {
        return Response.json(
          { error: "Could not send reset email via SMTP. Please check credentials and try again." },
          { status: 502 }
        );
      }
    }

    return Response.json(
      { error: "Could not send reset email. Please try again." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, sent: true });
}
