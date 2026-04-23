"use client";
import { Card } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

/** Read-only summary of today's flag entries, embedded in Daily Trace.
 *  Replaces the old manual "Anything serious right now?" Yes/No grid so the
 *  source of truth is the flag entry table — auto-populated by Signal Sweep
 *  threshold crossings, manual Tripwires taps, and ED visits. */
export function TripwiresTodayCard() {
  const flags = useEntries("flag");

  const todays = useMemo(
    () =>
      flags
        .filter((f) => isToday(parseISO(f.createdAt)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [flags],
  );

  if (todays.length === 0) {
    return (
      <Link href="/ed-triggers" className="block mb-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition">
          <AlertTriangle size={18} className="text-[var(--ink-soft)]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Tripwires — none today</div>
            <div className="text-xs text-[var(--ink-soft)]">
              Anything serious? Tap to open Tripwires or log a symptom in Signal Sweep.
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--ink-soft)]" />
        </div>
      </Link>
    );
  }

  return (
    <Card className="mb-4 border-[var(--alert)]">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-[var(--alert)] flex items-center gap-1.5">
          <AlertTriangle size={14} /> Tripwires raised today
        </h2>
        <Link href="/ed-triggers" className="text-xs font-medium text-[var(--alert)]">
          Review →
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {todays.map((f) => (
          <li key={f.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
            <div className="shrink-0 w-12 text-xs tabular-nums text-[var(--ink-soft)] pt-0.5">
              {format(parseISO(f.createdAt), "HH:mm")}
            </div>
            <div className="flex-1 min-w-0 text-sm">{f.triggerLabel}</div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[var(--ink-soft)] mt-2 leading-relaxed">
        Auto-sourced from Signal Sweep readings, manual Tripwires taps, and ED visits. Review and clear on the Tripwires page.
      </p>
    </Card>
  );
}
