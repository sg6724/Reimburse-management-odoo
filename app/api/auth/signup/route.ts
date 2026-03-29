import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1),
  country: z.string().min(1),
  currencyCode: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, password, companyName, country, currencyCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.company.create({
    data: {
      name: companyName,
      country,
      currencyCode,
      users: {
        create: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
        },
      },
      categories: {
        create: [
          { name: "Food" },
          { name: "Travel" },
          { name: "Accommodation" },
          { name: "Miscellaneous" },
        ],
      },
    },
  });

  return Response.json({ ok: true }, { status: 201 });
}
