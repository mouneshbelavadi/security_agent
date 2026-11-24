"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  LogOut,
  User,
  Phone,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { GuardLayout } from "@/components/shell/GuardLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import { useI18n } from "@/components/I18nProvider";

interface TodayVisitor {
  id: string;
  visitorName: string;
  visitorPhone: string;
  purpose?: string | null;
  status: string;
  hostName: string;
  hostDepartment: string;
  createdAt: string;
  approvedAt?: string | null;
  enteredAt?: string | null;
  exitedAt?: string | null;
}

export default function GuardTodayPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [visitors, setVisitors] = useState<TodayVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchToday = async () => {
    try {
      const res = await fetch("/api/visit-requests/today");
      if (res.ok) {
        const data = await res.json();
        setVisitors(data.visitors || []);
      }
    } catch (err) {
      console.error("Failed to fetch today visitors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
    const interval = setInterval(fetchToday, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRecordExit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExitingId(id);
    try {
      const res = await fetch(`/api/visit-requests/${id}/exit`, {
        method: "POST",
      });
      if (res.ok) {
        setToastMessage("Visitor exit recorded.");
        fetchToday();
      }
    } catch {
      console.error("Failed to mark exit");
    } finally {
      setExitingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENTERED":
        return (
          <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Inside (Entered)
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Host Approved
          </Badge>
        );
      case "WAITING_HOST":
        return (
          <Badge variant="warning" icon={<Clock className="w-3.5 h-3.5" />}>
            Waiting Host
          </Badge>
        );
      case "DENIED":
        return (
          <Badge variant="danger" icon={<XCircle className="w-3.5 h-3.5" />}>
            Denied
          </Badge>
        );
      case "LOCKED":
        return (
          <Badge variant="danger" icon={<Lock className="w-3.5 h-3.5" />}>
            Locked
          </Badge>
        );
      case "EXITED":
        return <Badge variant="neutral">Exited</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <GuardLayout companyName="Apex Technologies" userName="Gate Security Guard">
      <div className="space-y-5">
        {/* Top Header with Back Button */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <button
            type="button"
            onClick={() => router.push("/guard")}
            className="flex items-center gap-1.5 text-sm font-bold text-ink hover:text-accent transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("backToHome")}</span>
          </button>

          <button
            type="button"
            onClick={fetchToday}
            className="text-xs text-ink-subtle hover:text-ink flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-ink">{t("todaysVisitorsTitle")}</h1>
          <p className="text-sm text-ink-muted mt-0.5">{t("todaysVisitorsDesc")}</p>
        </div>

        {toastMessage && (
          <Toast
            type="success"
            message={toastMessage}
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* Visitors List rendered as simple, spacious cards (Not a dense table) */}
        {loading ? (
          <div className="py-12 text-center">
            <Spinner size="lg" className="text-accent" />
          </div>
        ) : visitors.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Calendar className="w-6 h-6" />}
              title={t("noVisitorsToday")}
              description="No visitor check-ins have been recorded today."
              action={
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => router.push("/guard/new")}
                >
                  {t("newVisitor")}
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3.5">
            {visitors.map((v) => {
              const isInside = v.status === "ENTERED";

              return (
                <div
                  key={v.id}
                  onClick={() => router.push(`/guard/request/${v.id}`)}
                  className={`p-4 rounded border transition-colors duration-150 cursor-pointer shadow-none space-y-3 ${
                    isInside
                      ? "bg-surface border-success-border hover:border-success"
                      : "bg-surface border-border hover:border-border-strong"
                  }`}
                >
                  {/* Card Header: Name + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-ink truncate">
                        {v.visitorName}
                      </div>
                      <div className="text-sm text-ink-muted mt-0.5">
                        Host: <strong>{v.hostName}</strong> ({v.hostDepartment})
                      </div>
                    </div>

                    <div className="shrink-0">{getStatusBadge(v.status)}</div>
                  </div>

                  {/* Card Details: Phone & Timestamps */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-ink-subtle font-mono tabular-nums pt-2 border-t border-border/60">
                    <div className="flex items-center gap-3">
                      <span>{v.visitorPhone}</span>
                      {v.purpose && <span>• {v.purpose}</span>}
                    </div>

                    <div>
                      {v.enteredAt ? (
                        <span>Entered: {new Date(v.enteredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : (
                        <span>Arrived: {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </div>

                  {/* If Visitor is currently inside (ENTERED), show large Exit action */}
                  {isInside && (
                    <div className="pt-2">
                      <Button
                        size="md"
                        variant="danger"
                        isLoading={exitingId === v.id}
                        onClick={(e) => handleRecordExit(v.id, e)}
                        leftIcon={<LogOut className="w-4 h-4" />}
                        className="w-full text-base font-semibold"
                      >
                        {t("visitorLeft")} (Record Exit)
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GuardLayout>
  );
}
