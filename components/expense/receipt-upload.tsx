/**
 * components/expense/receipt-upload.tsx
 * Owner: Person B
 *
 * Standalone file upload widget for attaching receipts to expenses.
 * Calls /api/expenses/[id]/attach (multipart POST).
 * On success, calls onUploaded(url) so the parent can update form state.
 */

"use client";

import React, { useRef, useState } from "react";
import { attachReceipt } from "@/hooks/use-expenses";

interface ReceiptUploadProps {
  expenseId: string;
  currentReceiptUrl?: string | null;
  onUploaded?: (url: string) => void;
  disabled?: boolean;
}

export function ReceiptUpload({
  expenseId,
  currentReceiptUrl,
  onUploaded,
  disabled,
}: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentReceiptUrl ?? null
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError(null);
    setIsUploading(true);

    try {
      const { receiptUrl } = await attachReceipt(expenseId, file);
      onUploaded?.(receiptUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(currentReceiptUrl ?? null);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-uploaded if needed
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* Dropzone / button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className="
          w-full border-2 border-dashed border-[#E2E4D8] rounded-xl
          py-6 text-center text-sm text-[#6B7280]
          hover:border-[#5E4075]/50 hover:text-[#5E4075]
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Uploading…
          </span>
        ) : previewUrl ? (
          "Replace receipt"
        ) : (
          <>
            <span className="text-2xl block mb-1">📎</span>
            Attach receipt (JPEG, PNG, WebP — max 5 MB)
          </>
        )}
      </button>

      {/* Preview */}
      {previewUrl && !isUploading && (
        <a href={previewUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="max-h-40 rounded-lg border border-[#E2E4D8] object-contain"
          />
        </a>
      )}

      {error && <p className="text-xs text-[#E05252]">{error}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-[#5E4075]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}