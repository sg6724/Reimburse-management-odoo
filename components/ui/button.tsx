"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-[#5E4075] text-white hover:bg-[#4a3260] focus:ring-[#5E4075]":
              variant === "primary",
            "border border-[#E2E4D8] bg-white text-[#1A1A2E] hover:bg-[#F8F9ED] focus:ring-[#5E4075]":
              variant === "secondary",
            "text-[#1A1A2E] hover:bg-[#F8F9ED] focus:ring-[#5E4075]":
              variant === "ghost",
            "bg-[#E05252] text-white hover:bg-[#c04444] focus:ring-[#E05252]":
              variant === "danger",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
