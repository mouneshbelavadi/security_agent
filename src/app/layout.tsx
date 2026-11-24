import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { env } from "@/lib/env";
import { I18nProvider } from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: `${env.COMPANY_NAME} - Visitor Verification`,
  description: "Internal security gate visitor verification system",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-ink antialiased selection:bg-accent-light selection:text-ink">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
