"use client";

import { useEffect, useRef } from "react";

/**
 * Schedules sequential, non-overlapping background polling only while the tab is visible.
 * Prevents concurrent fetch pile-ups during slow database responses.
 */
export function usePolling(callback: () => Promise<void> | void, intervalMs: number) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const runPoll = async () => {
      if (cancelled) return;
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        await savedCallback.current();
      }
      if (!cancelled) {
        timerId = setTimeout(runPoll, intervalMs);
      }
    };

    runPoll();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [intervalMs]);
}
