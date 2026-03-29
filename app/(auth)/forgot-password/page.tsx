"use client";
import { useState, Suspense } from "react";
import { Input, Button } from "@/components/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const mustChange = searchParams.get("mustChange") === "1";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const data = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email") }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-[#E2E4D8] text-center">
        <h1 className="text-2xl font-semibold text-[#1A1A2E] mb-2">Check your email</h1>
        <p className="text-[#6B7280]">
          We've sent a temporary password to your email address.
        </p>
        <Link href="/login" className="mt-4 inline-block text-[#5E4075] hover:underline text-sm">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-[#E2E4D8]">
      <h1 className="text-2xl font-semibold text-[#1A1A2E] mb-2">Reset password</h1>
      {mustChange && (
        <p className="mb-4 text-sm text-[#F0A830]">
          Your password must be changed before you can continue.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="email" name="email" type="email" label="Email" required />
        {error && <p className="text-sm text-[#E05252]">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send temporary password"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[#6B7280]">
        <Link href="/login" className="text-[#5E4075] hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9ED]">
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
