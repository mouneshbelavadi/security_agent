import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "danger" | "warning" | "info";

export interface ToastProps {
  type?: ToastType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function Toast({
  type = "info",
  message,
  onDismiss,
  className = "",
}: ToastProps) {
  const configs = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-success shrink-0" aria-hidden="true" />,
      styles: "bg-success-bg border-success-border text-success-text",
    },
    danger: {
      icon: <AlertCircle className="w-5 h-5 text-danger shrink-0" aria-hidden="true" />,
      styles: "bg-danger-bg border-danger-border text-danger-text",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-warning shrink-0" aria-hidden="true" />,
      styles: "bg-warning-bg border-warning-border text-warning-text",
    },
    info: {
      icon: <Info className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />,
      styles: "bg-slate-100 border-border text-ink",
    },
  };

  const config = configs[type];

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 p-3.5 border rounded text-sm font-medium transition-colors duration-150 ${config.styles} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {config.icon}
        <span>{message}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-black/5 cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
