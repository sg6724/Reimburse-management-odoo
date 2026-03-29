/**
 * lib/ocr.ts
 * Owner: Person B
 *
 * Tesseract.js wrapper — runs entirely client-side (no server round-trip).
 * Called by components/expense/ocr-scanner.tsx.
 *
 * Responsibilities:
 *  1. Run Tesseract on a receipt image File/Blob
 *  2. Parse the raw OCR text into structured expense fields
 *  3. Expose progress callbacks for UI feedback
 *
 * NOTE: This file is imported only in client components (uses browser APIs).
 *       app/api/ocr/route.ts is the optional server-side fallback (separate file).
 */

import type { ExpenseFormValues } from "@/types/expense";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OcrProgressEvent {
  status: string;       // e.g. "recognizing text"
  progress: number;     // 0–1
}

export interface OcrResult {
  /** Raw extracted text from the receipt */
  rawText: string;
  /** Best-guess parsed fields — user reviews and edits before submitting */
  parsed: Partial<ExpenseFormValues>;
  /** Confidence score 0–100 */
  confidence: number;
}

export type OcrProgressCallback = (event: OcrProgressEvent) => void;

// ─── Main OCR function ────────────────────────────────────────────────────────

/**
 * Run Tesseract OCR on a receipt image and return structured fields.
 *
 * @param imageFile  - File or Blob from <input type="file"> or camera capture
 * @param onProgress - Optional callback for progress updates (drives UI progress bar)
 */
export async function extractReceiptData(
  imageFile: File | Blob,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  // Dynamically import Tesseract so it's not bundled into the server build
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    logger: onProgress
      ? (m: { status: string; progress: number }) => {
          onProgress({ status: m.status, progress: m.progress });
        }
      : undefined,
  });

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(imageFile);

    return {
      rawText: text,
      parsed: parseReceiptText(text),
      confidence,
    };
  } finally {
    await worker.terminate();
  }
}

// ─── Field Parser ─────────────────────────────────────────────────────────────

/**
 * Heuristic parser — extracts structured fields from raw receipt OCR text.
 * All fields are best-guesses; the employee always reviews before submitting.
 */
export function parseReceiptText(text: string): Partial<ExpenseFormValues> {
  const result: Partial<ExpenseFormValues> = {};

  // Normalise — collapse extra whitespace, keep newlines for line-level parsing
  const normalised = text.replace(/[ \t]+/g, " ").trim();
  const lines = normalised.split("\n").map((l) => l.trim()).filter(Boolean);

  // ── Amount ──────────────────────────────────────────────────────────────────
  // Matches patterns like: TOTAL 1,234.56  |  $ 99.00  |  Amount: 45.50
  const amountPatterns = [
    /(?:total|amount|grand\s*total|subtotal)[^\d]*(\d[\d,]*\.?\d*)/i,
    /(?:\$|€|£|¥|₹|USD|EUR|GBP|JPY|INR)\s*(\d[\d,]*\.?\d*)/i,
    /(\d[\d,]*\.\d{2})\s*(?:$|\n)/,
  ];

  for (const pattern of amountPatterns) {
    const match = normalised.match(pattern);
    if (match) {
      // Strip commas from amount strings like "1,234.56"
      result.amount = match[1].replace(/,/g, "");
      break;
    }
  }

  // ── Date ────────────────────────────────────────────────────────────────────
  // Matches: 12/04/2024  |  2024-04-12  |  12 Apr 2024  |  April 12, 2024
  const datePatterns = [
    /(\d{4}[-/]\d{2}[-/]\d{2})/,                           // ISO
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,                     // DD/MM/YY or MM/DD/YYYY
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{2,4})/i,
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}/i,
  ];

  for (const pattern of datePatterns) {
    const match = normalised.match(pattern);
    if (match) {
      const parsed = tryParseDate(match[0]);
      if (parsed) {
        result.date = parsed;
        break;
      }
    }
  }

  // ── Title / Description (merchant name) ─────────────────────────────────────
  // Usually the first non-empty line or a line with "RECEIPT" / merchant name
  const merchantLine = findMerchantLine(lines);
  if (merchantLine) {
    result.title = merchantLine;
    result.description = merchantLine;
  }

  // ── Currency ─────────────────────────────────────────────────────────────────
  const currencyMatch = normalised.match(
    /\b(USD|EUR|GBP|JPY|INR|CAD|AUD|CHF|CNY|SGD|HKD|MYR|THB|IDR|PHP|VND|KRW|BRL|MXN|ZAR)\b/
  );
  if (currencyMatch) {
    result.currencyCode = currencyMatch[1];
  }

  // ── Category (heuristic keyword match) ───────────────────────────────────────
  // NOTE: stores a category *name* (e.g. "Food"), not a DB id.
  // ExpenseForm.handleOcrFill resolves this to a real categoryId by matching
  // against the loaded categories list before applying to form state.
  result.categoryId = guessCategory(normalised);

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tryParseDate(raw: string): string | null {
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
    }
  } catch {
    // ignore
  }
  return null;
}

function findMerchantLine(lines: string[]): string | null {
  // Skip lines that are purely numbers, dates, or very short
  const skip = /^[\d\s.,/:%-]+$|receipt|invoice|tel|phone|fax|www\.|http/i;

  for (const line of lines.slice(0, 5)) {
    if (line.length >= 3 && !skip.test(line)) {
      // Capitalise first letter of each word
      return line
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .slice(0, 100); // cap length
    }
  }
  return null;
}

/**
 * Returns the *name* of the best-guess category.
 * The expense form will match this against the live categories list by name.
 * We return a name string (not an id) since IDs aren't known at parse time.
 * ExpenseForm.handleOcrFill resolves this name → id before applying to form state.
 */
export function guessCategoryName(text: string): string {
  return guessCategory(text);
}

// Server-side alias — used by app/api/ocr/route.ts (same logic, different import path)
export const parseReceiptTextServer = parseReceiptText;

function guessCategory(text: string): string {
  const lower = text.toLowerCase();

  const rules: [RegExp, string][] = [
    [/\b(restaurant|cafe|coffee|food|meal|lunch|dinner|breakfast|snack|bar|pub|bistro)\b/, "Food"],
    [/\b(hotel|motel|inn|airbnb|lodging|accommodation|hostel)\b/, "Accommodation"],
    [/\b(airline|flight|taxi|uber|grab|lyft|train|bus|mrt|subway|transport|fuel|petrol|parking)\b/, "Travel"],
  ];

  for (const [pattern, category] of rules) {
    if (pattern.test(lower)) return category;
  }

  return "Miscellaneous";
}