"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, Smartphone, Wifi, Battery, Signal } from "lucide-react";

interface SmsItem {
  id: string;
  mobile: string;
  message: string;
  createdAt: string;
}

export default function DemoSmsInboxPage() {
  const [messages, setMessages] = useState<SmsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMessages = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/demo/sms-inbox", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("SMS inbox poll error:", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000); // Auto-refreshes every 3 seconds as required
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4">
      {/* 1. REQUIRED DEMO BANNER */}
      <div className="max-w-md w-full mx-auto mb-4">
        <div className="bg-amber-500/20 border-2 border-amber-500/50 text-amber-200 px-4 py-3 rounded text-center shadow-lg">
          <div className="text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            Demo only: simulated SMS inbox
          </div>
          <div className="text-xs text-amber-300/80 mt-1">
            Simulates the visitor&apos;s phone receiving the OTP. Keep open on a second display.
          </div>
        </div>
      </div>

      {/* 2. PHONE-STYLE FRAME */}
      <div className="max-w-sm w-full mx-auto bg-slate-900 border-4 border-slate-700 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[640px]">
        {/* Status Bar */}
        <div className="bg-slate-900 px-6 pt-3 pb-2 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800">
          <span className="font-semibold text-white">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto" />
          <div className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Messaging App Header */}
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Messages</div>
              <div className="text-[11px] text-slate-400 leading-tight">Visitor Handset</div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
            <span>3s auto</span>
          </div>
        </div>

        {/* Phone Body / Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/80">
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-xs">
              Connecting to simulated SMS radio...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-24 space-y-2 text-slate-500">
              <Smartphone className="w-10 h-10 mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-slate-400">No incoming messages</div>
              <p className="text-xs max-w-[220px] mx-auto text-slate-500">
                When an employee approves a visitor at gate, the OTP SMS appears here immediately.
              </p>
            </div>
          ) : (
            messages.map((sms) => {
              // Parse out OTP if present (e.g. 6 consecutive digits)
              const otpMatch = sms.message.match(/\b([0-9]{6})\b/);
              const extractedOtp = otpMatch ? otpMatch[1] : null;

              return (
                <div key={sms.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span className="font-semibold text-blue-400">Gate Security</span>
                    <span className="tabular-nums">
                      {new Date(sms.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 text-slate-100 rounded-2xl rounded-tl-sm p-3.5 shadow">
                    <div className="text-xs text-slate-300 leading-relaxed font-sans">
                      {sms.message}
                    </div>

                    {extractedOtp && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/80 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Passcode
                        </span>
                        <span className="bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-lg font-bold px-3 py-0.5 rounded tracking-widest tabular-nums">
                          {extractedOtp}
                        </span>
                      </div>
                    )}

                    <div className="mt-1.5 text-[10px] text-slate-400 text-right">
                      To: +91 {sms.mobile}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Home Indicator */}
        <div className="bg-slate-900 py-2 flex justify-center">
          <div className="w-32 h-1 bg-slate-600 rounded-full" />
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500 mt-4">
        Last polled: {lastRefreshed.toLocaleTimeString()} (Auto-refresh active)
      </div>
    </div>
  );
}
