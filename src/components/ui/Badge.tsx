import React from "react";

export type BadgeVariant = "neutral" | "default" | "success" | "warning" | "danger" | "accent";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  icon,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral: "bg-slate-100 text-ink-muted border-border",
    default: "bg-slate-100 text-ink-muted border-border",
    success: "bg-success-bg text-success border-success-border",
    warning: "bg-warning-bg text-warning border-warning-border",
    danger: "bg-danger-bg text-danger border-danger-border",
    accent: "bg-accent-light text-accent border-accent/20",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded text-xs font-semibold leading-normal ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
