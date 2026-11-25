"use client";

import React from "react";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";

interface HostLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  department?: string;
}

export function HostLayout({
  children,
  userName = "Employee Host",
  userEmail,
  department,
}: HostLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar
        companyName="VS Techsol"
        userName={userName}
        userRole={department ? `${department} Host` : "Host"}
        showLanguageSwitch={false}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}
