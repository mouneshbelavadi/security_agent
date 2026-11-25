"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  FileText,
  Search,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  Send,
  Building,
  Mail,
  UserCheck,
  CreditCard,
} from "lucide-react";
import { GuardLayout } from "@/components/shell/GuardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/components/I18nProvider";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

interface ReturningVisitorMatch {
  id: string;
  name: string;
  email: string;
  phone: string;
  visitCount: number;
  lastVisitAt: string;
  lastIdType: "AADHAAR" | "DRIVING_LICENCE" | "VOTER_ID" | "PASSPORT" | "PAN" | "OTHER";
  lastIdNumber?: string | null;
  lastIdPhotoPath?: string | null;
  lastSelfiePath?: string | null;
  lastPurpose?: string | null;
  lastHost?: {
    id: string;
    name: string;
    email: string;
    department: string;
    isActive: boolean;
  } | null;
}

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}

/**
 * Compresses large mobile camera images client-side so uploads stay fast
 * and well within serverless body size limits (e.g. Vercel's 4.5 MB limit).
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= 900 * 1024) return file;
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
    const maxDim = 1200;
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

export default function NewVisitorPage() {
  const router = useRouter();
  const { t } = useI18n();

  // Wizard state: 1, 2, or 3
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Returning Visitor Lookup
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<ReturningVisitorMatch[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [matchedVisitor, setMatchedVisitor] = useState<ReturningVisitorMatch | null>(null);

  // Step 1: Visitor Details
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [purpose, setPurpose] = useState("");

  // Step 2: Employee Host Selection
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [hostSearch, setHostSearch] = useState("");
  const [selectedHost, setSelectedHost] = useState<Employee | null>(null);

  // Step 3: ID Verification (Photo OR Number) & Confirmation
  type IdTypeOption = "AADHAAR" | "DRIVING_LICENCE" | "VOTER_ID" | "PASSPORT" | "PAN" | "OTHER";
  const [selectedIdType, setSelectedIdType] = useState<IdTypeOption>("AADHAAR");
  const [idMethod, setIdMethod] = useState<"PHOTO" | "NUMBER">("PHOTO");
  const [idNumber, setIdNumber] = useState("");
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null);
  const [savedIdPhotoPath, setSavedIdPhotoPath] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [savedSelfiePath, setSavedSelfiePath] = useState<string | null>(null);

  // UI status
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    setEmployeesError(null);
    try {
      const res = await fetch("/api/employees");
      if (res.status === 401) {
        router.push("/login?callbackUrl=/guard/new");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setEmployeesError(errData.error || "Failed to load employees.");
        return;
      }
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error("Failed to load employees:", err);
      setEmployeesError("Network error loading employees.");
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced returning visitor lookup from phone, email, or search bar
  useEffect(() => {
    const query =
      lookupQuery.trim() ||
      (visitorPhone.replace(/\D/g, "").length >= 5 ? visitorPhone.replace(/\D/g, "") : "") ||
      (visitorEmail.trim().length >= 5 && visitorEmail.includes("@") ? visitorEmail.trim() : "");

    if (!query || query.length < 2) {
      setLookupResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await fetch(`/api/visitors/lookup?q=${encodeURIComponent(query)}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setLookupResults(data.visitors || []);
        }
      } catch {
        // Non-blocking convenience lookup
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lookupQuery, visitorPhone, visitorEmail]);

  const handleApplyReturningVisitor = (v: ReturningVisitorMatch) => {
    setMatchedVisitor(v);
    setVisitorName(v.name);
    if (v.email) setVisitorEmail(v.email);
    setVisitorPhone(v.phone);
    if (v.lastPurpose && !purpose) setPurpose(v.lastPurpose);
    setSelectedIdType(v.lastIdType || "AADHAAR");

    if (v.lastIdPhotoPath) {
      setIdMethod("PHOTO");
      setIdPhotoFile(null);
      setSavedIdPhotoPath(v.lastIdPhotoPath);
      setIdPhotoPreview(v.lastIdPhotoPath);
    } else if (v.lastIdNumber) {
      setIdMethod("NUMBER");
      setIdNumber(v.lastIdNumber);
      setSavedIdPhotoPath(null);
      setIdPhotoPreview(null);
    }

    if (v.lastSelfiePath) {
      setSelfieFile(null);
      setSavedSelfiePath(v.lastSelfiePath);
      setSelfiePreview(v.lastSelfiePath);
    }

    if (v.lastHost?.isActive) {
      const activeEmp = employees.find((e) => e.id === v.lastHost?.id);
      if (activeEmp) {
        setSelectedHost(activeEmp);
      }
    }

    setError(null);
  };

  // Filtered employees in Step 2
  const filteredEmployees = employees.filter((emp) => {
    if (!hostSearch.trim()) return true;
    const query = hostSearch.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query)
    );
  });

  // Step 1 validation
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!visitorName.trim()) {
      setError(t("enterNameError"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!visitorEmail.trim() || !emailRegex.test(visitorEmail.trim())) {
      setError(t("enterEmailError"));
      return;
    }

    const cleanPhone = visitorPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError(t("enterPhoneError"));
      return;
    }

    setStep(2);
  };

  // Step 2 validation
  const handleStep2Next = () => {
    setError(null);
    if (!selectedHost) {
      setError(t("selectHostError"));
      return;
    }
    setStep(3);
  };

  // Step 3 file selectors
  const handleIdPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const processed = await compressImageIfNeeded(file);
      if (processed.size > 4 * 1024 * 1024) {
        setError("ID Photo exceeds 4 MB maximum size.");
        return;
      }
      setIdPhotoFile(processed);
      setSavedIdPhotoPath(null);
      setIdPhotoPreview(URL.createObjectURL(processed));
      setError(null);
    }
  };

  const handleSelfieSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const processed = await compressImageIfNeeded(file);
      if (processed.size > 4 * 1024 * 1024) {
        setError("Visitor photo exceeds 4 MB maximum size.");
        return;
      }
      setSelfieFile(processed);
      setSavedSelfiePath(null);
      setSelfiePreview(URL.createObjectURL(processed));
      setError(null);
    }
  };

  const isIdStepComplete =
    idMethod === "PHOTO"
      ? Boolean(idPhotoFile || savedIdPhotoPath)
      : idNumber.trim().length >= 4;

  // Final Submit
  const handleFinalSubmit = async () => {
    setError(null);

    if (idMethod === "PHOTO" && !idPhotoFile && !savedIdPhotoPath) {
      setError(t("uploadPhotoError"));
      return;
    }

    if (idMethod === "NUMBER" && idNumber.trim().length < 4) {
      setError("Please enter a valid ID number (minimum 4 characters).");
      return;
    }

    if (!selectedHost) {
      setError(t("selectHostError"));
      setStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload ID Photo (only if PHOTO option selected & new file uploaded; reuse saved path if kept)
      let idPhotoPath: string | undefined = undefined;
      if (idMethod === "PHOTO") {
        if (idPhotoFile) {
          const idFormData = new FormData();
          idFormData.append("file", idPhotoFile);

          const idRes = await fetch("/api/upload", {
            method: "POST",
            body: idFormData,
          });

          if (!idRes.ok) {
            const idErr = await idRes.json();
            throw new Error(idErr.error || "Failed to upload ID photo.");
          }
          const idData = await idRes.json();
          idPhotoPath = idData.path;
        } else if (savedIdPhotoPath) {
          idPhotoPath = savedIdPhotoPath;
        }
      }

      // 2. Upload optional selfie photo (or reuse saved selfie)
      let selfiePath: string | undefined = undefined;
      if (selfieFile) {
        const selfieFormData = new FormData();
        selfieFormData.append("file", selfieFile);

        const selfieRes = await fetch("/api/upload", {
          method: "POST",
          body: selfieFormData,
        });

        if (selfieRes.ok) {
          const selfieData = await selfieRes.json();
          selfiePath = selfieData.path;
        }
      } else if (savedSelfiePath) {
        selfiePath = savedSelfiePath;
      }

      // 3. Create Visit Request
      const cleanPhone = visitorPhone.replace(/\D/g, "");
      const res = await fetch("/api/visit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: visitorName.trim(),
          visitorEmail: visitorEmail.trim().toLowerCase(),
          visitorPhone: cleanPhone,
          idType: selectedIdType,
          idPhotoPath,
          idNumber: idMethod === "NUMBER" ? idNumber.trim() : undefined,
          purpose: purpose.trim() || undefined,
          hostId: selectedHost.id,
          selfiePath,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to record visitor request.");
      }

      const data = await res.json();
      router.push(`/guard/request/${data.requestId}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
      setIsSubmitting(false);
    }
  };

  return (
    <GuardLayout companyName="VS Techsol" userName="Gate Security Guard">
      <div className="space-y-5">
        {/* Progress Bar (Clear "Step X of 3" indicator) */}
        <div className="bg-surface border border-border rounded p-3.5 space-y-2 select-none">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>
              {step === 1 && t("step1Of3")}
              {step === 2 && t("step2Of3")}
              {step === 3 && t("step3Of3")}
            </span>
            <span className="text-ink-subtle">
              {step === 1 ? "33%" : step === 2 ? "66%" : "100%"}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300 rounded"
              style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
            />
          </div>
        </div>

        {error && (
          <Toast
            type="danger"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {/* ================= STEP 1: VISITOR DETAILS ================= */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("visitorDetailsTitle")}</CardTitle>
              <CardDescription>{t("visitorDetailsDesc")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Returning Visitor Lookup Bar */}
              <div className="p-3.5 rounded border border-border bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-accent" />
                    <span>Returning Visitor Lookup (Optional)</span>
                  </span>
                  {matchedVisitor && (
                    <button
                      type="button"
                      onClick={() => {
                        setMatchedVisitor(null);
                        setSavedIdPhotoPath(null);
                        setSavedSelfiePath(null);
                        setIdPhotoPreview(null);
                        setSelfiePreview(null);
                      }}
                      className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                    >
                      Clear Auto-Fill
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="Type mobile, email, name, or ID number to auto-fill past visitor..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded bg-surface text-ink placeholder:text-ink-subtle focus:border-accent"
                  />
                </div>

                {matchedVisitor && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-accent-light border border-accent/25 text-xs">
                    <span className="font-semibold text-ink">
                      Auto-filled returning visitor: <strong>{matchedVisitor.name}</strong> (Visit #{matchedVisitor.visitCount + 1})
                    </span>
                    <Badge variant="accent">Repeat Visitor</Badge>
                  </div>
                )}

                {lookupLoading && (
                  <p className="text-xs text-ink-subtle">Checking past visitor records...</p>
                )}

                {!matchedVisitor && lookupResults.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {lookupResults.map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded border border-border bg-surface text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 font-bold text-ink">
                            <span>{v.name}</span>
                            <Badge variant="accent">{v.visitCount} {v.visitCount === 1 ? "visit" : "visits"}</Badge>
                          </div>
                          <div className="text-ink-muted font-mono">
                            {v.phone} • {v.email}
                          </div>
                          <div className="text-ink-subtle">
                            {v.lastHost ? `Last met: ${v.lastHost.name} (${v.lastHost.department})` : ""}
                            {v.lastIdPhotoPath ? " • Saved ID photo on file" : v.lastIdNumber ? ` • Saved ID: ${v.lastIdNumber}` : ""}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="accent"
                          onClick={() => handleApplyReturningVisitor(v)}
                        >
                          Auto-Fill Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleStep1Next} className="space-y-5">
                <Input
                  label={t("visitorName")}
                  required
                  autoFocus
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder={t("visitorNamePlaceholder")}
                  leftIcon={<User className="w-5 h-5" />}
                  className="text-lg"
                />

                <Input
                  label={t("visitorEmail")}
                  required
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder={t("visitorEmailPlaceholder")}
                  leftIcon={<Mail className="w-5 h-5" />}
                  className="text-lg"
                />

                <Input
                  label={t("visitorPhone")}
                  required
                  tabular
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder={t("visitorPhonePlaceholder")}
                  helperText="10-digit Indian mobile number."
                  leftIcon={<Phone className="w-5 h-5" />}
                  className="text-lg"
                />

                <Input
                  label={t("purpose")}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t("purposePlaceholder")}
                  leftIcon={<FileText className="w-5 h-5" />}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                    className="w-full text-lg font-bold"
                  >
                    {t("nextStep")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 2: WHO INVITED THE VISITOR ================= */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("whoInvitedTitle")}</CardTitle>
              <CardDescription>{t("whoInvitedDesc")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Large Search Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={hostSearch}
                  onChange={(e) => setHostSearch(e.target.value)}
                  placeholder={t("searchEmployeePlaceholder")}
                  className="block w-full pl-11 pr-4 py-3.5 border border-border rounded text-base text-ink bg-surface focus:border-accent"
                />
              </div>

              {/* Employee Selection List */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {employeesLoading ? (
                  <div className="text-center py-8 text-sm text-ink-muted">
                    Loading employees...
                  </div>
                ) : employeesError ? (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-danger font-medium">{employeesError}</p>
                    <Button type="button" size="sm" variant="secondary" onClick={loadEmployees}>
                      Retry
                    </Button>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-sm text-ink-muted">
                    {t("noEmployeesFound")}
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedHost?.id === emp.id;
                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setSelectedHost(emp);
                          setError(null);
                        }}
                        className={`p-3.5 rounded border transition-colors duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-accent-light border-accent text-ink"
                            : "bg-surface border-border hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-base text-ink">
                            {emp.name}
                          </div>
                          <div className="text-sm text-ink-muted flex items-center gap-1.5 mt-0.5">
                            <Building className="w-3.5 h-3.5 shrink-0 text-ink-subtle" />
                            <span>{emp.department}</span>
                          </div>
                          <div className="text-xs text-ink-subtle flex items-center gap-1.5 mt-0.5 font-mono">
                            <Mail className="w-3 h-3 shrink-0 text-ink-subtle" />
                            <span>{maskEmail(emp.email)}</span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-border" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  leftIcon={<ArrowLeft className="w-5 h-5" />}
                  className="w-full text-base"
                >
                  {t("backStep")}
                </Button>

                <Button
                  size="lg"
                  variant="primary"
                  disabled={!selectedHost}
                  onClick={handleStep2Next}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="w-full text-base font-bold"
                >
                  {t("nextStep")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= STEP 3: ID PHOTO & SEND ================= */}
        {step === 3 && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>{t("idPhotoTitle")}</CardTitle>
                <CardDescription>{t("idPhotoDesc")}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* ID Type Selection (Large Tappable Options) */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-ink">
                    {t("idTypeLabel")} *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: "AADHAAR", label: "Aadhaar Card", sub: "UIDAI" },
                      { id: "DRIVING_LICENCE", label: "Driving Licence", sub: "State Transport" },
                      { id: "VOTER_ID", label: "Voter ID", sub: "Election Comm." },
                      { id: "PASSPORT", label: "Passport", sub: "Govt. Passport" },
                      { id: "PAN", label: "PAN Card", sub: "Income Tax" },
                      { id: "OTHER", label: "Other ID", sub: "Govt. Issued" },
                    ].map((opt) => {
                      const isSelected = selectedIdType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedIdType(opt.id as IdTypeOption)}
                          className={`btn-guard p-3 rounded border-2 text-left flex flex-col justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-accent bg-accent-light text-accent shadow-sm"
                              : "border-border hover:border-slate-400 bg-surface text-ink"
                          }`}
                        >
                          <span className="font-bold text-sm block leading-tight">{opt.label}</span>
                          <span className="text-[11px] text-ink-subtle block mt-0.5">{opt.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ID Verification Method Selector: Photo OR ID Number */}
                <div className="space-y-3 pt-1">
                  <label className="block text-sm font-bold text-ink">
                    Provide ID Photo or ID Number *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIdMethod("PHOTO");
                        setError(null);
                      }}
                      className={`btn-guard p-3 rounded border-2 flex items-center justify-center gap-2 font-bold text-sm transition-colors cursor-pointer ${
                        idMethod === "PHOTO"
                          ? "border-accent bg-accent-light text-accent"
                          : "border-border bg-surface text-ink hover:border-slate-400"
                      }`}
                    >
                      <Camera className="w-5 h-5 shrink-0" />
                      <span>{t("idMethodPhoto")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIdMethod("NUMBER");
                        setError(null);
                      }}
                      className={`btn-guard p-3 rounded border-2 flex items-center justify-center gap-2 font-bold text-sm transition-colors cursor-pointer ${
                        idMethod === "NUMBER"
                          ? "border-accent bg-accent-light text-accent"
                          : "border-border bg-surface text-ink hover:border-slate-400"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 shrink-0" />
                      <span>{t("idMethodNumber")}</span>
                    </button>
                  </div>
                </div>

                {/* Option 1: ID Photo Action */}
                {idMethod === "PHOTO" ? (
                  <div>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <label
                        htmlFor="idPhotoCameraInput"
                        className={`btn-guard flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded cursor-pointer transition-colors w-full ${
                          idPhotoPreview
                            ? "border-success bg-success-bg text-success-text"
                            : "border-border hover:border-accent bg-surface text-ink"
                        }`}
                      >
                        <Camera className="w-5 h-5 text-accent" />
                        <span className="font-semibold">{t("takePhotoId")} *</span>
                      </label>

                      <input
                        id="idPhotoCameraInput"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleIdPhotoSelect}
                        className="sr-only"
                      />

                      {idPhotoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setIdPhotoFile(null);
                            setSavedIdPhotoPath(null);
                            setIdPhotoPreview(null);
                          }}
                          className="px-3 py-2 text-xs font-semibold text-danger hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t("retake")}</span>
                        </button>
                      )}
                    </div>

                    {idPhotoPreview && (
                      <div className="mt-3 space-y-1.5 max-w-[260px]">
                        {savedIdPhotoPath && !idPhotoFile && (
                          <div className="text-[11px] font-semibold text-accent">
                            Reusing saved ID photo from previous visit (or upload a new photo above)
                          </div>
                        )}
                        <div className="border border-border rounded overflow-hidden bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={idPhotoPreview}
                            alt="ID Card Preview"
                            className="w-full h-36 object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Option 2: Enter ID Number */
                  <div>
                    <Input
                      label={t("idNumberLabel")}
                      required
                      tabular
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                      placeholder={t("idNumberPlaceholder")}
                      maxLength={30}
                      helperText="Enter full ID number (e.g. 12-digit Aadhaar, PAN, Driving Licence). Minimum 4 characters."
                      leftIcon={<CreditCard className="w-5 h-5" />}
                      className="text-lg tracking-wider"
                    />
                  </div>
                )}

                {/* Optional Visitor Photo */}
                <div className="pt-2 border-t border-border">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <label
                      htmlFor="selfieCameraInput"
                      className={`btn-guard flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded cursor-pointer transition-colors w-full ${
                        selfiePreview
                          ? "border-success bg-success-bg text-success-text"
                          : "bg-surface hover:bg-slate-50 text-ink"
                      }`}
                    >
                      <User className="w-5 h-5 text-ink-subtle" />
                      <span>{t("takeVisitorPhoto")}</span>
                    </label>

                    <input
                      id="selfieCameraInput"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleSelfieSelect}
                      className="sr-only"
                    />

                    {selfiePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelfieFile(null);
                          setSavedSelfiePath(null);
                          setSelfiePreview(null);
                        }}
                        className="px-3 py-2 text-xs font-semibold text-danger hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t("retake")}</span>
                      </button>
                    )}
                  </div>

                  {selfiePreview && (
                    <div className="mt-3 border border-border rounded overflow-hidden max-w-[200px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selfiePreview}
                        alt="Visitor Face Preview"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Clear Summary Card before sending */}
                <div className="p-4 rounded bg-slate-50 border border-border space-y-2 text-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-subtle mb-1">
                    {t("reviewSummary")}
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-ink-muted">Visitor Name</span>
                    <span className="font-bold text-ink">{visitorName}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-ink-muted">Email</span>
                    <span className="font-bold text-ink font-mono text-xs">{visitorEmail}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-ink-muted">Mobile</span>
                    <span className="font-bold text-ink font-mono tabular-nums">{visitorPhone}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-ink-muted">ID Type</span>
                    <span className="font-bold text-accent">
                      {selectedIdType === "AADHAAR" && "Aadhaar Card"}
                      {selectedIdType === "DRIVING_LICENCE" && "Driving Licence"}
                      {selectedIdType === "VOTER_ID" && "Voter ID"}
                      {selectedIdType === "PASSPORT" && "Passport"}
                      {selectedIdType === "PAN" && "PAN Card"}
                      {selectedIdType === "OTHER" && "Other Govt. ID"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-ink-muted">ID Verification</span>
                    <span className="font-bold text-ink font-mono">
                      {idMethod === "PHOTO"
                        ? idPhotoFile
                          ? "New ID Photo Attached"
                          : savedIdPhotoPath
                          ? "Saved ID Photo Reused"
                          : "Photo Pending"
                        : idNumber.trim() || "Pending"}
                    </span>
                  </div>

                  {purpose && (
                    <div className="flex justify-between py-1 border-b border-border/60">
                      <span className="text-ink-muted">Purpose</span>
                      <span className="text-ink">{purpose}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1">
                    <span className="text-ink-muted">Host Employee</span>
                    <span className="font-bold text-accent">
                      {selectedHost?.name} ({selectedHost?.department})
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => setStep(2)}
                    leftIcon={<ArrowLeft className="w-5 h-5" />}
                    className="w-full text-base"
                  >
                    {t("backStep")}
                  </Button>

                  <Button
                    size="lg"
                    variant="primary"
                    disabled={!idPhotoFile || isSubmitting}
                    isLoading={isSubmitting}
                    onClick={handleFinalSubmit}
                    leftIcon={<Send className="w-5 h-5" />}
                    className="w-full text-lg font-bold"
                  >
                    {t("sendRequest")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </GuardLayout>
  );
}
