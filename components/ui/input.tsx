import { cn } from "@/lib/utils";
import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, rightElement, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#1A1A2E]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            className={cn(
              "w-full rounded-md border border-[#E2E4D8] bg-white px-3 py-2 text-sm text-[#1A1A2E] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#5E4075] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed",
              rightElement && "pr-16",
              error && "border-[#E05252] focus:ring-[#E05252]",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#E05252]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
