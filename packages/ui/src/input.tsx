import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-[#1E1E1E] uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          type={type}
          className={`flex h-10 w-full rounded-md border border-[#E5E0D8] bg-[#FAF8F5] px-3 py-2 text-sm text-[#1E1E1E] transition-all duration-200 placeholder:text-[#A19D94] focus:outline-none focus:border-[#1E1E1E] focus:ring-1 focus:ring-[#1E1E1E] disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? "border-[#D95F4D] focus:border-[#D95F4D] focus:ring-[#D95F4D]" : ""
          } ${className}`}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-xs text-[#D95F4D] font-medium">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
