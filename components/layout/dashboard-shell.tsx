import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";

interface DashboardShellProps {
  children: React.ReactNode;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  userName: string;
  companyName: string;
}

export function DashboardShell({ children, role, userName, companyName }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar userName={userName} companyName={companyName} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#F8F9ED]">{children}</main>
      </div>
    </div>
  );
}
