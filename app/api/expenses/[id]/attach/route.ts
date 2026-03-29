/**
 * app/api/expenses/[id]/attach/route.ts
 * Owner: Person B
 *
 * POST /api/expenses/[id]/attach
 *
 * Handles receipt image upload.
 * Stores file to /public/uploads/{companyId}/{expenseId}-{timestamp}.{ext}
 * Links receiptUrl on the Expense record.
 *
 * Allowed: Employee (own draft), Admin (any)
 * File constraints: image/* only, max 5 MB
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: userId, companyId, role } = session.user;
  const { id } = await params;

  // Load expense
  const expense = await prisma.expense.findFirst({
    where: {
      id,
      companyId,
      ...(role === "EMPLOYEE" ? { employeeId: userId } : {}),
    },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Receipts can be attached on drafts only (employees); admins can attach any time
  if (role === "EMPLOYEE" && expense.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Receipts can only be attached to Draft expenses" },
      { status: 409 }
    );
  }

  // ── Parse multipart form ────────────────────────────────────────────────
  const formData = await req.formData();
  const file = formData.get("receipt") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Upload a JPEG, PNG, or WebP image.` },
      { status: 415 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large — maximum 5 MB" },
      { status: 413 }
    );
  }

  // ── Save file ───────────────────────────────────────────────────────────
  const ext = extname(file.name) || `.${file.type.split("/")[1]}`;
  const filename = `${id}-${Date.now()}${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", companyId);
  const filePath = join(uploadDir, filename);
  const publicUrl = `/uploads/${companyId}/${filename}`;

  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // ── Update expense record ───────────────────────────────────────────────
  await prisma.expense.update({
    where: { id },
    data: { receiptUrl: publicUrl },
  });

  return NextResponse.json({ receiptUrl: publicUrl });
}