"use client";

import React from "react";
import { useI18n } from "@/components/I18nProvider";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-surface py-4 px-4 text-center">
      <p className="text-xs text-ink-subtle">
        {t("authorisedUseOnly")}
      </p>
    </footer>
  );
}
