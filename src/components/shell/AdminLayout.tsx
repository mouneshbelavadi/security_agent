"use client";

import React from "react";
import Link from "next/link";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { ClipboardList, Users, UserCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

export type AdminSection = "LOGS" | "HOSTS" | "GUARDS";

export interface AdminLayoutProps {
  companyName: string;
  userName?: string;
  activeSection: AdminSection;
  onSectionChange?: (section: AdminSection) => void;
  children: React.ReactNode;
}

export function AdminLayout({
  companyName,
  userName = "System Administrator",
  activeSection,
  onSectionChange,
  children,
}: AdminLayoutProps) {
  const { t } = useI18n();

  const navItems = [
    {
      id: "LOGS" as AdminSection,
      label: t("visitorLog"),
      href: "/admin/log",
      icon: <ClipboardList className="w-5 h-5 shrink-0" aria-hidden="true" />,
    },
    {
      id: "HOSTS" as AdminSection,
      label: t("employees"),
      href: "/admin/employees",
      icon: <Users className="w-5 h-5 shrink-0" aria-hidden="true" />,
    },
    {
      id: "GUARDS" as AdminSection,
      label: t("guards"),
      href: "/admin/guards",
      icon: <UserCheck className="w-5 h-5 shrink-0" aria-hidden="true" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <div>
        <TopBar companyName={companyName} userName={userName} userRole="Security Admin" />

        {/* Mobile top navigation menu */}
        <div className="md:hidden bg-surface border-b border-border px-4 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => onSectionChange?.(item.id)}
              className={`py-3 px-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeSection === item.id
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-subtle hover:text-ink"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Main Content with Desktop Left Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-start">
            {/* Desktop Left Navigation sidebar */}
            <aside className="hidden md:block bg-surface border border-border rounded p-3 space-y-1">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                Administration
              </div>
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onSectionChange?.(item.id)}
                  className={`w-full text-left px-3.5 py-3 rounded text-sm font-semibold flex items-center gap-3 transition-colors ${
                    activeSection === item.id
                      ? "bg-accent-light text-accent border border-accent/20"
                      : "text-ink-muted hover:bg-slate-50 hover:text-ink border border-transparent"
                  }`}
                >
                  <span className={activeSection === item.id ? "text-accent" : "text-ink-subtle"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </aside>

            {/* Main Area */}
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
