"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  FileText,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { HostLayout } from "@/components/shell/HostLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";

interface VisitDetail {
  id: string;
  visitorName: string;
  visitorPhoneMasked: string;
  purpose?: string | null;
  selfiePath?: string | null;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
  approvedAt?: string | null;
  hostName: string;
  hostDepartment: string;
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

export default function HostReviewRequestPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotEmployee, setIsNotEmployee] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "danger"; message: string } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/host/requests/${requestId}`);
      if (res.status === 401) {
        // Redirect to login preserving callbackUrl
        router.push(`/login?callbackUrl=/host/requests/${requestId}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NOT_AN_EMPLOYEE") {
          setIsNotEmployee(true);
        }
        setError(data.error || "Unable to load request.");
      } else {
        setVisit(data);
      }
    } catch {
      setError("Network error loading request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToEmployee = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/login?callbackUrl=/host/requests/${requestId}`);
    router.refresh();
  };

  useEffect(() => {
    if (requestId) {
      fetchDetail();
    }
  }, [requestId]);

  const handleApprove = async () => {
    setActionLoading(true);
    setToast(null);
    try {
      const res = await fetch(`/api/host/requests/${requestId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "danger", message: data.error || "Approval failed." });
      } else {
        setToast({
          type: data.otpEmailSent === false ? "danger" : "success",
          message: data.message || "Visitor approved. 6-digit verification code sent to the visitor's email.",
        });
        await fetchDetail();
      }
    } catch {
      setToast({ type: "danger", message: "Network error during approval." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    setActionLoading(true);
    setToast(null);
    try {
      const res = await fetch(`/api/host/requests/${requestId}/deny`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "danger", message: data.error || "Denial failed." });
      } else {
        setToast({ type: "success", message: "Visitor entry denied." });
        await fetchDetail();
      }
    } catch {
      setToast({ type: "danger", message: "Network error during denial." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <HostLayout>
        <div className="text-center py-20 space-y-3">
          <Spinner size="lg" className="text-accent" />
          <p className="text-sm text-ink-muted">Loading visitor request...</p>
        </div>
      </HostLayout>
    );
  }

  if (error || !visit) {
    return (
      <HostLayout>
        <div className="max-w-md mx-auto py-12 text-center space-y-4">
          <div className="w-12 h-12 rounded bg-danger-bg text-danger mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">
            {isNotEmployee ? "Employee Account Required" : "Cannot Access Request"}
          </h2>
          <p className="text-sm text-ink-muted">{error || "Request not found."}</p>
          {isNotEmployee ? (
            <Button
              size="lg"
              variant="primary"
              onClick={handleSwitchToEmployee}
              className="mt-4 w-full"
            >
              Sign In as Employee Host
            </Button>
          ) : (
            <Button
              size="md"
              variant="secondary"
              onClick={() => router.push("/host")}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="mt-4"
            >
              Back to Host Dashboard
            </Button>
          )}
        </div>
      </HostLayout>
    );
  }

  const isPending = visit.status === "WAITING_HOST";
  const countdown = formatCountdown(visit.expiresAt);

  return (
    <HostLayout userName={visit.hostName} department={visit.hostDepartment}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push("/host")}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
          <span className="text-xs text-ink-subtle">
            Arrived {new Date(visit.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        )}

        {/* Status Header */}
        {!isPending && (
          <StatusBanner
            status={
              visit.status === "APPROVED" || visit.status === "ENTERED"
                ? "approved"
                : visit.status === "DENIED"
                ? "denied"
                : "expired"
            }
            title={
              visit.status === "APPROVED"
                ? "You approved this visitor"
                : visit.status === "ENTERED"
                ? "Visitor has entered the gate"
                : visit.status === "DENIED"
                ? "You denied this visitor"
                : `Request is ${visit.status}`
            }
            description={
              visit.status === "APPROVED"
                ? "The visitor has received their 6-digit OTP code via email to present to the security guard."
                : visit.status === "DENIED"
                ? "The security guard has been instructed not to grant gate entry."
                : undefined
            }
          />
        )}

        {/* Main Card */}
        <Card className="border border-border bg-surface">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                Visitor Verification Review
              </CardTitle>
              {isPending && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-warning-text bg-surface px-3 py-1 rounded border border-warning-border tabular-nums">
                  <Clock className="w-4 h-4 text-warning-text shrink-0" />
                  <span>Expires in: <strong>{countdown}</strong></span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Visitor Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <User className="w-4 h-4 text-ink-subtle" />
                    <span>Visitor Name</span>
                  </span>
                  <span className="font-bold text-ink text-base">{visit.visitorName}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-ink-subtle" />
                    <span>Mobile Number</span>
                  </span>
                  <span className="font-mono font-bold text-ink tabular-nums text-base">
                    {visit.visitorPhoneMasked}
                  </span>
                </div>

                {visit.purpose && (
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-ink-muted flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-ink-subtle" />
                      <span>Purpose</span>
                    </span>
                    <span className="text-ink text-right font-medium max-w-[200px]">
                      {visit.purpose}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1.5">
                  <span className="text-ink-muted">Arrival Time</span>
                  <span className="text-ink font-semibold">
                    {new Date(visit.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Visitor Selfie Preview (Never ID photo) */}
              <div className="flex flex-col items-center justify-center p-4 rounded bg-background border border-border">
                {visit.selfiePath ? (
                  <div className="space-y-2 text-center">
                    <div className="w-32 h-32 rounded overflow-hidden border border-border mx-auto bg-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          visit.selfiePath.startsWith("/api/uploads/")
                            ? visit.selfiePath
                            : `/api/uploads/${visit.selfiePath.replace(/^uploads\//, "")}`
                        }
                        alt="Visitor Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-ink-muted font-medium">Visitor Face Photo</span>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-ink-subtle">
                    No visitor face photo was captured
                  </div>
                )}
              </div>
            </div>

            {/* TWO LARGE BUTTONS: APPROVE AND DENY */}
            {isPending && (
              <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant="primary"
                  isLoading={actionLoading}
                  onClick={handleApprove}
                  leftIcon={<CheckCircle2 className="w-6 h-6 text-white" />}
                  className="w-full text-lg font-bold bg-success hover:bg-success-hover text-white py-4 h-16"
                >
                  Approve
                </Button>

                <Button
                  size="lg"
                  variant="danger"
                  isLoading={actionLoading}
                  onClick={handleDeny}
                  leftIcon={<XCircle className="w-6 h-6" />}
                  className="w-full text-lg font-bold py-4 h-16"
                >
                  Deny
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </HostLayout>
  );
}
