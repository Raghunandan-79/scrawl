import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "sketch" | "ghost" | "danger" | "active";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    // Premium theme classes
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none hover:cursor-pointer";

    const variants = {
      primary:
        "bg-[#1E1E1E] text-[#FAF8F5] border border-[#1E1E1E] hover:bg-[#2D2D2D] hover:shadow-[0_2px_8px_rgba(30,30,30,0.15)]",
      secondary:
        "bg-[#FAF8F5] text-[#1E1E1E] border border-[#E5E0D8] hover:bg-[#F3EFE9] hover:border-[#D6CFBF]",
      sketch:
        "bg-transparent text-[#1E1E1E] border-2 border-dashed border-[#1E1E1E] hover:bg-[#FAF8F5] hover:border-solid",
      ghost: "bg-transparent text-[#1E1E1E] hover:bg-[#FAF8F5]",
      danger:
        "bg-[#D95F4D] text-white border border-[#D95F4D] hover:bg-[#C24E3D]",
      active:
        "bg-[#EAE5DB] text-[#1E1E1E] border border-[#1E1E1E] font-semibold",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-md",
      md: "px-4 py-2 text-sm rounded-md",
      lg: "px-6 py-3 text-base rounded-md",
      icon: "h-9 w-9 rounded-md items-center justify-center p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
