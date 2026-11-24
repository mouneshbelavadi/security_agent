import React from "react";
import { CheckCircle2, Clock, XCircle, AlertOctagon, ShieldCheck } from "lucide-react";

export type StatusBannerType = "waiting" | "approved" | "denied" | "expired" | "allowed";

export interface StatusBannerProps {
  status: StatusBannerType;
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function StatusBanner({
  status,
  title,
  description,
  className = "",
  children,
}: StatusBannerProps) {
  const configs = {
    waiting: {
      defaultTitle: "Waiting for Host Approval",
      defaultDescription: "The host employee has received the verification link.",
      icon: <Clock className="w-8 h-8 shrink-0 text-warning" aria-hidden="true" />,
      containerStyles: "bg-warning-bg border-warning-border text-warning-text",
      badgeStyles: "bg-white text-warning border-warning-border",
    },
    approved: {
      defaultTitle: "Host Approved",
      defaultDescription: "Host confirmed visitor. Ask visitor for the 6-digit OTP.",
      icon: <CheckCircle2 className="w-8 h-8 shrink-0 text-success" aria-hidden="true" />,
      containerStyles: "bg-success-bg border-success-border text-success-text",
      badgeStyles: "bg-white text-success border-success-border",
    },
    allowed: {
      defaultTitle: "ALLOW ENTRY",
      defaultDescription: "Visitor identity and OTP verified. Allow visitor past the gate.",
      icon: <ShieldCheck className="w-10 h-10 shrink-0 text-success" aria-hidden="true" />,
      containerStyles: "bg-success-bg border-2 border-success text-success-text",
      badgeStyles: "bg-success text-white border-transparent",
    },
    denied: {
      defaultTitle: "ENTRY DENIED",
      defaultDescription: "Host denied entry permission. Do not permit visitor past the gate.",
      icon: <XCircle className="w-8 h-8 shrink-0 text-danger" aria-hidden="true" />,
      containerStyles: "bg-danger-bg border-danger-border text-danger-text",
      badgeStyles: "bg-white text-danger border-danger-border",
    },
    expired: {
      defaultTitle: "Request Expired",
      defaultDescription: "The verification window timed out. A new request must be created.",
      icon: <AlertOctagon className="w-8 h-8 shrink-0 text-danger" aria-hidden="true" />,
      containerStyles: "bg-danger-bg border-danger-border text-danger-text",
      badgeStyles: "bg-white text-danger border-danger-border",
    },
  };

  const config = configs[status];
  const finalTitle = title || config.defaultTitle;
  const finalDescription = description || config.defaultDescription;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full border rounded p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors duration-150 ${config.containerStyles} ${className}`}
    >
      <div className="p-2 rounded bg-surface border border-inherit shrink-0">
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
          {finalTitle}
        </h3>
        <p className="text-base text-ink-muted mt-1 leading-normal">
          {finalDescription}
        </p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
