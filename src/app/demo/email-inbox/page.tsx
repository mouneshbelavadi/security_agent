"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, RefreshCw, Inbox, ExternalLink, Clock } from "lucide-react";

interface EmailItem {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  textBody: string;
  requestId?: string | null;
  createdAt: string;
}

export default function DemoEmailInboxPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEmails = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/demo/email-inbox", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (err) {
      console.error("Email inbox poll error:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-ink py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Demo Banner */}
        <div className="bg-warning-bg border border-warning-border text-warning-text px-4 py-3 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-sm font-bold uppercase tracking-wide">
              Demo only: simulated email inbox
            </div>
            <div className="text-xs mt-0.5">
              Cloud replacement for local Mailpit — shows host arrival emails in real time.
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-accent" : ""}`} />
            <span>Auto-refresh (3s)</span>
          </div>
        </div>

        {/* Inbox Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-accent text-white flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink leading-tight">Host Email Outbox</h1>
              <p className="text-xs text-ink-muted">Latest 10 visitor arrival notifications</p>
            </div>
          </div>
          <Link
            href="/demo/sms-inbox"
            className="text-xs font-semibold text-accent hover:underline"
          >
            Open SMS Inbox &rarr;
          </Link>
        </div>

        {/* Email List */}
        {loading ? (
          <div className="text-center py-16 text-sm text-ink-muted">Loading simulated emails...</div>
        ) : emails.length === 0 ? (
          <div className="bg-surface border border-border rounded p-12 text-center space-y-2">
            <Inbox className="w-10 h-10 text-ink-subtle mx-auto" />
            <div className="text-base font-semibold text-ink">No emails yet</div>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              When a guard submits a visitor request, the employee notification email will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((mail) => (
              <div
                key={mail.id}
                className="bg-surface border border-border rounded p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="text-base font-bold text-ink">{mail.subject}</div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      To: <span className="font-semibold text-ink">{mail.toName}</span>{" "}
                      (<span className="font-mono">{mail.toEmail}</span>)
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-subtle tabular-nums shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(mail.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <pre className="text-xs text-ink-muted whitespace-pre-wrap font-sans bg-slate-50 p-3 rounded border border-border">
                  {mail.textBody}
                </pre>

                {mail.requestId && (
                  <div className="pt-1 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-subtle">
                      Tip: Open in Incognito if already signed in as Guard.
                    </span>
                    <Link
                      href={`/host/requests/${mail.requestId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded transition-colors"
                    >
                      <span>Open dashboard</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
