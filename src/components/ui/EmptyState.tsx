import React from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`text-center py-12 px-4 border border-dashed border-border rounded bg-surface/50 ${className}`}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-slate-100 text-ink-subtle mb-3">
        {icon || <HelpCircle className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
      {!action && actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
