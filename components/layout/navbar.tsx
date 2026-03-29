"use client";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui";

interface NavbarProps {
  userName: string;
  companyName: string;
}

export function Navbar({ userName, companyName }: NavbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E2E4D8] bg-white px-6">
      <p className="text-sm text-[#6B7280]">{companyName}</p>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#1A1A2E]">{userName}</span>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
