import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { env } from "@/lib/env";
import { I18nProvider } from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: `${env.COMPANY_NAME} - Internal Visitor Verification`,
  description: `Internal gate security visitor verification tool for ${env.COMPANY_NAME}`,
  icons: {
    icon: "/icon.png",
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
