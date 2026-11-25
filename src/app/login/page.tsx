"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, callbackUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Check your credentials.");
        setIsLoading(false);
        return;
      }

      router.push(data.redirectUrl || "/guard");
      router.refresh();
    } catch {
      setError("Network or server connection failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-surface border border-border rounded p-7 sm:p-9 shadow-none">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="VS Techsol Logo"
            className="w-20 h-20 object-contain mb-3 select-none"
          />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Sign In</h1>
          <p className="text-sm text-ink-muted mt-1">
            VS Techsol Internal Gate Verification Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Toast
              type="danger"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          <Input
            label="Username or Email"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username or company email"
            leftIcon={<User className="w-5 h-5" aria-hidden="true" />}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            leftIcon={<KeyRound className="w-5 h-5" aria-hidden="true" />}
          />

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-5 h-5" aria-hidden="true" />}
              className="w-full text-base"
            >
              Sign In
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-6 text-center text-xs text-ink-subtle">
        Authorized personnel only. All access attempts are recorded in the security audit log.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background">
      {/* Top minimal header */}
      <header className="border-b border-border bg-surface py-3 px-6">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="VS Techsol Logo"
            className="w-9 h-9 object-contain select-none"
          />
          <div>
            <div className="text-sm font-bold text-ink tracking-tight leading-none">
              VS Techsol
            </div>
            <div className="text-[11px] text-ink-subtle mt-0.5 leading-none">
              Internal Visitor Verification
            </div>
          </div>
        </div>
      </header>

      {/* Centered Sign-in card */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12">
        <Suspense fallback={<div className="text-sm text-ink-muted">Loading sign in...</div>}>
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-4 px-4 text-center">
        <p className="text-xs text-ink-subtle">
          For authorised security use only.
        </p>
      </footer>
    </div>
  );
}
