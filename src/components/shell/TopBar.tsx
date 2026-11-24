"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Globe } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

export interface TopBarProps {
  companyName: string;
  userName?: string;
  userRole?: string;
  showLanguageSwitch?: boolean;
}

export function TopBar({
  companyName,
  userName,
  userRole,
  showLanguageSwitch = true,
}: TopBarProps) {
  const router = useRouter();
  const { language, toggleLanguage, t } = useI18n();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Text Wordmark built from COMPANY_NAME */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-ink text-white flex items-center justify-center font-bold text-xs select-none">
            {companyName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-base font-bold text-ink tracking-tight leading-none">
              {companyName}
            </div>
            <div className="text-xs text-ink-subtle mt-0.5 leading-none font-medium">
              Visitor Verification
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Language Switch */}
          {showLanguageSwitch && (
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded text-xs font-semibold text-ink hover:bg-slate-100 transition-colors cursor-pointer select-none"
              title="Switch language between English and Kannada"
            >
              <Globe className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              <span>{language === "en" ? "ಕನ್ನಡ" : "English"}</span>
            </button>
          )}

          {/* User profile identifier */}
          {userName && (
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-ink leading-tight">
                {userName}
              </div>
              {userRole && (
                <div className="text-xs text-ink-subtle leading-tight">
                  {userRole}
                </div>
              )}
            </div>
          )}

          {/* Sign out */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-sm font-semibold text-ink hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-ink-subtle" aria-hidden="true" />
            <span className="hidden xs:inline">{t("signOut")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
