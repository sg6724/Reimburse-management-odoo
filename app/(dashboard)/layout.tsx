import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { company: true },
  });

  if (user.mustChangePassword) redirect("/forgot-password");

  return (
    <DashboardShell
      role={user.role}
      userName={user.name}
      companyName={user.company.name}
    >
      {children}
    </DashboardShell>
  );
}
