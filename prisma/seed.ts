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

async function seedApprovalRules(companyId: string) {
  // Create a dedicated finance user for Rule 2
  const financeHash = await bcrypt.hash("finance123", 12);
  const financeUser = await prisma.user.upsert({
    where: { email: "finance@acme.com" },
    update: {},
    create: {
      companyId,
      name: "Finance Approver",
      email: "finance@acme.com",
      passwordHash: financeHash,
      role: "MANAGER",
    },
  });

  // Rule 1: Simple Manager Approval — active by default
  await prisma.approvalWorkflow.upsert({
    where: { id: "seed-rule-simple" },
    update: {},
    create: {
      id: "seed-rule-simple",
      companyId,
      name: "Simple Manager Approval",
      isActive: true,
      isSequential: false,
      managerApproverFirst: true,
      ruleType: "ALL",
    },
  });

  // Rule 2: Finance + Manager — sequential, finance user as required approver
  const financeRule = await prisma.approvalWorkflow.upsert({
    where: { id: "seed-rule-finance" },
    update: {},
    create: {
      id: "seed-rule-finance",
      companyId,
      name: "Finance + Manager",
      isActive: false,
      isSequential: true,
      managerApproverFirst: true,
      ruleType: "SPECIFIC_APPROVER",
      specificApproverId: financeUser.id,
    },
  });

  await prisma.approvalWorkflowStep.upsert({
    where: { id: "seed-step-finance" },
    update: {},
    create: {
      id: "seed-step-finance",
      workflowId: financeRule.id,
      stepOrder: 1,
      approverId: financeUser.id,
      label: "Finance Approval",
    },
  });
}

async function main() {
  console.log("Seeding database...");
  const company = await seedCompany();
  console.log("Seeded company + users + categories");
  await seedApprovalRules(company.id);
  console.log("Seeded approval rules");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
