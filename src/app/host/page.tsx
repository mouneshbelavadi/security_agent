"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  FileText,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { HostLayout } from "@/components/shell/HostLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";

interface HostEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface VisitItem {
  id: string;
  visitorName: string;
  visitorPhoneMasked: string;
  purpose?: string | null;
  selfiePath?: string | null;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
  approvedAt?: string | null;
  enteredAt?: string | null;
  exitedAt?: string | null;
}

function formatCountdown(targetDateStr?: string | null): string {
  if (!targetDateStr) return "--:--";
  const diffMs = new Date(targetDateStr).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export default function HostDashboardPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<HostEmployee | null>(null);
  const [pending, setPending] = useState<VisitItem[]>([]);
  const [recent, setRecent] = useState<VisitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<{ message: string; currentUser?: string; currentRole?: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "danger"; message: string } | null>(null);
  const [, setTick] = useState(0);

  // Re-render countdown every second
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch("/api/host/requests");
      if (res.status === 401) {
        router.push("/login?callbackUrl=/host");
        return;
      }
      if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        setAuthError({
          message: errData.error || "Please sign in with an Employee Host account.",
          currentUser: errData.currentUser,
          currentRole: errData.currentRole,
        });
        if (isInitial) setLoading(false);
        return;
      }
      if (!res.ok) {
        if (isInitial) setLoading(false);
        return;
      }
      const data = await res.json();
      setAuthError(null);
      setEmployee(data.employee);
      setPending(data.pending || []);
      setRecent(data.recent || []);
    } catch (err) {
      console.error("Failed to fetch host requests:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [router]);

  const handleSwitchAccount = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login?callbackUrl=/host");
    router.refresh();
  };

  // Initial fetch and 5-second polling loop
  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    setToast(null);
    try {
      const res = await fetch(`/api/host/requests/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "danger", message: data.error || "Failed to approve request." });
      } else {
        setToast({
          type: data.otpEmailSent === false ? "danger" : "success",
          message: data.message || "Visitor approved. 6-digit verification code sent to the visitor's email.",
        });
        await fetchData(false);
      }
    } catch {
      setToast({ type: "danger", message: "Network error during approval." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeny = async (id: string) => {
    setActionLoadingId(id);
    setToast(null);
    try {
      const res = await fetch(`/api/host/requests/${id}/deny`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "danger", message: data.error || "Failed to deny request." });
      } else {
        setToast({ type: "success", message: "Visitor request denied." });
        await fetchData(false);
      }
    } catch {
      setToast({ type: "danger", message: "Network error during denial." });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <HostLayout>
        <div className="text-center py-20 space-y-3">
          <Spinner size="lg" className="text-accent" />
          <p className="text-sm text-ink-muted">Loading employee verification dashboard...</p>
        </div>
      </HostLayout>
    );
  }

  if (authError) {
    return (
      <HostLayout userName={authError.currentUser || "Signed-In User"} department={authError.currentRole}>
        <div className="max-w-md mx-auto py-12 text-center space-y-4">
          <div className="w-12 h-12 rounded bg-warning-bg text-warning-text mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">Employee Account Required</h2>
          <p className="text-sm text-ink-muted">{authError.message}</p>
          <p className="text-xs text-ink-subtle">
            Tip: For demos in one browser, open host links in an Incognito window or switch accounts here.
          </p>
          <Button
            size="lg"
            variant="primary"
            onClick={handleSwitchAccount}
            className="mt-2 w-full"
          >
            Switch Account / Sign In as Employee
          </Button>
        </div>
      </HostLayout>
    );
  }

  return (
    <HostLayout
      userName={employee?.name || "Host Employee"}
      userEmail={employee?.email}
      department={employee?.department}
    >
      <div className="space-y-8">
        {/* Top Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Host Verification Dashboard
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              Welcome, <strong>{employee?.name}</strong> ({employee?.department}). Review and approve outside visitors.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="flex items-center gap-1.5 text-xs text-ink-subtle bg-surface px-2.5 py-1 rounded border border-border">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
              Live Polling (5s)
            </span>
          </div>
        </div>

        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        )}

        {/* SECTION 1: PENDING REQUESTS AT THE TOP */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <span>Pending Requests</span>
              {pending.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-warning text-warning-text">
                  {pending.length}
                </span>
              )}
            </h2>
          </div>

          {pending.length === 0 ? (
            <div className="bg-surface border border-border rounded p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
              <p className="text-base font-semibold text-ink">No pending visitor requests</p>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                When a visitor arrives at the gate and provides your name, their request will appear here for your approval.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((item) => {
                const countdown = formatCountdown(item.expiresAt);
                const isItemLoading = actionLoadingId === item.id;

                return (
                  <Card key={item.id} className="border-2 border-warning-border bg-surface">
                    <CardHeader className="pb-3 border-b border-border bg-warning/5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" />
                          <CardTitle className="text-lg">
                            Visitor Waiting: {item.visitorName}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-warning-text bg-surface px-3 py-1 rounded border border-warning-border tabular-nums w-fit">
                          <Clock className="w-4 h-4 text-warning-text shrink-0" />
                          <span>Expires in: <strong>{countdown}</strong></span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2.5 text-sm">
                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-ink-muted flex items-center gap-1.5">
                              <User className="w-4 h-4 text-ink-subtle" />
                              <span>Full Name</span>
                            </span>
                            <span className="font-bold text-ink">{item.visitorName}</span>
                          </div>

                          <div className="flex justify-between py-1 border-b border-border">
                            <span className="text-ink-muted flex items-center gap-1.5">
                              <Phone className="w-4 h-4 text-ink-subtle" />
                              <span>Mobile</span>
                            </span>
                            <span className="font-mono font-bold text-ink tabular-nums">
                              {item.visitorPhoneMasked}
                            </span>
                          </div>

                          {item.purpose && (
                            <div className="flex justify-between py-1 border-b border-border">
                              <span className="text-ink-muted flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-ink-subtle" />
                                <span>Purpose</span>
                              </span>
                              <span className="text-ink text-right max-w-[200px]">{item.purpose}</span>
                            </div>
                          )}

                          <div className="flex justify-between py-1">
                            <span className="text-ink-muted">Arrival Time</span>
                            <span className="text-ink font-medium">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>

                        {/* Visitor Photo Preview (Selfie only, never ID photo) */}
                        <div className="flex flex-col items-center justify-center p-3 rounded bg-background border border-border">
                          {item.selfiePath ? (
                            <div className="space-y-1.5 text-center">
                              <div className="w-28 h-28 rounded overflow-hidden border border-border mx-auto bg-slate-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    item.selfiePath.startsWith("/api/uploads/")
                                      ? item.selfiePath
                                      : `/api/uploads/${item.selfiePath.replace(/^uploads\//, "")}`
                                  }
                                  alt="Visitor Face"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-xs text-ink-muted">Visitor Photo</span>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-xs text-ink-subtle">
                              No visitor face photo taken
                            </div>
                          )}
                        </div>
                      </div>

                      {/* TWO LARGE BUTTONS: APPROVE AND DENY */}
                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          size="lg"
                          variant="primary"
                          isLoading={isItemLoading}
                          onClick={() => handleApprove(item.id)}
                          leftIcon={<CheckCircle2 className="w-5 h-5 text-white" />}
                          className="w-full text-base font-bold bg-success hover:bg-success-hover text-white py-4 h-14"
                        >
                          Approve Visitor
                        </Button>

                        <Button
                          size="lg"
                          variant="danger"
                          isLoading={isItemLoading}
                          onClick={() => handleDeny(item.id)}
                          leftIcon={<XCircle className="w-5 h-5" />}
                          className="w-full text-base font-bold py-4 h-14"
                        >
                          Deny Entry
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: RECENT DECISIONS BELOW */}
        <section className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-lg font-bold text-ink">Recent Decisions</h2>

          {recent.length === 0 ? (
            <p className="text-xs text-ink-subtle">No recent decisions recorded yet.</p>
          ) : (
            <div className="bg-surface border border-border rounded overflow-hidden">
              <div className="divide-y divide-border">
                {recent.map((item) => {
                  let badgeVariant: "success" | "danger" | "warning" | "neutral" = "neutral";
                  let statusText = item.status;

                  if (item.status === "APPROVED") {
                    badgeVariant = "warning";
                    statusText = "Approved (Waiting OTP)";
                  } else if (item.status === "ENTERED") {
                    badgeVariant = "success";
                    statusText = "Entered Facility";
                  } else if (item.status === "DENIED") {
                    badgeVariant = "danger";
                    statusText = "Denied";
                  } else if (item.status === "EXPIRED") {
                    badgeVariant = "neutral";
                    statusText = "Expired";
                  } else if (item.status === "EXITED") {
                    badgeVariant = "neutral";
                    statusText = "Exited";
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm sm:text-base">
                            {item.visitorName}
                          </span>
                          <Badge variant={badgeVariant}>{statusText}</Badge>
                        </div>
                        <div className="text-xs text-ink-muted flex items-center gap-3">
                          <span>Phone: {item.visitorPhoneMasked}</span>
                          {item.purpose && <span>Purpose: {item.purpose}</span>}
                        </div>
                      </div>

                      <div className="text-xs text-ink-subtle text-right tabular-nums">
                        {new Date(item.createdAt).toLocaleDateString()} at{" "}
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </HostLayout>
  );
}
