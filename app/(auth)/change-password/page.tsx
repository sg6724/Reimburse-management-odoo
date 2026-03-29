"use client";
import { useState } from "react";
import { Input, Button } from "@/components/ui";
import { signOut } from "next-auth/react";

export default function ChangePasswordPage() {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const data = new FormData(e.currentTarget);
    const newPassword = data.get("newPassword") as string;
    const confirm = data.get("confirmPassword") as string;

    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    // Sign out so the JWT is re-issued on next login (token has stale mustChangePassword=true)
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9ED]">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-[#E2E4D8]">
        <h1 className="text-2xl font-semibold text-[#1A1A2E] mb-1">Set your password</h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Your account uses a temporary password. Please set a permanent one to continue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            label="New password"
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm new password"
            placeholder="Repeat your password"
            required
          />
          {error && <p className="text-sm text-[#E05252]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Set password & continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
