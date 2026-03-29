// Run: bunx prisma db seed
// Purpose: Dev reset data. Person C adds seedApprovalRules() below.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedCompany() {
  const company = await prisma.company.upsert({
    where: { id: "seed-company" },
    update: {},
    create: {
      id: "seed-company",
      name: "Acme Corp",
      country: "India",
      currencyCode: "INR",
    },
  });

  const adminHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@acme.com" },
    update: {},
    create: {
      companyId: company.id,
      name: "Admin User",
      email: "admin@acme.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const managerHash = await bcrypt.hash("manager123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@acme.com" },
    update: {},
    create: {
      companyId: company.id,
      name: "Sarah Manager",
      email: "manager@acme.com",
      passwordHash: managerHash,
      role: "MANAGER",
    },
  });

  const employeeHash = await bcrypt.hash("employee123", 12);
  await prisma.user.upsert({
    where: { email: "employee@acme.com" },
    update: {},
    create: {
      companyId: company.id,
      name: "John Employee",
      email: "employee@acme.com",
      passwordHash: employeeHash,
      role: "EMPLOYEE",
      managerId: manager.id,
    },
  });

  for (const name of ["Food", "Travel", "Accommodation", "Miscellaneous"]) {
    await prisma.expenseCategory.upsert({
      where: { id: `seed-cat-${name.toLowerCase()}` },
      update: {},
      create: {
        id: `seed-cat-${name.toLowerCase()}`,
        companyId: company.id,
        name,
      },
    });
  }

  return company;
}

// Person C: Add your seedApprovalRules(companyId) function here
// export async function seedApprovalRules(companyId: string) { ... }

async function main() {
  console.log("Seeding database...");
  await seedCompany();
  console.log("Seeded company + users + categories");

  // Person C calls: await seedApprovalRules(company.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
