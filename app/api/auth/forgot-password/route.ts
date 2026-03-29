import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/mail";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function POST(request: Request) {
  const { email } = await request.json();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return 200 to prevent email enumeration
  if (!user) return Response.json({ ok: true });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: true },
  });

  await sendPasswordResetEmail(user.email, user.name, tempPassword);

  return Response.json({ ok: true });
}
