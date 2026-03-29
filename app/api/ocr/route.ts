/**
 * app/api/ocr/route.ts
 * Owner: Person B
 *
 * POST /api/ocr
 *
 * Optional server-side OCR fallback.
 * Primary OCR runs client-side (components/expense/ocr-scanner.tsx).
 * This route is only called if client-side Tesseract fails (e.g. low-end device).
 *
 * Body: multipart form with field "receipt" (image file)
 * Returns: { rawText, parsed, confidence }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("receipt") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are supported" },
      { status: 415 }
    );
  }

  try {
    // Dynamic import — Tesseract.js can run in Node on the server too,
    // but it's heavier than client-side. Only used as fallback.
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data } = await worker.recognize(buffer);
    await worker.terminate();

    // Re-use the same parser from lib/ocr.ts
    // We import parseReceiptText indirectly via extractReceiptData
    // but since we already have the text, parse manually here.
    const { parseReceiptTextServer } = await import("@/lib/ocr");

    return NextResponse.json({
      rawText:    data.text,
      parsed:     parseReceiptTextServer(data.text),
      confidence: data.confidence,
    });
  } catch (err) {
    console.error("[ocr] Server OCR failed:", err);
    return NextResponse.json(
      { error: "OCR processing failed" },
      { status: 500 }
    );
  }
}