"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Phone,
  Mail,
  Building,
  RotateCcw,
  X,
  Shield,
} from "lucide-react";
import { AdminLayout } from "@/components/shell/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";

interface AuditLogEntry {
  id: string;
  action: string;
  actorType: string;
  details?: string | null;
  createdAt: string;
}

interface VisitLog {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  idType: string;
  idNumber?: string | null;
  purpose?: string | null;
  status: string;
  hostName: string;
  hostDepartment: string;
  hostEmail: string;
  guardName: string;
  guardUsername: string;
  idPhotoPath?: string | null;
  selfiePath?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  enteredAt?: string | null;
  exitedAt?: string | null;
  auditLogs: AuditLogEntry[];
}

interface SummaryMetrics {
  visitorsToday: number;
  currentlyWaiting: number;
  enteredToday: number;
  deniedToday: number;
}

export default function AdminVisitorLogPage() {
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics>({
    visitorsToday: 0,
    currentlyWaiting: 0,
    enteredToday: 0,
    deniedToday: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<VisitLog | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  // Fetch logs with current filters
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch {
      setToastMessage({ text: "Failed to load visitor log.", type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setDateFilter("");
  };

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    let variant: BadgeVariant = "neutral";
    let label = status;

    switch (status) {
      case "WAITING_HOST":
        variant = "warning";
        label = "Waiting Host";
        break;
      case "APPROVED":
        variant = "accent";
        label = "Approved";
        break;
      case "ENTERED":
        variant = "success";
        label = "Entered Gate";
        break;
      case "EXITED":
        variant = "neutral";
        label = "Exited";
        break;
      case "DENIED":
        variant = "danger";
        label = "Denied";
        break;
      case "LOCKED":
        variant = "danger";
        label = "Locked";
        break;
      case "EXPIRED":
        variant = "danger";
        label = "Expired";
        break;
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  const getActorBadge = (actor: string) => {
    switch (actor) {
      case "GUARD":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">GUARD</span>;
      case "EMPLOYEE":
      case "HOST":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">EMPLOYEE</span>;
      case "ADMIN":
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">ADMIN</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800">SYSTEM</span>;
    }
  };

  return (
    <AdminLayout companyName="VS Techsol" activeSection="LOGS">
      <div className="space-y-6">
        {toastMessage && (
          <Toast
            type={toastMessage.type}
            message={toastMessage.text}
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* ================= 1. SMALL REAL-TIME SUMMARY STRIP ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface border border-border rounded p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Visitors Today</div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.visitorsToday}</div>
            <div className="text-[11px] text-ink-subtle mt-1">Recorded at gate</div>
          </div>

          <div className="bg-surface border border-warning-border/80 rounded p-4 bg-warning-bg/30">
            <div className="text-xs font-bold uppercase tracking-wider text-warning-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span>Currently Waiting</span>
            </div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.currentlyWaiting}</div>
            <div className="text-[11px] text-ink-muted mt-1">Awaiting approval</div>
          </div>

          <div className="bg-surface border border-success-border/80 rounded p-4 bg-success-bg/30">
            <div className="text-xs font-bold uppercase tracking-wider text-success">Entered Today</div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.enteredToday}</div>
            <div className="text-[11px] text-ink-muted mt-1">Verified with OTP</div>
          </div>

          <div className="bg-surface border border-danger-border/80 rounded p-4 bg-danger-bg/30">
            <div className="text-xs font-bold uppercase tracking-wider text-danger">Denied Today</div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.deniedToday}</div>
            <div className="text-[11px] text-ink-muted mt-1">Denied gate entry</div>
          </div>
        </div>

        {/* ================= 2. FILTER & SEARCH TOOLBAR (NO CSV) ================= */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by visitor name or mobile..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink placeholder:text-ink-subtle"
                />
              </div>
              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </form>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink tabular-nums"
                title="Filter by arrival date"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="WAITING_HOST">Waiting Host</option>
                <option value="APPROVED">Approved</option>
                <option value="ENTERED">Entered</option>
                <option value="DENIED">Denied</option>
                <option value="EXPIRED">Expired</option>
                <option value="LOCKED">Locked</option>
                <option value="EXITED">Exited</option>
              </select>

              {(search || statusFilter !== "ALL" || dateFilter) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleClearFilters}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* ================= 3. VISITOR LOG TABLE & CARDS ================= */}
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <Spinner size="lg" className="text-accent" />
            <p className="text-sm text-ink-muted">Loading visitor records...</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No visitor records found"
            description="No gate visit passes match the selected filters."
            action={
              (search || statusFilter !== "ALL" || dateFilter) ? (
                <Button variant="secondary" size="md" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-surface border border-border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-border text-xs font-bold uppercase text-ink-subtle">
                  <tr>
                    <th className="py-3 px-4">Visitor</th>
                    <th className="py-3 px-4">Host Employee</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Arrival Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink">{log.visitorName}</div>
                        <div className="text-xs text-ink-muted font-mono">{log.visitorPhone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink">{log.hostName}</div>
                        <div className="text-xs text-ink-subtle">{log.hostDepartment}</div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(log.status)}</td>
                      <td className="py-3.5 px-4 text-ink-muted tabular-nums">
                        <div>{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="text-xs text-ink-subtle">{new Date(log.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="bg-surface border border-border rounded p-4 space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-ink text-base">{log.visitorName}</h4>
                      <p className="text-xs font-mono text-ink-muted">{log.visitorPhone}</p>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>

                  <div className="text-xs text-ink-subtle space-y-1 border-t border-border pt-2">
                    <div className="flex justify-between">
                      <span>Host:</span>
                      <span className="font-semibold text-ink">{log.hostName} ({log.hostDepartment})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Arrival:</span>
                      <span className="tabular-nums font-medium text-ink">
                        {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ================= 4. DETAIL MODAL (ID PHOTO, ID TYPE & AUDIT TIMELINE) ================= */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-xl font-bold text-ink">Visitor Pass Details</h3>
                  <p className="text-xs text-ink-subtle font-mono">ID: {selectedLog.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="text-ink-subtle hover:text-ink p-1 rounded hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Primary Info */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded border border-border">
                <div>
                  <div className="text-xs font-bold uppercase text-ink-subtle">Current Pass Status</div>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div className="text-right text-xs text-ink-muted">
                  <div>Arrival: {new Date(selectedLog.createdAt).toLocaleDateString()}</div>
                  <div className="font-semibold text-ink">
                    {new Date(selectedLog.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>

              {/* Grid: Visitor & Host Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2 border border-border rounded p-3 bg-slate-50/50">
                  <div className="text-xs font-bold uppercase text-ink-subtle flex items-center gap-1.5 border-b border-border pb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Visitor Details</span>
                  </div>
                  <div>
                    <span className="text-xs text-ink-subtle">Name:</span>
                    <div className="font-bold text-ink">{selectedLog.visitorName}</div>
                  </div>
                  <div>
                    <span className="text-xs text-ink-subtle">Mobile:</span>
                    <div className="font-mono text-ink">{selectedLog.visitorPhone}</div>
                  </div>
                  {selectedLog.purpose && (
                    <div>
                      <span className="text-xs text-ink-subtle">Purpose:</span>
                      <div className="text-ink">{selectedLog.purpose}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border border-border rounded p-3 bg-slate-50/50">
                  <div className="text-xs font-bold uppercase text-ink-subtle flex items-center gap-1.5 border-b border-border pb-1">
                    <Building className="w-3.5 h-3.5" />
                    <span>Host Employee</span>
                  </div>
                  <div>
                    <span className="text-xs text-ink-subtle">Host:</span>
                    <div className="font-bold text-ink">{selectedLog.hostName}</div>
                  </div>
                  <div>
                    <span className="text-xs text-ink-subtle">Department:</span>
                    <div className="text-ink">{selectedLog.hostDepartment}</div>
                  </div>
                  <div>
                    <span className="text-xs text-ink-subtle">Guard on Duty:</span>
                    <div className="text-ink">{selectedLog.guardName} ({selectedLog.guardUsername})</div>
                  </div>
                </div>
              </div>

              {/* ID Card Photo & ID Type (Admin Only) */}
              <div className="border border-border rounded p-4 space-y-3 bg-slate-50/30">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="text-xs font-bold uppercase text-ink-subtle flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-accent" />
                    <span>Verification Document (Admin Only)</span>
                  </div>
                  <Badge variant="accent">
                    {selectedLog.idType?.replace("_", " ") || "ID DOCUMENT"}
                  </Badge>
                </div>

                {selectedLog.idNumber && (
                  <div className="flex items-center justify-between bg-surface border border-border rounded px-3.5 py-2.5 text-sm">
                    <span className="text-ink-muted font-medium">Recorded ID Number</span>
                    <span className="font-mono font-bold text-ink tracking-wide">
                      {selectedLog.idNumber}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center p-2">
                  {selectedLog.idPhotoPath && (
                    <div className="text-center space-y-1">
                      <div className="w-56 h-36 border border-border rounded overflow-hidden bg-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            selectedLog.idPhotoPath.startsWith("/api/uploads/")
                              ? selectedLog.idPhotoPath
                              : `/api/uploads/${selectedLog.idPhotoPath.replace(/^uploads\//, "")}`
                          }
                          alt="Visitor ID Document"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-ink-muted font-medium">Captured ID Card</span>
                    </div>
                  )}

                  {selectedLog.selfiePath && (
                    <div className="text-center space-y-1">
                      <div className="w-36 h-36 border border-border rounded overflow-hidden bg-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            selectedLog.selfiePath.startsWith("/api/uploads/")
                              ? selectedLog.selfiePath
                              : `/api/uploads/${selectedLog.selfiePath.replace(/^uploads\//, "")}`
                          }
                          alt="Visitor Face Photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-ink-muted font-medium">Visitor Face</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Audit Trail Timeline */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="text-xs font-bold uppercase text-ink-subtle flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Audit Trail Timeline</span>
                </div>

                <div className="border-l-2 border-border ml-2 pl-4 space-y-3">
                  {selectedLog.auditLogs && selectedLog.auditLogs.length > 0 ? (
                    selectedLog.auditLogs.map((logEntry) => (
                      <div key={logEntry.id} className="relative text-xs space-y-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400 absolute -left-[21px] top-1 border-2 border-surface" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{logEntry.action}</span>
                          {getActorBadge(logEntry.actorType)}
                          <span className="text-ink-subtle tabular-nums ml-auto">
                            {new Date(logEntry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        {logEntry.details && (
                          <div className="text-ink-muted text-[11px]">{logEntry.details}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-ink-subtle">No audit history recorded.</div>
                  )}
                </div>
              </div>

              <div className="pt-2 text-right">
                <Button size="md" variant="secondary" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
