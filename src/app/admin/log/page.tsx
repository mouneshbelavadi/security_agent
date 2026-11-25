"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  Clock,
  User,
  Building,
  RotateCcw,
  X,
  Shield,
  CreditCard,
  Image as ImageIcon,
  ExternalLink,
  Users,
  Activity,
  ClipboardList,
  History,
  ChevronLeft,
  ChevronRight,
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
  visitRequestId?: string | null;
  visitorId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  actorUsername?: string | null;
  targetUserId?: string | null;
  targetName?: string | null;
  action: string;
  actorType: string;
  details?: string | null;
  createdAt: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitNumber?: number | null;
  visitStatus?: string | null;
}

interface VisitLog {
  id: string;
  visitorId?: string | null;
  visitNumber: number;
  visitorTotalVisits: number;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  idType: string;
  idNumber?: string | null;
  purpose?: string | null;
  status: string;
  hostId: string;
  hostName: string;
  hostDepartment: string;
  hostEmail: string;
  guardId: string;
  guardName: string;
  guardUsername: string;
  idPhotoPath?: string | null;
  selfiePath?: string | null;
  emailFailed?: boolean;
  otpAttempts?: number;
  createdAt: string;
  expiresAt?: string | null;
  approvedAt?: string | null;
  enteredAt?: string | null;
  exitedAt?: string | null;
  auditLogs: AuditLogEntry[];
}

interface VisitorProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  visitCount: number;
  firstVisitAt: string;
  lastVisitAt: string;
  lastIdType: string;
  lastIdNumber?: string | null;
  lastIdPhotoPath?: string | null;
  lastSelfiePath?: string | null;
  visits: VisitLog[];
}

interface SummaryMetrics {
  visitorsToday: number;
  currentlyWaiting: number;
  enteredToday: number;
  deniedToday: number;
  totalVisitsAllTime: number;
  uniqueVisitorsCount: number;
}

interface StaffOption {
  id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
}

interface HostOption {
  id: string;
  name: string;
  department: string;
  email: string;
}

const ID_TYPE_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  DRIVING_LICENCE: "Driving Licence",
  VOTER_ID: "Voter ID",
  PASSPORT: "Passport",
  PAN: "PAN Card",
  OTHER: "Other ID",
};

function formatIdTypeLabel(idType?: string | null): string {
  if (!idType) return "ID Document";
  return ID_TYPE_LABELS[idType] || idType.replace(/_/g, " ");
}

function getUploadUrl(path?: string | null): string | null {
  if (!path) return null;
  return path.startsWith("/api/uploads/")
    ? path
    : `/api/uploads/${path.replace(/^uploads\//, "")}`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AdminVisitorLogPage() {
  const [activeTab, setActiveTab] = useState<"VISITS" | "VISITORS" | "ACTIVITY">("VISITS");

  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [visitors, setVisitors] = useState<VisitorProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLogEntry[]>([]);

  const [summary, setSummary] = useState<SummaryMetrics>({
    visitorsToday: 0,
    currentlyWaiting: 0,
    enteredToday: 0,
    deniedToday: 0,
    totalVisitsAllTime: 0,
    uniqueVisitorsCount: 0,
  });

  const [guardOptions, setGuardOptions] = useState<StaffOption[]>([]);
  const [hostOptions, setHostOptions] = useState<HostOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [hostFilter, setHostFilter] = useState("ALL");
  const [guardFilter, setGuardFilter] = useState("ALL");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [visitorFilter, setVisitorFilter] = useState<{ id: string; label: string } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedLog, setSelectedLog] = useState<VisitLog | null>(null);
  const [selectedVisitorProfile, setSelectedVisitorProfile] = useState<VisitorProfile | null>(null);
  const [idImageError, setIdImageError] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  const openLogDetails = (log: VisitLog) => {
    setIdImageError(false);
    setSelectedLog(log);
  };

  const openVisitorHistoryById = (visitorId?: string | null) => {
    if (!visitorId) return;
    const match = visitors.find((v) => v.id === visitorId);
    if (match) {
      setSelectedLog(null);
      setSelectedVisitorProfile(match);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);
      if (hostFilter && hostFilter !== "ALL") params.append("hostId", hostFilter);
      if (guardFilter && guardFilter !== "ALL") params.append("guardId", guardFilter);
      if (actorFilter && actorFilter !== "ALL") params.append("actorUserId", actorFilter);
      if (visitorFilter) params.append("visitorId", visitorFilter.id);
      if (search.trim()) params.append("search", search.trim());
      params.append("page", String(page));
      params.append("limit", "100");

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setVisitors(data.visitors || []);
      setActivityLogs(data.activityLogs || []);
      if (data.summary) setSummary(data.summary);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.totalCount || 0);
      }
      if (data.filterOptions) {
        setGuardOptions(data.filterOptions.guards || []);
        setHostOptions(data.filterOptions.hosts || []);
        setStaffOptions(data.filterOptions.staff || []);
      }
    } catch {
      setToastMessage({ text: "Failed to load visitor log.", type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, hostFilter, guardFilter, actorFilter, visitorFilter, search, page]);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter, hostFilter, guardFilter, actorFilter, visitorFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) {
      setPage(1);
    } else {
      fetchLogs();
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setDateFilter("");
    setHostFilter("ALL");
    setGuardFilter("ALL");
    setActorFilter("ALL");
    setVisitorFilter(null);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
      statusFilter !== "ALL" ||
      dateFilter ||
      hostFilter !== "ALL" ||
      guardFilter !== "ALL" ||
      actorFilter !== "ALL" ||
      visitorFilter
  );

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

  const selectedIdPhotoUrl = getUploadUrl(selectedLog?.idPhotoPath);
  const selectedSelfieUrl = getUploadUrl(selectedLog?.selfiePath);
  const selectedVisitorOtherVisits =
    selectedLog?.visitorId
      ? visitors.find((v) => v.id === selectedLog.visitorId)?.visits || []
      : [];

  return (
    <AdminLayout companyName="VS Techsol" activeSection="LOGS">
      <div className="space-y-5">
        {toastMessage && (
          <Toast
            type={toastMessage.type}
            message={toastMessage.text}
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* ================= 1. REAL-TIME SUMMARY STRIP ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface border border-border rounded p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Visitors Today</div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.visitorsToday}</div>
            <div className="text-[11px] text-ink-subtle mt-1">All-time visits: {summary.totalVisitsAllTime}</div>
          </div>

          <div className="bg-surface border border-warning-border/80 rounded p-4 bg-warning-bg/30">
            <div className="text-xs font-bold uppercase tracking-wider text-warning-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span>Currently Waiting</span>
            </div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.currentlyWaiting}</div>
            <div className="text-[11px] text-ink-muted mt-1">Awaiting host approval</div>
          </div>

          <div className="bg-surface border border-success-border/80 rounded p-4 bg-success-bg/30">
            <div className="text-xs font-bold uppercase tracking-wider text-success">Entered Today</div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.enteredToday}</div>
            <div className="text-[11px] text-ink-muted mt-1">Unique visitors: {summary.uniqueVisitorsCount}</div>
          </div>

          <div className="bg-surface border border-danger-border/80 rounded p-4 bg-danger-bg/30">
            <div className="text-xs font-bold uppercase tracking-wider text-danger">Denied Today</div>
            <div className="text-3xl font-extrabold text-ink mt-1 tabular-nums">{summary.deniedToday}</div>
            <div className="text-[11px] text-ink-muted mt-1">Denied gate entry</div>
          </div>
        </div>

        {/* ================= 2. VIEW MODE TABS ================= */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <Button
            size="sm"
            variant={activeTab === "VISITS" ? "accent" : "secondary"}
            onClick={() => setActiveTab("VISITS")}
            leftIcon={<ClipboardList className="w-4 h-4" />}
          >
            All Visit Logs ({totalCount})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "VISITORS" ? "accent" : "secondary"}
            onClick={() => setActiveTab("VISITORS")}
            leftIcon={<Users className="w-4 h-4" />}
          >
            Same-Visitor Histories ({visitors.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "ACTIVITY" ? "accent" : "secondary"}
            onClick={() => setActiveTab("ACTIVITY")}
            leftIcon={<Activity className="w-4 h-4" />}
          >
            All User & System Activity ({activityLogs.length})
          </Button>
        </div>

        {/* ================= 3. FILTER & SEARCH TOOLBAR ================= */}
        <Card className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by visitor name, mobile, email, ID number, host, or guard..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink placeholder:text-ink-subtle"
                />
              </div>
              <Button type="submit" variant="secondary" size="md">
                Search
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink tabular-nums"
                title="Filter by date"
              />

              {activeTab === "VISITS" && (
                <>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="WAITING_HOST">Waiting Host</option>
                    <option value="APPROVED">Approved</option>
                    <option value="ENTERED">Entered</option>
                    <option value="EXITED">Exited</option>
                    <option value="DENIED">Denied</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="LOCKED">Locked</option>
                  </select>

                  <select
                    value={hostFilter}
                    onChange={(e) => {
                      setHostFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink font-medium"
                  >
                    <option value="ALL">All Host Employees</option>
                    {hostOptions.map((h) => (
                      <option key={h.id} value={h.id}>
                        Host: {h.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={guardFilter}
                    onChange={(e) => {
                      setGuardFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink font-medium"
                  >
                    <option value="ALL">All Guards</option>
                    {guardOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        Guard: {g.name} ({g.username})
                      </option>
                    ))}
                  </select>
                </>
              )}

              {activeTab === "VISITORS" && (
                <>
                  <select
                    value={hostFilter}
                    onChange={(e) => setHostFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink font-medium"
                  >
                    <option value="ALL">Visited Any Host</option>
                    {hostOptions.map((h) => (
                      <option key={h.id} value={h.id}>
                        Met Host: {h.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={guardFilter}
                    onChange={(e) => setGuardFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink font-medium"
                  >
                    <option value="ALL">Checked In by Any Guard</option>
                    {guardOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        Guard: {g.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {activeTab === "ACTIVITY" && (
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded focus:border-accent bg-surface text-ink font-medium"
                >
                  <option value="ALL">All Staff Users</option>
                  {staffOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.role}] {u.name} ({u.username})
                    </option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
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

          {visitorFilter && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-accent-light border border-accent/20 text-xs">
              <span className="font-semibold text-ink">
                Filtered to same visitor: <strong>{visitorFilter.label}</strong>
              </span>
              <button
                type="button"
                onClick={() => setVisitorFilter(null)}
                className="font-semibold text-accent hover:underline cursor-pointer"
              >
                Show All Visitors
              </button>
            </div>
          )}
        </Card>

        {/* ================= 4. ACTIVE TAB CONTENT ================= */}
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <Spinner size="lg" className="text-accent" />
            <p className="text-sm text-ink-muted">Loading logs and user histories...</p>
          </div>
        ) : activeTab === "VISITS" ? (
          logs.length === 0 ? (
            <EmptyState
              title="No visitor records found"
              description="No gate visit passes match the selected filters."
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" size="md" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-surface border border-border rounded overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-border text-xs font-bold uppercase text-ink-subtle">
                    <tr>
                      <th className="py-3 px-4">Visitor</th>
                      <th className="py-3 px-4">Host & Guard</th>
                      <th className="py-3 px-4">ID / Aadhaar</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Arrival / Exit</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => {
                      const idPhotoUrl = getUploadUrl(log.idPhotoPath);
                      return (
                        <tr
                          key={log.id}
                          onClick={() => openLogDetails(log)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-ink">{log.visitorName}</span>
                              {log.visitorTotalVisits > 1 && (
                                <Badge variant="accent">
                                  Visit #{log.visitNumber} of {log.visitorTotalVisits}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-ink-muted font-mono">{log.visitorPhone}</div>
                            <div className="text-xs text-ink-subtle truncate max-w-[200px]">{log.visitorEmail}</div>
                            {log.visitorId && log.visitorTotalVisits > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openVisitorHistoryById(log.visitorId);
                                }}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                              >
                                <History className="w-3 h-3" />
                                <span>View all {log.visitorTotalVisits} visits</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-ink">{log.hostName}</div>
                            <div className="text-xs text-ink-subtle">{log.hostDepartment}</div>
                            <div className="text-[11px] text-ink-muted mt-0.5">
                              Guard: {log.guardName} ({log.guardUsername})
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {idPhotoUrl && (
                                <div className="w-11 h-8 shrink-0 rounded border border-border overflow-hidden bg-slate-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={idPhotoUrl}
                                    alt={`${formatIdTypeLabel(log.idType)} preview`}
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="text-xs font-semibold text-ink">
                                  {formatIdTypeLabel(log.idType)}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {idPhotoUrl && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                                      <ImageIcon className="w-3 h-3" />
                                      <span>Photo Uploaded</span>
                                    </span>
                                  )}
                                  {log.idNumber && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-muted">
                                      <CreditCard className="w-3 h-3" />
                                      <span>{log.idNumber}</span>
                                    </span>
                                  )}
                                  {!idPhotoUrl && !log.idNumber && (
                                    <span className="text-[11px] text-ink-subtle">Not provided</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(log.status)}</td>
                          <td className="py-3.5 px-4 text-ink-muted tabular-nums text-xs space-y-0.5">
                            <div className="font-semibold text-ink">
                              In: {formatTime(log.createdAt)}
                            </div>
                            <div className="text-ink-subtle">{new Date(log.createdAt).toLocaleDateString()}</div>
                            {log.exitedAt && (
                              <div className="text-ink-muted">Out: {formatTime(log.exitedAt)}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLogDetails(log);
                              }}
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              View ID & Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {logs.map((log) => {
                  const idPhotoUrl = getUploadUrl(log.idPhotoPath);
                  return (
                    <div
                      key={log.id}
                      onClick={() => openLogDetails(log)}
                      className="bg-surface border border-border rounded p-4 space-y-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-bold text-ink text-base">{log.visitorName}</h4>
                            {log.visitorTotalVisits > 1 && (
                              <Badge variant="accent">
                                Visit #{log.visitNumber} of {log.visitorTotalVisits}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-mono text-ink-muted">{log.visitorPhone}</p>
                          <p className="text-xs text-ink-subtle">{log.visitorEmail}</p>
                        </div>
                        {getStatusBadge(log.status)}
                      </div>

                      <div className="text-xs text-ink-subtle space-y-1.5 border-t border-border pt-2">
                        <div className="flex justify-between gap-2">
                          <span>Host:</span>
                          <span className="font-semibold text-ink text-right">{log.hostName} ({log.hostDepartment})</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Guard:</span>
                          <span className="text-ink text-right">{log.guardName} ({log.guardUsername})</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>ID Document:</span>
                          <span className="font-semibold text-ink text-right">
                            {formatIdTypeLabel(log.idType)}
                            {log.idNumber ? ` (${log.idNumber})` : ""}
                            {idPhotoUrl ? " - Photo Uploaded" : !log.idNumber ? " - Not provided" : ""}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Arrival:</span>
                          <span className="tabular-nums font-medium text-ink">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLogDetails(log);
                          }}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View ID & Pass Details
                        </Button>
                        {log.visitorId && log.visitorTotalVisits > 1 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openVisitorHistoryById(log.visitorId);
                            }}
                            leftIcon={<History className="w-3.5 h-3.5" />}
                          >
                            All ({log.visitorTotalVisits})
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-surface border border-border rounded px-4 py-3 text-xs">
                  <span className="text-ink-muted">
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total records)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
        ) : activeTab === "VISITORS" ? (
          visitors.length === 0 ? (
            <EmptyState
              title="No visitor profiles found"
              description="No returning or checked-in visitors match the current filters."
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" size="md" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {visitors.map((visitor) => {
                const latestPhotoUrl = getUploadUrl(visitor.lastIdPhotoPath);
                const latestVisit = visitor.visits[0];
                return (
                  <div
                    key={visitor.id}
                    className="bg-surface border border-border rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {latestPhotoUrl ? (
                        <div className="w-16 h-12 shrink-0 rounded border border-border overflow-hidden bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={latestPhotoUrl}
                            alt={`${visitor.name} latest ID`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 shrink-0 rounded border border-border bg-slate-100 flex items-center justify-center text-ink-subtle">
                          <User className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-ink">{visitor.name}</h3>
                          <Badge variant="accent">
                            {visitor.visitCount} {visitor.visitCount === 1 ? "visit" : "visits"}
                          </Badge>
                          {latestVisit && getStatusBadge(latestVisit.status)}
                        </div>
                        <div className="text-xs font-mono text-ink-muted">
                          {visitor.phone} • {visitor.email}
                        </div>
                        <div className="text-xs text-ink-subtle flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            Latest ID: <strong>{formatIdTypeLabel(visitor.lastIdType)}</strong>
                            {visitor.lastIdNumber ? ` (${visitor.lastIdNumber})` : latestPhotoUrl ? " (Photo Uploaded)" : ""}
                          </span>
                          <span>Last Visit: {formatDateTime(visitor.lastVisitAt)}</span>
                          {latestVisit && (
                            <span>
                              Last Met: <strong>{latestVisit.hostName}</strong> ({latestVisit.hostDepartment})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => setSelectedVisitorProfile(visitor)}
                        leftIcon={<History className="w-3.5 h-3.5" />}
                      >
                        View All Visits & IDs ({visitor.visitCount})
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setVisitorFilter({
                            id: visitor.id,
                            label: `${visitor.name} (${visitor.phone})`,
                          });
                          setActiveTab("VISITS");
                          setPage(1);
                        }}
                      >
                        Filter Visit Table
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activityLogs.length === 0 ? (
          <EmptyState
            title="No activity logs found"
            description="No audit events match the selected staff user or search filter."
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="md" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="bg-surface border border-border rounded overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-border text-xs font-bold uppercase text-ink-subtle">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor (User)</th>
                  <th className="py-3 px-4">Event / Action</th>
                  <th className="py-3 px-4">Visitor / Target</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activityLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-xs text-ink-muted tabular-nums whitespace-nowrap">
                      <div>{new Date(entry.createdAt).toLocaleDateString()}</div>
                      <div>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getActorBadge(entry.actorType)}
                        <span className="font-semibold text-ink text-xs">
                          {entry.actorName || (entry.actorType === "SYSTEM" ? "System" : "-")}
                        </span>
                      </div>
                      {entry.actorUsername && (
                        <div className="text-[11px] font-mono text-ink-subtle mt-0.5">{entry.actorUsername}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-ink">{entry.action}</span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {entry.visitorName ? (
                        <div>
                          <span className="font-semibold text-ink">{entry.visitorName}</span>
                          {entry.visitNumber ? (
                            <span className="ml-1.5 text-ink-subtle">(Visit #{entry.visitNumber})</span>
                          ) : null}
                          {entry.visitorPhone && (
                            <div className="font-mono text-ink-muted">{entry.visitorPhone}</div>
                          )}
                        </div>
                      ) : entry.targetName ? (
                        <span className="text-ink font-medium">User: {entry.targetName}</span>
                      ) : (
                        <span className="text-ink-subtle">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-muted max-w-md">
                      {entry.details || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= 5. VISIT PASS DETAIL MODAL (ID PHOTO, TIMELINE & SAME VISITOR HISTORY) ================= */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-border pb-3 gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-ink">Visitor Pass Details</h3>
                    <Badge variant="accent">
                      Visit #{selectedLog.visitNumber} of {selectedLog.visitorTotalVisits}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-subtle font-mono mt-0.5">Pass ID: {selectedLog.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="text-ink-subtle hover:text-ink p-1 rounded hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Lifecycle Timestamps */}
              <div className="bg-slate-50 p-4 rounded border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase text-ink-subtle">Current Pass Status</div>
                    <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  {selectedLog.visitorId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openVisitorHistoryById(selectedLog.visitorId)}
                      leftIcon={<History className="w-3.5 h-3.5" />}
                    >
                      All Visits ({selectedLog.visitorTotalVisits})
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-ink-subtle block">Arrived</span>
                    <span className="font-semibold text-ink tabular-nums">{formatTime(selectedLog.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-ink-subtle block">Approved</span>
                    <span className="font-semibold text-ink tabular-nums">{formatTime(selectedLog.approvedAt)}</span>
                  </div>
                  <div>
                    <span className="text-ink-subtle block">Entered Gate</span>
                    <span className="font-semibold text-ink tabular-nums">{formatTime(selectedLog.enteredAt)}</span>
                  </div>
                  <div>
                    <span className="text-ink-subtle block">Exited Gate</span>
                    <span className="font-semibold text-ink tabular-nums">{formatTime(selectedLog.exitedAt)}</span>
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
                  <div>
                    <span className="text-xs text-ink-subtle">Email:</span>
                    <div className="text-ink break-all">{selectedLog.visitorEmail}</div>
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
                    <span>Host Employee & Guard</span>
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
                    {formatIdTypeLabel(selectedLog.idType)}
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

                {selectedIdPhotoUrl || selectedSelfieUrl ? (
                  <div className="flex flex-col sm:flex-row gap-4 items-start justify-center p-1">
                    {selectedIdPhotoUrl && (
                      <div className="w-full sm:w-auto flex-1 max-w-md space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink-muted">
                            Uploaded ID Card ({formatIdTypeLabel(selectedLog.idType)})
                          </span>
                          <a
                            href={selectedIdPhotoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                          >
                            <span>Open Full Image</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {idImageError ? (
                          <div className="border border-danger-border bg-danger-bg/40 rounded p-4 text-xs text-danger text-center">
                            ID photo could not be rendered inline. Use Open Full Image above to inspect it directly.
                          </div>
                        ) : (
                          <a
                            href={selectedIdPhotoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border border-border rounded overflow-hidden bg-surface hover:border-accent transition-colors"
                            title="Click to open full-size ID image"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selectedIdPhotoUrl}
                              alt={`${formatIdTypeLabel(selectedLog.idType)} Document`}
                              onError={() => setIdImageError(true)}
                              className="w-full max-h-72 object-contain bg-slate-50"
                            />
                          </a>
                        )}
                      </div>
                    )}

                    {selectedSelfieUrl && (
                      <div className="text-center space-y-1.5 shrink-0 mx-auto sm:mx-0">
                        <div className="w-40 h-40 border border-border rounded overflow-hidden bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedSelfieUrl}
                            alt="Visitor Face Photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-ink-muted font-medium block">Visitor Face</span>
                      </div>
                    )}
                  </div>
                ) : (
                  !selectedLog.idNumber && (
                    <div className="text-xs text-ink-muted bg-surface border border-border rounded p-3 text-center">
                      No ID card photo or ID number was recorded for this visit.
                    </div>
                  )
                )}
              </div>

              {/* Other Visits by Same Visitor (Quick Switcher) */}
              {selectedVisitorOtherVisits.length > 1 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="text-xs font-bold uppercase text-ink-subtle flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>All Visits by {selectedLog.visitorName} ({selectedVisitorOtherVisits.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedVisitorOtherVisits.map((other) => (
                      <button
                        key={other.id}
                        type="button"
                        onClick={() => openLogDetails(other)}
                        className={`w-full text-left px-3 py-2 rounded border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          other.id === selectedLog.id
                            ? "bg-accent-light border-accent font-semibold"
                            : "bg-slate-50 border-border hover:bg-slate-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-ink">Visit #{other.visitNumber}</span>
                          <span className="text-ink-muted ml-2">
                            {new Date(other.createdAt).toLocaleDateString()} {formatTime(other.createdAt)} • Met {other.hostName}
                          </span>
                        </div>
                        {getStatusBadge(other.status)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-ink">{logEntry.action}</span>
                          {getActorBadge(logEntry.actorType)}
                          {logEntry.actorName && (
                            <span className="text-ink-muted">by {logEntry.actorName}</span>
                          )}
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

        {/* ================= 6. SAME-VISITOR COMPLETE HISTORY MODAL ================= */}
        {selectedVisitorProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-border pb-3 gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-ink">{selectedVisitorProfile.name}</h3>
                    <Badge variant="accent">
                      {selectedVisitorProfile.visitCount} Total {selectedVisitorProfile.visitCount === 1 ? "Visit" : "Visits"}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-ink-muted mt-1">
                    {selectedVisitorProfile.phone} • {selectedVisitorProfile.email}
                  </p>
                  <p className="text-xs text-ink-subtle mt-0.5">
                    First seen: {formatDateTime(selectedVisitorProfile.firstVisitAt)} • Latest visit: {formatDateTime(selectedVisitorProfile.lastVisitAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVisitorProfile(null)}
                  className="text-ink-subtle hover:text-ink p-1 rounded hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Latest Verified ID Card Summary */}
              <div className="border border-border rounded p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-ink-subtle flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-accent" />
                    <span>Latest ID Document on File</span>
                  </span>
                  <Badge variant="accent">{formatIdTypeLabel(selectedVisitorProfile.lastIdType)}</Badge>
                </div>

                {selectedVisitorProfile.lastIdNumber && (
                  <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2 text-xs">
                    <span className="text-ink-muted font-medium">ID Number</span>
                    <span className="font-mono font-bold text-ink">{selectedVisitorProfile.lastIdNumber}</span>
                  </div>
                )}

                {getUploadUrl(selectedVisitorProfile.lastIdPhotoPath) && (
                  <div className="max-w-sm space-y-1.5">
                    <a
                      href={getUploadUrl(selectedVisitorProfile.lastIdPhotoPath) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <span>Open Full Latest ID Photo</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="border border-border rounded overflow-hidden bg-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getUploadUrl(selectedVisitorProfile.lastIdPhotoPath) || ""}
                        alt="Visitor Latest ID"
                        className="w-full max-h-56 object-contain bg-slate-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Every Visit Made by This Same Visitor */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase text-ink-subtle">
                  Complete Visit Timeline ({selectedVisitorProfile.visits.length})
                </div>
                <div className="space-y-3">
                  {selectedVisitorProfile.visits.map((v) => {
                    const visitIdUrl = getUploadUrl(v.idPhotoPath);
                    return (
                      <div key={v.id} className="border border-border rounded p-4 space-y-3 bg-surface">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-ink">Visit #{v.visitNumber}</span>
                            {getStatusBadge(v.status)}
                            <span className="text-xs text-ink-subtle">
                              {formatDateTime(v.createdAt)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedVisitorProfile(null);
                              openLogDetails(v);
                            }}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Inspect Full Pass
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-ink-subtle block">Host Met</span>
                            <span className="font-semibold text-ink">{v.hostName} ({v.hostDepartment})</span>
                          </div>
                          <div>
                            <span className="text-ink-subtle block">Checked In By</span>
                            <span className="font-semibold text-ink">{v.guardName} ({v.guardUsername})</span>
                          </div>
                          <div>
                            <span className="text-ink-subtle block">ID Submitted</span>
                            <span className="font-semibold text-ink">
                              {formatIdTypeLabel(v.idType)}
                              {v.idNumber ? ` (${v.idNumber})` : ""}
                            </span>
                            {visitIdUrl && (
                              <a
                                href={visitIdUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline ml-1.5"
                              >
                                <span>Photo</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-border rounded p-2 text-[11px]">
                          <div>
                            <span className="text-ink-subtle block">Arrived</span>
                            <span className="font-medium text-ink tabular-nums">{formatTime(v.createdAt)}</span>
                          </div>
                          <div>
                            <span className="text-ink-subtle block">Approved</span>
                            <span className="font-medium text-ink tabular-nums">{formatTime(v.approvedAt)}</span>
                          </div>
                          <div>
                            <span className="text-ink-subtle block">Entered</span>
                            <span className="font-medium text-ink tabular-nums">{formatTime(v.enteredAt)}</span>
                          </div>
                          <div>
                            <span className="text-ink-subtle block">Exited</span>
                            <span className="font-medium text-ink tabular-nums">{formatTime(v.exitedAt)}</span>
                          </div>
                        </div>

                        {v.auditLogs.length > 0 && (
                          <div className="text-[11px] space-y-1 pt-1">
                            <span className="font-bold uppercase text-ink-subtle">Events ({v.auditLogs.length})</span>
                            {v.auditLogs.map((a) => (
                              <div key={a.id} className="flex flex-wrap items-center gap-1.5 text-ink-muted">
                                <span className="font-mono text-ink-subtle tabular-nums">
                                  {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="font-mono font-semibold text-ink">{a.action}</span>
                                <span>- {a.details}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => {
                    setVisitorFilter({
                      id: selectedVisitorProfile.id,
                      label: `${selectedVisitorProfile.name} (${selectedVisitorProfile.phone})`,
                    });
                    setSelectedVisitorProfile(null);
                    setActiveTab("VISITS");
                    setPage(1);
                  }}
                >
                  Filter Table to This Visitor
                </Button>
                <Button size="md" variant="primary" onClick={() => setSelectedVisitorProfile(null)}>
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
