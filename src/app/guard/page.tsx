"use client";

import React, { useState, useEffect } from "react";
import Link from "next/navigation";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Calendar,
  Clock,
  ArrowRight,
  RefreshCw,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { GuardLayout } from "@/components/shell/GuardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/components/I18nProvider";

interface WaitingRequest {
  id: string;
  visitorName: string;
  visitorPhone: string;
  purpose?: string | null;
  status: string;
  hostName: string;
  hostDepartment: string;
  createdAt: string;
  expiresAt?: string;
}

export default function GuardHomePage() {
  const router = useRouter();
  const { t } = useI18n();

  const [waitingRequests, setWaitingRequests] = useState<WaitingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWaiting = async () => {
    try {
      const res = await fetch("/api/visit-requests/waiting");
      if (res.ok) {
        const data = await res.json();
        setWaitingRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching waiting requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWaiting();
    // Live polling every 3 seconds to keep gate guard in sync
    const interval = setInterval(fetchWaiting, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GuardLayout companyName="VS Techsol" userName="Gate Security Guard">
      <div className="space-y-6">
        {/* Two Large Action Buttons (Strictly 56px height, high contrast, large text) */}
        <div className="space-y-3">
          <Button
            size="lg"
            variant="primary"
            onClick={() => router.push("/guard/new")}
            leftIcon={<UserPlus className="w-6 h-6 shrink-0" aria-hidden="true" />}
            rightIcon={<ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />}
            className="w-full text-xl font-bold justify-between px-6"
          >
            {t("newVisitor")}
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => router.push("/guard/today")}
            leftIcon={<Calendar className="w-6 h-6 text-accent shrink-0" aria-hidden="true" />}
            rightIcon={<ArrowRight className="w-5 h-5 text-ink-subtle shrink-0" aria-hidden="true" />}
            className="w-full text-lg justify-between px-6"
          >
            {t("todaysVisitors")}
          </Button>
        </div>

        {/* Section: Waiting for Approval */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" aria-hidden="true" />
              <span>{t("visitorsWaitingApproval")}</span>
              {waitingRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-warning-bg text-warning text-xs font-bold border border-warning-border">
                  {waitingRequests.length}
                </span>
              )}
            </h2>

            <button
              type="button"
              onClick={fetchWaiting}
              className="text-xs text-ink-subtle hover:text-ink flex items-center gap-1 font-semibold p-1 cursor-pointer"
              title="Refresh waiting list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {waitingRequests.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Clock className="w-6 h-6 text-ink-subtle" />}
                title={t("noVisitorsWaiting")}
                description={t("noVisitorsWaitingDesc")}
                action={
                  <Button
                    size="md"
                    variant="primary"
                    onClick={() => router.push("/guard/new")}
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    {t("newVisitor")}
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {waitingRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => router.push(`/guard/request/${req.id}`)}
                  className="bg-surface border border-warning-border hover:border-warning rounded p-4.5 transition-colors duration-150 cursor-pointer shadow-none flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-ink truncate group-hover:text-accent transition-colors">
                        {req.visitorName}
                      </span>
                      {req.status === "APPROVED" ? (
                        <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>
                          Waiting Host
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-ink-muted">
                      Host: <strong>{req.hostName}</strong> ({req.hostDepartment})
                    </div>

                    <div className="flex items-center gap-3 text-xs text-ink-subtle font-mono tabular-nums">
                      <span>{req.visitorPhone}</span>
                      <span>•</span>
                      <span>Sent {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-slate-50 border border-border group-hover:bg-accent-light group-hover:border-accent/30 transition-colors shrink-0">
                    <ArrowRight className="w-5 h-5 text-ink-subtle group-hover:text-accent" aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GuardLayout>
  );
}
