import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "danger" | "warning" | "default";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-[#4CAF7C]/10 text-[#4CAF7C]": variant === "success",
          "bg-[#E05252]/10 text-[#E05252]": variant === "danger",
          "bg-[#F0A830]/10 text-[#F0A830]": variant === "warning",
          "bg-[#E2E4D8] text-[#6B7280]": variant === "default",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
