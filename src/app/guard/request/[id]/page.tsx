"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  LogOut,
  User,
  Phone,
  FileText,
  UserPlus,
} from "lucide-react";
import { GuardLayout } from "@/components/shell/GuardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import { useI18n } from "@/components/I18nProvider";

interface RequestDetails {
  id: string;
  visitorName: string;
  visitorPhone: string;
  purpose?: string | null;
  idPhotoPath?: string | null;
  idNumber?: string | null;
  selfiePath?: string | null;
  status: string;
  hostName: string;
  hostDepartment: string;
  hostEmail?: string;
  emailFailed?: boolean;
  otpAttempts: number;
  maxAttempts: number;
  createdAt: string;
  expiresAt?: string | null;
  enteredAt?: string | null;
  exitedAt?: string | null;
}

export default function GuardRequestStatusPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;
  const { t } = useI18n();

  const [details, setDetails] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OTP inputs: 6 digits
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);

  // Live countdown timer (seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Exit recording state
  const [isExiting, setIsExiting] = useState(false);

  // Email resend state
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailResendError, setEmailResendError] = useState<string | null>(null);
  const [emailResendSuccess, setEmailResendSuccess] = useState<string | null>(null);

  // Resend host approval email handler
  const handleResendEmail = async () => {
    setIsResendingEmail(true);
    setEmailResendError(null);
    setEmailResendSuccess(null);
    try {
      const res = await fetch(`/api/visit-requests/${requestId}/resend-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailResendError(data.error || t("emailCouldNotBeSent"));
      } else {
        setEmailResendSuccess(t("emailSentSuccess"));
        fetchStatus();
      }
    } catch {
      setEmailResendError(t("emailCouldNotBeSent"));
    } finally {
      setIsResendingEmail(false);
    }
  };

  // 1. Fetch Request Status
  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/visit-requests/${requestId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Visit request not found.");
        }
        return;
      }
      const data: RequestDetails = await res.json();
      setDetails(data);
      setAttemptsLeft(data.maxAttempts - data.otpAttempts);

      // Setup countdown seconds
      if (data.expiresAt) {
        const diff = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        setSecondsRemaining(diff);
      }
    } catch {
      // Background poll failure, wait for next tick
    } finally {
      setLoading(false);
    }
  };

  // 2. Poll every 3 seconds while WAITING or APPROVED
  useEffect(() => {
    fetchStatus();
    const pollInterval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // 3. Live 1-second countdown decrement
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          fetchStatus(); // Trigger server check on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsRemaining]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // OTP Box change handlers
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");

    // Handle paste of 6 digits
    if (cleaned.length >= 6) {
      const chars = cleaned.slice(0, 6).split("");
      setOtpDigits(chars);
      inputRefs.current[5]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned.slice(-1); // Take single digit
    setOtpDigits(newDigits);
    setOtpError(null);

    // Auto-advance cursor
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setOtpError(t("completeOtpError"));
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch(`/api/visit-requests/${requestId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === "LOCKED") {
          fetchStatus();
        } else {
          setOtpError(data.error || "Incorrect OTP code.");
          if (data.attemptsRemaining !== undefined) {
            setAttemptsLeft(data.attemptsRemaining);
          }
        }
        return;
      }

      fetchStatus();
    } catch {
      setOtpError("Network error checking OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Record Visitor Exit
  const handleRecordExit = async () => {
    setIsExiting(true);
    try {
      const res = await fetch(`/api/visit-requests/${requestId}/exit`, {
        method: "POST",
      });
      if (res.ok) {
        fetchStatus();
      }
    } catch {
      setError("Failed to record visitor departure.");
    } finally {
      setIsExiting(false);
    }
  };

  if (loading) {
    return (
      <GuardLayout companyName="VS Techsol" userName="Gate Security Guard">
        <div className="text-center py-16 space-y-3">
          <Spinner size="lg" className="text-accent" />
          <p className="text-base text-ink-muted">Loading request status...</p>
        </div>
      </GuardLayout>
    );
  }

  if (error || !details) {
    return (
      <GuardLayout companyName="VS Techsol" userName="Gate Security Guard">
        <Card className="text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded bg-danger-bg text-danger mx-auto flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">Request Not Found</h2>
          <p className="text-sm text-ink-muted">{error || "Unable to locate visit record."}</p>
          <Button
            size="lg"
            variant="primary"
            onClick={() => router.push("/guard")}
            className="w-full mt-4"
          >
            {t("backToHome")}
          </Button>
        </Card>
      </GuardLayout>
    );
  }

  const isWaiting = details.status === "WAITING_HOST";
  const isApproved = details.status === "APPROVED";
  const isAllowed = details.status === "ENTERED";
  const isDenied = details.status === "DENIED";
  const isLocked = details.status === "LOCKED";
  const isExpired = details.status === "EXPIRED";
  const isExited = details.status === "EXITED";

  return (
    <GuardLayout
      companyName="VS Techsol"
      userName="Gate Security Guard"
      bottomAction={
        isWaiting ? (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => router.push("/guard/new")}
            className="w-full text-base"
          >
            {t("startNewRequest")}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* ================= 1. THE VERY LARGE STATUS BANNER ================= */}

        {/* WAITING */}
        {isWaiting && (
          <>
            <StatusBanner
              status="waiting"
              title={`${t("waitingApprovalFrom")} ${details.hostName}`}
              description={
                details.emailFailed
                  ? `${details.hostDepartment}. Email delivery failed.`
                  : `${details.hostDepartment}. Email sent to host.`
              }
            >
              {secondsRemaining !== null && (
                <div className="mt-3 flex items-center gap-2 text-base font-semibold text-warning-text bg-surface/70 px-3 py-1.5 rounded border border-warning-border w-fit tabular-nums">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {t("requestExpiresIn")}: <strong>{formatCountdown(secondsRemaining)}</strong>
                  </span>
                </div>
              )}
            </StatusBanner>

            {/* Email Dispatch Failure Alert with Retry */}
            {details.emailFailed && (
              <div className="p-4 rounded border-2 border-danger-border bg-danger-bg space-y-3">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-6 h-6 text-danger shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-danger">
                      {t("emailCouldNotBeSent")}
                    </h4>
                    <p className="text-sm text-ink">
                      Host: <strong>{details.hostName}</strong> ({details.hostDepartment})
                      {details.hostEmail && (
                        <span className="block text-xs font-mono text-ink-muted mt-0.5">
                          {details.hostEmail}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {emailResendError && (
                  <Toast type="danger" message={emailResendError} onDismiss={() => setEmailResendError(null)} />
                )}
                {emailResendSuccess && (
                  <Toast type="success" message={emailResendSuccess} onDismiss={() => setEmailResendSuccess(null)} />
                )}

                <div className="pt-1">
                  <Button
                    type="button"
                    size="md"
                    variant="secondary"
                    isLoading={isResendingEmail}
                    onClick={handleResendEmail}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                    className="w-full sm:w-auto font-semibold"
                  >
                    {isResendingEmail ? t("retryingEmail") : t("retrySendingEmail")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* APPROVED (Ask Visitor for OTP) */}
        {isApproved && (
          <StatusBanner
            status="approved"
            title={`${details.hostName} approved this visitor.`}
            description="Ask the visitor for the 6-digit code sent to their email."
          />
        )}

        {/* ALLOWED ENTRY */}
        {isAllowed && (
          <StatusBanner
            status="allowed"
            title={t("codeMatchedAllow")}
            description={`${details.hostName} (${details.hostDepartment})`}
          />
        )}

        {/* DENIED */}
        {isDenied && (
          <StatusBanner
            status="denied"
            title={t("deniedByHost")}
            description={`Host ${details.hostName} denied entry for ${details.visitorName}.`}
          />
        )}

        {/* LOCKED */}
        {isLocked && (
          <StatusBanner
            status="expired"
            title="REQUEST LOCKED"
            description={t("requestLocked3Attempts")}
          />
        )}

        {/* EXPIRED */}
        {isExpired && (
          <StatusBanner
            status="expired"
            title={t("requestExpired")}
            description="The verification window elapsed without completion."
          />
        )}

        {/* EXITED */}
        {isExited && (
          <div className="p-5 rounded bg-slate-100 border border-slate-300 text-ink">
            <h3 className="text-xl font-bold">Visitor Exited</h3>
            <p className="text-sm text-ink-muted mt-1">
              Departure recorded at {new Date(details.exitedAt || Date.now()).toLocaleTimeString()}.
            </p>
          </div>
        )}

        {/* ================= 2. INTERACTION AREA ================= */}

        {/* Approved state: 6-Box OTP Input with Numeric Keypad */}
        {isApproved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{t("enter6DigitOtp")}</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {otpError && (
                  <Toast
                    type="danger"
                    message={otpError}
                    onDismiss={() => setOtpError(null)}
                  />
                )}

                {/* 6 Individual Digit Inputs */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      autoFocus={idx === 0}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-3xl font-mono font-bold border-2 border-border rounded focus:border-accent text-ink bg-surface tabular-nums transition-colors"
                    />
                  ))}
                </div>

                <div className="text-center text-sm font-semibold text-ink-muted">
                  {attemptsLeft} {t("attemptsRemaining")}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant="accent"
                  isLoading={isVerifying}
                  disabled={otpDigits.join("").length !== 6 || isVerifying}
                  leftIcon={<KeyRound className="w-6 h-6" />}
                  className="w-full text-lg font-bold bg-success hover:bg-success-hover"
                >
                  {t("verifyCode")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Allowed state: "Visitor Left" button */}
        {isAllowed && (
          <div className="space-y-3">
            <Button
              size="lg"
              variant="danger"
              isLoading={isExiting}
              onClick={handleRecordExit}
              leftIcon={<LogOut className="w-5 h-5" />}
              className="w-full text-lg font-bold"
            >
              {t("visitorLeft")}
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => router.push("/guard/new")}
              leftIcon={<UserPlus className="w-5 h-5" />}
              className="w-full text-base"
            >
              {t("startNewRequest")}
            </Button>
          </div>
        )}

        {/* Terminal states (Denied, Expired, Locked, Exited): Next Action */}
        {(isDenied || isExpired || isLocked || isExited) && (
          <div className="pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => router.push("/guard/new")}
              leftIcon={<UserPlus className="w-5 h-5" />}
              className="w-full text-lg font-bold"
            >
              {t("startNewRequest")}
            </Button>
          </div>
        )}

        {/* Visitor Info Card */}
        <Card>
          <div className="space-y-3 text-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-subtle pb-1 border-b border-border">
              Visitor Information
            </div>

            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-ink-muted flex items-center gap-1.5">
                <User className="w-4 h-4 text-ink-subtle" />
                <span>Name</span>
              </span>
              <span className="font-bold text-ink">{details.visitorName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-ink-muted flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-ink-subtle" />
                <span>Mobile</span>
              </span>
              <span className="font-mono font-bold text-ink tabular-nums">{details.visitorPhone}</span>
            </div>

            {details.purpose && (
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-ink-muted flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-ink-subtle" />
                  <span>Purpose</span>
                </span>
                <span className="text-ink text-right max-w-[200px]">{details.purpose}</span>
              </div>
            )}

            <div className="flex justify-between py-1">
              <span className="text-ink-muted">Host Employee</span>
              <span className="font-bold text-accent">
                {details.hostName} ({details.hostDepartment})
              </span>
            </div>
          </div>
        </Card>
      </div>
    </GuardLayout>
  );
}
