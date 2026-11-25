"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Password change failed.");
        setIsLoading(false);
        return;
      }

      router.push(data.redirectUrl || "/guard");
      router.refresh();
    } catch {
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background">
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

      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-surface border border-border rounded p-7 sm:p-9 shadow-none">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-warning-bg border border-warning-border text-warning mb-3">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                Set New Password
              </h1>
              <p className="text-sm text-ink-muted mt-1">
                You must update your temporary initial password before proceeding.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Toast
                  type="danger"
                  message={error}
                  onDismiss={() => setError(null)}
                />
              )}

              <Input
                label="Current Password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Temporary initial password"
                leftIcon={<Lock className="w-5 h-5" />}
              />

              <Input
                label="New Password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                helperText="Must be at least 8 characters long."
                leftIcon={<Lock className="w-5 h-5" />}
              />

              <Input
                label="Confirm New Password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                leftIcon={<Lock className="w-5 h-5" />}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  isLoading={isLoading}
                  leftIcon={<CheckCircle2 className="w-5 h-5" />}
                  className="w-full text-base"
                >
                  Save Password and Continue
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-surface py-4 px-4 text-center">
        <p className="text-xs text-ink-subtle">
          For authorised security use only.
        </p>
      </footer>
    </div>
  );
}
