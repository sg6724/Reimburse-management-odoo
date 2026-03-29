import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Prisma 7 requires a driver adapter.
// @prisma/adapter-libsql handles local SQLite via libSQL.
function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  // libSQL expects "file:dev.db" (no leading "./")
  const libsqlUrl = url.replace(/^file:\.\//, "file:");

  const adapter = new PrismaLibSql({ url: libsqlUrl });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
