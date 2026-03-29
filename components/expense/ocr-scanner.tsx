/**
 * components/expense/ocr-scanner.tsx
 * Owner: Person B
 *
 * Combines receipt upload + Tesseract OCR.
 * When a file is selected:
 *  1. Uploads receipt to server (if expenseId provided)
 *  2. Runs Tesseract in-browser
 *  3. Calls onFill() with parsed fields so the form can autofill
 *
 * Runs entirely client-side — no server round-trip for OCR.
 */

"use client";

import React, { useRef, useState } from "react";
import { extractReceiptData, type OcrProgressEvent } from "@/lib/ocr";
import { attachReceipt } from "@/hooks/use-expenses";
import type { ExpenseFormValues } from "@/types/expense";

interface OcrScannerProps {
  /** Called with parsed fields after OCR — parent merges into form state */
  onFill: (partial: Partial<ExpenseFormValues>) => void;
  /** If provided, receipt is also uploaded to the server */
  expenseId?: string;
  /** Called when upload succeeds */
  onReceiptUploaded?: (url: string) => void;
}

type ScanState =
  | { phase: "idle" }
  | { phase: "scanning"; progress: number; status: string }
  | { phase: "done"; confidence: number }
  | { phase: "error"; message: string };

export function OcrScanner({ onFill, expenseId, onReceiptUploaded }: OcrScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState<ScanState>({ phase: "idle" });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScan({ phase: "scanning", progress: 0, status: "Preparing…" });

    try {
      // Run OCR in parallel with upload (both use the same file)
      const [ocrResult] = await Promise.all([
        extractReceiptData(file, (event: OcrProgressEvent) => {
          setScan({
            phase: "scanning",
            progress: Math.round(event.progress * 100),
            status: event.status,
          });
        }),
        expenseId
          ? attachReceipt(expenseId, file).then((r) => {
              onReceiptUploaded?.(r.receiptUrl);
            })
          : Promise.resolve(),
      ]);

      // Pass parsed fields up to the form
      onFill(ocrResult.parsed);

      setScan({ phase: "done", confidence: Math.round(ocrResult.confidence) });
    } catch (err) {
      setScan({
        phase: "error",
        message: err instanceof Error ? err.message : "OCR failed",
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function reset() {
    setScan({ phase: "idle" });
  }

  return (
    <div className="rounded-xl border border-dashed border-[#5E4075]/30 bg-[#F8F9ED] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <p className="text-sm font-medium text-[#1A1A2E]">Scan Receipt with OCR</p>
        <span className="text-xs text-[#6B7280] ml-auto">Runs entirely in your browser</span>
      </div>

      {/* Idle state */}
      {scan.phase === "idle" && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="
              w-full py-2 px-4 rounded-lg text-sm font-medium
              bg-[#5E4075] text-white
              hover:bg-[#4a3260] transition-colors
            "
          >
            📷 Upload or Take Photo
          </button>
          <p className="text-xs text-[#6B7280] text-center">
            We'll auto-fill amount, date, description, and category from your receipt.
          </p>
        </>
      )}

      {/* Scanning state */}
      {scan.phase === "scanning" && (
        <div className="space-y-2">
          <p className="text-xs text-[#6B7280] capitalize">{scan.status}…</p>
          <div className="h-2 bg-[#E2E4D8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5E4075] rounded-full transition-all duration-300"
              style={{ width: `${scan.progress}%` }}
            />
          </div>
          <p className="text-xs text-[#6B7280] text-right">{scan.progress}%</p>
        </div>
      )}

      {/* Done state */}
      {scan.phase === "done" && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#2E7D52]">
            ✅ Fields auto-filled (confidence: {scan.confidence}%)
          </p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#6B7280] underline"
          >
            Scan again
          </button>
        </div>
      )}

      {/* Error state */}
      {scan.phase === "error" && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#E05252]">⚠️ {scan.phase === "error" ? (scan as Extract<ScanState, { phase: "error" }>).message : ""}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#6B7280] underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}