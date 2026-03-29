"use client";
import { useState, useEffect } from "react";
import { Input, Button, Dropdown } from "@/components/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CountryOption {
  value: string;
  label: string;
}

export default function SignupPage() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/currencies")
      .then((r) => r.json())
      .then((data: { countryName: string; currencyCode: string }[]) => {
        setCountries(
          data.map((c) => ({
            value: `${c.currencyCode}__${c.countryName}`,
            label: `${c.countryName} (${c.currencyCode})`,
          }))
        );
      });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      setLoading(false);
      return;
    }

    const countryVal = data.get("country") as string;
    const [currencyCode, countryName] = countryVal.split("__");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password,
        companyName: data.get("companyName"),
        country: countryName,
        currencyCode,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Signup failed");
      setLoading(false);
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9ED]">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm border border-[#E2E4D8]">
        <h1 className="text-2xl font-semibold text-[#1A1A2E] mb-2">Create your company</h1>
        <p className="text-sm text-[#6B7280] mb-6">You will be the Admin for your company.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="companyName" name="companyName" label="Company Name" required />
          <Dropdown
            id="country"
            name="country"
            label="Country (sets base currency)"
            options={countries}
            placeholder="Select country..."
            required
          />
          <Input id="name" name="name" label="Your Name" required />
          <Input id="email" name="email" type="email" label="Email" required />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            label="Password"
            minLength={8}
            required
            rightElement={
              <button
                type="button"
                className="text-xs text-[#5E4075] hover:underline"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            label="Confirm Password"
            minLength={8}
            required
            rightElement={
              <button
                type="button"
                className="text-xs text-[#5E4075] hover:underline"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            }
          />
          {error && <p className="text-sm text-[#E05252]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#5E4075] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
