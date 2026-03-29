"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const adminNav: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/categories", label: "Categories", icon: "🏷️" },
  { href: "/admin/approval-rules", label: "Approval Rules", icon: "⚙️" },
];

const managerNav: NavItem[] = [
  { href: "/manager/approvals", label: "Approvals", icon: "✅" },
];

const employeeNav: NavItem[] = [
  { href: "/employee/expenses", label: "My Expenses", icon: "🧾" },
  { href: "/employee/expenses/new", label: "New Expense", icon: "+" },
];

interface SidebarProps {
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems =
    role === "ADMIN" ? adminNav : role === "MANAGER" ? managerNav : employeeNav;

  return (
    <aside className="flex h-full w-56 flex-col bg-[#5E4075] text-white">
      <div className="flex h-14 items-center px-4 font-semibold text-lg border-b border-white/10">
        Reimbursement
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-white/20 font-medium"
                : "hover:bg-white/10"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
