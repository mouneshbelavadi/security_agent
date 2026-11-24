"use client";

import React from "react";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";

export interface GuardLayoutProps {
  companyName: string;
  userName?: string;
  children: React.ReactNode;
  bottomAction?: React.ReactNode;
}

export function GuardLayout({
  companyName,
  userName = "Gate Security Guard",
  children,
  bottomAction,
}: GuardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <div>
        <TopBar companyName={companyName} userName={userName} userRole="Security Guard" />

        {/* Guard layout: single column, maximum width 640px, centered */}
        <main className="max-w-[640px] w-full mx-auto px-4 py-6 sm:py-8">
          {children}
        </main>
      </div>

      <div>
        {/* Mobile bottom-anchored primary action bar if provided */}
        {bottomAction && (
          <div className="sticky bottom-0 z-20 bg-surface border-t border-border p-4 sm:hidden">
            <div className="max-w-[640px] mx-auto">{bottomAction}</div>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
