"use client";

import React, { useState } from "react";
import {
  Shield,
  Send,
  Camera,
  RotateCcw,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  FileText,
  AlertTriangle,
  Info,
  Globe,
  Sliders,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import { useI18n } from "@/components/I18nProvider";
import { TopBar } from "@/components/shell/TopBar";
import { Footer } from "@/components/shell/Footer";

export default function DesignCheckPage() {
  const { language, toggleLanguage, t } = useI18n();
  const [viewMode, setViewMode] = useState<"responsive" | "mobile-guard">("responsive");
  const [inputVal, setInputVal] = useState("9876543210");
  const [selectVal, setSelectVal] = useState("2");
  const [showToast, setShowToast] = useState(true);

  return (
    <div className="min-h-screen bg-background text-ink">
      <TopBar
        companyName="Apex Technologies"
        userName="Design Reviewer"
        userRole="System Design Check"
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Page Title & Viewport Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-ink">Design System Showcase</h1>
              <Badge variant="accent">Review Build</Badge>
            </div>
            <p className="text-base text-ink-muted mt-1">
              Production-grade UI components, color tokens, and guard interfaces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded text-sm font-semibold text-ink bg-surface hover:bg-slate-100 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-accent" />
              <span>Current Language: {language === "en" ? "English" : "ಕನ್ನಡ (Kannada)"}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode(viewMode === "responsive" ? "mobile-guard" : "responsive")}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded text-sm font-semibold cursor-pointer ${
                viewMode === "mobile-guard"
                  ? "bg-ink text-white border-transparent"
                  : "bg-surface border-border text-ink hover:bg-slate-100"
              }`}
            >
              {viewMode === "mobile-guard" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              <span>{viewMode === "mobile-guard" ? "Guard Mobile View (640px)" : "Full Responsive View"}</span>
            </button>
          </div>
        </div>

        {/* CONTAINER FOR DEMO: Responsive or Constrained to 640px for Guard */}
        <div className={viewMode === "mobile-guard" ? "max-w-[640px] mx-auto space-y-12 border-x border-dashed border-border px-4 py-4 bg-slate-50/50" : "space-y-12"}>
          {/* SECTION 1: COLOR PALETTE */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span>1. Enterprise Color Tokens</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs font-semibold">
              <div className="p-3 rounded border border-border bg-background">
                <div className="text-ink">Background</div>
                <div className="text-ink-subtle font-mono mt-1">#F8FAFC</div>
              </div>
              <div className="p-3 rounded border border-border bg-surface">
                <div className="text-ink">Surface</div>
                <div className="text-ink-subtle font-mono mt-1">#FFFFFF</div>
              </div>
              <div className="p-3 rounded bg-ink text-white">
                <div>Ink (Primary)</div>
                <div className="opacity-70 font-mono mt-1">#0F172A</div>
              </div>
              <div className="p-3 rounded bg-accent text-white">
                <div>Restrained Accent</div>
                <div className="opacity-70 font-mono mt-1">#0284C7</div>
              </div>
              <div className="p-3 rounded bg-success-bg border border-success-border text-success-text">
                <div>Status: Success</div>
                <div className="text-success font-mono mt-1">#15803D</div>
              </div>
              <div className="p-3 rounded bg-warning-bg border border-warning-border text-warning-text">
                <div>Status: Warning</div>
                <div className="text-warning font-mono mt-1">#B45309</div>
              </div>
              <div className="p-3 rounded bg-danger-bg border border-danger-border text-danger-text">
                <div>Status: Danger</div>
                <div className="text-danger font-mono mt-1">#B91C1C</div>
              </div>
            </div>
          </section>

          {/* SECTION 2: STATUS BANNERS (All 5 variants) */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span>2. Full-Width Status Banners (5 Statuses)</span>
            </h2>
            <div className="space-y-4">
              {/* Waiting */}
              <StatusBanner
                status="waiting"
                title="Waiting for Host Approval"
                description="Email sent to Priya Sharma (Human Resources). The gate screen will automatically update when the host decides."
              />

              {/* Approved */}
              <StatusBanner
                status="approved"
                title="Host Approved: Rajesh Patel"
                description="Host approved visitor Anand Verma. Ask the visitor for the 6-digit OTP code shown on their screen."
              />

              {/* Allowed Entry */}
              <StatusBanner
                status="allowed"
                title="ALLOW ENTRY"
                description="OTP verified successfully. Visitor Anand Verma is permitted past the gate."
              />

              {/* Denied */}
              <StatusBanner
                status="denied"
                title="ENTRY DENIED"
                description="Host denied permission for visitor Anand Verma. Do not permit visitor through the gate."
              />

              {/* Expired / Locked */}
              <StatusBanner
                status="expired"
                title="REQUEST LOCKED"
                description="3 incorrect OTP attempts were entered. For security, this request is locked. Guard must begin a new intake."
              />
            </div>
          </section>

          {/* SECTION 3: BUTTONS */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span>3. Buttons (Variants, Sizes & 56px Guard Button)</span>
            </h2>
            <div className="bg-surface border border-border rounded p-6 space-y-6">
              {/* Guard Specific 56px Buttons */}
              <div>
                <div className="text-sm font-bold text-ink mb-2">
                  Guard Large Buttons (Strict 56px Height & 18px Text)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    variant="primary"
                    leftIcon={<Send className="w-5 h-5" />}
                  >
                    Send Verification Request (56px)
                  </Button>

                  <Button
                    size="lg"
                    variant="accent"
                    className="bg-success hover:bg-success-hover"
                    leftIcon={<KeyRound className="w-6 h-6" />}
                  >
                    Verify 6-Digit OTP (56px)
                  </Button>
                </div>
              </div>

              {/* Standard Sizes and Variants */}
              <div>
                <div className="text-sm font-bold text-ink mb-2">Sizes and Variants</div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="primary">Small Primary</Button>
                  <Button size="md" variant="primary">Medium Primary</Button>
                  <Button size="md" variant="secondary" leftIcon={<RotateCcw className="w-4 h-4" />}>
                    Secondary with Icon
                  </Button>
                  <Button size="md" variant="danger" leftIcon={<XCircle className="w-4 h-4" />}>
                    Danger Button
                  </Button>
                  <Button size="md" variant="accent">Accent Blue</Button>
                  <Button size="md" variant="primary" isLoading>Loading State</Button>
                  <Button size="md" variant="secondary" disabled>Disabled State</Button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: FORM INPUTS & SELECTS */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span>4. Form Controls (Inputs, Selects, Errors & Tabular Numbers)</span>
            </h2>
            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Visitor Full Name"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  leftIcon={<User className="w-5 h-5" />}
                />

                <Input
                  label="Phone Number (Tabular Figures)"
                  required
                  tabular
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="9876543210"
                  leftIcon={<Phone className="w-5 h-5" />}
                  helperText="Tabular numerals ensure digit columns align."
                />

                <Select
                  label="Host Employee Selection"
                  required
                  value={selectVal}
                  onChange={(e) => setSelectVal(e.target.value)}
                  options={[
                    { value: "1", label: "Priya Sharma (Human Resources)" },
                    { value: "2", label: "Rajesh Patel (Human Resources)" },
                    { value: "3", label: "Anita Desai (Finance)" },
                    { value: "4", label: "Arun Kumar (IT & Systems)" },
                  ]}
                />

                <Input
                  label="Input with Error State"
                  required
                  value="123"
                  error="Please enter a valid 10-digit Indian mobile number."
                  leftIcon={<Phone className="w-5 h-5" />}
                />
              </div>

              {/* OTP Numeric Large Display */}
              <div className="mt-6 pt-6 border-t border-border text-center max-w-xs mx-auto">
                <label className="block text-sm font-semibold text-ink-muted mb-2">
                  OTP Input Style (Tabular Figures, Spaced)
                </label>
                <div className="py-3 text-3xl font-mono font-bold tracking-[0.4em] border-2 border-border rounded bg-background text-ink tabular-nums">
                  592 108
                </div>
              </div>
            </Card>
          </section>

          {/* SECTION 5: BADGES & TOASTS */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span>5. Badges, Empty States & Notifications</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                      Entered
                    </Badge>
                    <Badge variant="warning" icon={<Clock className="w-3.5 h-3.5" />}>
                      Waiting Host
                    </Badge>
                    <Badge variant="danger" icon={<XCircle className="w-3.5 h-3.5" />}>
                      Denied
                    </Badge>
                    <Badge variant="danger">Locked</Badge>
                    <Badge variant="neutral">Exited</Badge>
                    <Badge variant="accent">Admin Verified</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Toasts & Banners</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showToast && (
                    <Toast
                      type="success"
                      message="Visitor verification successful. Allowed through gate."
                      onDismiss={() => setShowToast(false)}
                    />
                  )}
                  <Toast
                    type="danger"
                    message="3 invalid OTP attempts. Verification locked."
                  />
                  <Toast
                    type="warning"
                    message="Verification link expires in 2 minutes."
                  />
                </CardContent>
              </Card>
            </div>

            {/* Empty State */}
            <EmptyState
              icon={<User className="w-6 h-6" />}
              title="No Pending Gate Requests"
              description="There are currently no active visitor intake requests waiting for verification."
              action={
                <Button size="sm" variant="primary">
                  Check-In New Visitor
                </Button>
              }
            />
          </section>

          {/* SECTION 6: I18N LIVE COMPARISON */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span>6. Lightweight i18n Strings (English / Kannada)</span>
            </h2>

            <Card>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <div className="text-sm font-bold text-ink">Active Guard-Side Strings</div>
                  <div className="text-xs text-ink-subtle">
                    Kannada translations reviewed for plain words and non-technical clarity.
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={toggleLanguage} leftIcon={<Globe className="w-4 h-4 text-accent" />}>
                  Toggle ({language === "en" ? "Switch to ಕನ್ನಡ" : "Switch to English"})
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-sm">
                <div className="p-3 rounded bg-slate-50 border border-border">
                  <span className="text-xs text-ink-subtle block mb-1">newVisitorCheckIn:</span>
                  <span className="font-semibold text-ink">{t("newVisitorCheckIn")}</span>
                </div>
                <div className="p-3 rounded bg-slate-50 border border-border">
                  <span className="text-xs text-ink-subtle block mb-1">sendRequest:</span>
                  <span className="font-semibold text-ink">{t("sendRequest")}</span>
                </div>
                <div className="p-3 rounded bg-slate-50 border border-border">
                  <span className="text-xs text-ink-subtle block mb-1">waitingHost:</span>
                  <span className="font-semibold text-ink">{t("waitingHost")}</span>
                </div>
                <div className="p-3 rounded bg-slate-50 border border-border">
                  <span className="text-xs text-ink-subtle block mb-1">askOtp:</span>
                  <span className="font-semibold text-ink">{t("askOtp")}</span>
                </div>
                <div className="p-3 rounded bg-slate-50 border border-border">
                  <span className="text-xs text-ink-subtle block mb-1">allowEntry:</span>
                  <span className="font-bold text-success">{t("allowEntry")}</span>
                </div>
                <div className="p-3 rounded bg-slate-50 border border-border">
                  <span className="text-xs text-ink-subtle block mb-1">entryDenied:</span>
                  <span className="font-bold text-danger">{t("entryDenied")}</span>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
