"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    setSuccess(false);

    const data = new FormData(e.currentTarget);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Failed to change password");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9ED]">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-[#E2E4D8]">
        <h1 className="text-2xl font-semibold text-[#1A1A2E] mb-2">Change password</h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Update your password to continue using your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            label="Current Password"
            required
          />
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            label="New Password"
            minLength={8}
            required
          />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm New Password"
            minLength={8}
            required
          />

          {error && <p className="text-sm text-[#E05252]">{error}</p>}
          {success && (
            <p className="text-sm text-[#4CAF7C]">
              Password updated successfully. Redirecting...
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[#6B7280]">
          <Link href="/login" className="text-[#5E4075] hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
