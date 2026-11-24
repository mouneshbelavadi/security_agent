import React from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none";

    const variantStyles = {
      primary: "bg-ink hover:bg-ink/90 text-white border border-transparent",
      secondary: "bg-surface hover:bg-slate-100 text-ink border border-border",
      danger: "bg-danger hover:bg-danger/90 text-white border border-transparent",
      accent: "bg-accent hover:bg-accent-hover text-white border border-transparent",
    };

    // "lg" size strictly enforces the 56px minimum height guard button requirement
    const sizeStyles = {
      sm: "min-h-[36px] px-3 py-1.5 text-sm",
      md: "min-h-[44px] px-4 py-2.5 text-base",
      lg: "min-h-[56px] px-6 py-3.5 text-lg",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className={variant === "secondary" ? "text-ink" : "text-white"} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
