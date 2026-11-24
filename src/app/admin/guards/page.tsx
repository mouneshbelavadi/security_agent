"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Plus,
  KeyRound,
  Shield,
  User,
  Clock,
  X,
  Lock,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/shell/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";

interface GuardUser {
  id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export default function AdminGuardsPage() {
  const [guards, setGuards] = useState<GuardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  // Add Guard Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetTargetGuard, setResetTargetGuard] = useState<GuardUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const fetchGuards = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/guards");
      if (!res.ok) throw new Error("Failed to load guards");
      const data = await res.json();
      setGuards(data.guards || []);
    } catch {
      setToastMessage({ text: "Failed to load guard accounts.", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuards();
  }, []);

  // Add Guard Submit Handler
  const handleAddGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setIsSubmittingAdd(true);

    try {
      const res = await fetch("/api/admin/guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          username: addUsername.trim().toLowerCase(),
          password: addPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to create guard account");
        return;
      }

      setToastMessage({
        text: `Guard account "${data.guard.username}" created successfully.`,
        type: "success",
      });
      setIsAddOpen(false);
      setAddName("");
      setAddUsername("");
      setAddPassword("");
      fetchGuards();
    } catch {
      setAddError("Server error creating guard account.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Toggle Active / Deactivate
  const handleToggleActive = async (guard: GuardUser) => {
    const newStatus = !guard.isActive;
    try {
      const res = await fetch(`/api/admin/guards/${guard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      setToastMessage({
        text: `Guard "${guard.name}" is now ${newStatus ? "active" : "deactivated"}.`,
        type: "success",
      });
      fetchGuards();
    } catch {
      setToastMessage({ text: "Failed to update guard account status.", type: "danger" });
    }
  };

  // Reset Password Submit Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetGuard) return;
    setResetError(null);
    setIsSubmittingReset(true);

    try {
      const res = await fetch(`/api/admin/guards/${resetTargetGuard.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || "Failed to reset password");
        return;
      }

      setToastMessage({
        text: `Password for "${resetTargetGuard.username}" reset successfully. Forced change enabled on next login.`,
        type: "success",
      });
      setResetTargetGuard(null);
      setNewPassword("");
      fetchGuards();
    } catch {
      setResetError("Server error resetting password.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <AdminLayout companyName="Apex Technologies" activeSection="GUARDS">
      <div className="space-y-6">
        {toastMessage && (
          <Toast
            type={toastMessage.type}
            message={toastMessage.text}
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* ================= HEADER & TOOLBAR ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Guard Accounts</h1>
            <p className="text-sm text-ink-muted">
              Security personnel accounts authorized to verify visitors and grant gate entry passes.
            </p>
          </div>

          <div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setAddName("");
                setAddUsername("");
                setAddPassword("");
                setAddError(null);
                setIsAddOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Guard
            </Button>
          </div>
        </div>

        {/* ================= GUARDS LIST ================= */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Spinner size="lg" className="text-accent" />
            <p className="text-sm text-ink-muted">Loading guard accounts...</p>
          </div>
        ) : guards.length === 0 ? (
          <EmptyState
            title="No guard accounts found"
            description="Create your first guard account to grant gate security access."
            actionLabel="Add Guard"
            onAction={() => setIsAddOpen(true)}
          />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-surface border border-border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-border text-xs font-bold uppercase tracking-wider text-ink-subtle">
                  <tr>
                    <th className="py-3 px-4">Guard Personnel</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Security Policy</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {guards.map((guard) => (
                    <tr key={guard.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-ink">
                        {guard.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-ink">
                        {guard.username}
                      </td>
                      <td className="py-3.5 px-4">
                        {guard.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Deactivated</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {guard.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                            <Lock className="w-3 h-3" />
                            <span>Password change forced</span>
                          </span>
                        ) : (
                          <span className="text-xs text-ink-subtle">Normal</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-ink-muted tabular-nums">
                        {new Date(guard.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTargetGuard(guard);
                            setNewPassword("");
                            setResetError(null);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover p-1"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset Password</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(guard)}
                          className={`inline-flex items-center gap-1 text-xs font-semibold p-1 ${
                            guard.isActive
                              ? "text-danger hover:text-danger-hover"
                              : "text-success hover:text-success-hover"
                          }`}
                        >
                          {guard.isActive ? <span>Deactivate</span> : <span>Activate</span>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {guards.map((guard) => (
                <div key={guard.id} className="bg-surface border border-border rounded p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-ink text-base">{guard.name}</div>
                      <div className="text-xs font-mono font-bold text-ink-muted mt-0.5">
                        Username: {guard.username}
                      </div>
                    </div>
                    {guard.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="default">Deactivated</Badge>
                    )}
                  </div>

                  {guard.mustChangePassword && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Must change password on next sign-in</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-ink-subtle font-mono tabular-nums">
                      Added {new Date(guard.createdAt).toLocaleDateString()}
                    </span>

                    <div className="space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setResetTargetGuard(guard);
                          setNewPassword("");
                          setResetError(null);
                        }}
                        className="text-accent font-semibold"
                      >
                        Reset Password
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(guard)}
                        className={`font-semibold ${guard.isActive ? "text-danger" : "text-success"}`}
                      >
                        {guard.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ADD GUARD MODAL ================= */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50">
            <div className="bg-surface rounded-lg border border-border shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50">
                <h3 className="text-base font-bold text-ink">Add New Guard Account</h3>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="p-1 rounded text-ink-subtle hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddGuard} className="p-5 space-y-4">
                {addError && (
                  <div className="p-3 rounded bg-danger-bg border border-danger-border text-danger text-xs">
                    {addError}
                  </div>
                )}

                <Input
                  label="Guard Full Name"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Anand Murthy"
                />

                <Input
                  label="Username"
                  required
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="e.g. guard3"
                  helperText="Lowercase alphanumeric, minimum 3 characters."
                />

                <Input
                  label="Initial Password"
                  type="password"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="••••••••"
                  helperText="At least 8 characters. Guard will be forced to change password on first login."
                />

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmittingAdd}
                  >
                    Create Guard Account
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= RESET PASSWORD MODAL ================= */}
        {resetTargetGuard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50">
            <div className="bg-surface rounded-lg border border-border shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-base font-bold text-ink">Reset Guard Password</h3>
                  <div className="text-xs text-ink-subtle">
                    Guard: {resetTargetGuard.name} ({resetTargetGuard.username})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetTargetGuard(null)}
                  className="p-1 rounded text-ink-subtle hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="p-5 space-y-4">
                {resetError && (
                  <div className="p-3 rounded bg-danger-bg border border-danger-border text-danger text-xs">
                    {resetError}
                  </div>
                )}

                <p className="text-xs text-ink-muted">
                  Enter a new temporary password. The guard will be forced to choose their own new password upon their next sign-in.
                </p>

                <Input
                  label="New Temporary Password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  helperText="Minimum 8 characters."
                />

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setResetTargetGuard(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    size="md"
                    isLoading={isSubmittingReset}
                  >
                    Reset Password
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
