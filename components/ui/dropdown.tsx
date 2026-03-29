"use client";
import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface DropdownProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Dropdown = forwardRef<HTMLSelectElement, DropdownProps>(
  ({ className, label, error, id, options, placeholder, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#1A1A2E]">
            {label}
          </label>
        )}
        <select
          id={id}
          ref={ref}
          className={cn(
            "rounded-md border border-[#E2E4D8] bg-white px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#5E4075] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[#E05252] focus:ring-[#E05252]",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[#E05252]">{error}</p>}
      </div>
    );
  }
);
Dropdown.displayName = "Dropdown";
