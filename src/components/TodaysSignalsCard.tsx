"use client";
import { Card } from "@/components/ui";
import { useEntries, type Signal } from "@/lib/store";
import { SIGNAL_BY_ID, formatReading, type Category } from "@/lib/signals";
import { format, isToday, parseISO } from "date-fns";
import { Activity, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type GroupRow = { label: string; value: string; flagged?: boolean; time?: string };

/** Compact summary of today's Signal Sweep entries, grouped by category.
 *  Used on Daily Trace so the person can see what's already been captured
 *  without re-entering it. */
export function TodaysSignalsCard() {
  const signals = useEntries("signal");
  const todays = useMemo(
    () =>
      signals
        .filter((s) => isToday(parseISO(s.createdAt)))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [signals],
  );

  if (todays.length === 0) {
    return (
      <div
        className="mb-4 rounded-2xl px-4 py-3.5 flex items-center gap-3"
        style={{
          backgroundColor: "#fef9e7",
          border: "2px solid #d4a017",
        }}
      >
        <Activity size={20} style={{ color: "#b8860b" }} />
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: "#8a6d0f" }}>
            No signals yet today
          </div>
          <div className="text-xs" style={{ color: "#8a6d0f" }}>
            Log temp, SpO₂, mood, pain and more in Signal Sweep — they'll appear here.
          </div>
        </div>
        <Link
          href="/signal-sweep"
          className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "#d4a017" }}
        >
          Open
        </Link>
      </div>
    );
  }

  const flagCount = todays.filter((s) => s.autoFlag).length;

  const byCat: Record<Category, GroupRow[]> = { body: [], fluids: [], mind: [], other: [] };

  // Group most-recent reading per signalType, plus min/max for numeric temp
  const byType = new Map<string, Signal[]>();
  for (const s of todays) {
    const arr = byType.get(s.signalType) ?? [];
    arr.push(s);
    byType.set(s.signalType, arr);
  }

  for (const [typeId, entries] of byType) {
    const def = SIGNAL_BY_ID[typeId];
    if (!def) continue;
    const latest = entries[entries.length - 1];
    const time = format(parseISO(latest.createdAt), "HH:mm");
    let value = formatReading(def, latest);

    // For numeric temp/pulse/SpO2 that was logged multiple times, surface min/max
    if (def.input.kind === "number" && entries.length > 1) {
      const nums = entries.map((e) => e.value).filter((v): v is number => typeof v === "number");
      if (nums.length > 1) {
        const min = Math.min(...nums); const max = Math.max(...nums);
        value = `${latest.value} ${def.input.unit} · range ${min}–${max}`;
      }
    }
    // Vomiting: show count and the most urgent intensity
    if (typeId === "vomit") {
      value = `${entries.length} episode${entries.length === 1 ? "" : "s"} — latest: ${latest.choice ?? "—"}`;
    }

    const flaggedHere = entries.some((e) => e.autoFlag);
    byCat[def.category].push({ label: def.label, value, flagged: flaggedHere, time });
  }

  const catLabel: Record<Category, string> = { body: "Body", fluids: "In / out", mind: "Mind", other: "Other" };
  const catColour: Record<Category, string> = {
    body: "var(--blue)", fluids: "var(--primary)", mind: "var(--purple)", other: "var(--pink)",
  };

  return (
    <Card className="mb-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Activity size={14} /> Today's signals
          </div>
          <div className="text-xs text-[var(--ink-soft)]">
            {todays.length} reading{todays.length === 1 ? "" : "s"} from Signal Sweep
            {flagCount > 0 && (
              <> · <span className="text-[var(--alert)] font-semibold">{flagCount} red-flagged</span></>
            )}
          </div>
        </div>
        <Link href="/signal-sweep" className="shrink-0 text-xs font-medium text-[var(--primary)]">
          Open →
        </Link>
      </div>

      {(["body", "fluids", "mind", "other"] as Category[]).map((cat) => {
        const rows = byCat[cat];
        if (!rows.length) return null;
        return (
          <div key={cat} className="mt-2.5 first:mt-0">
            <div
              className="text-[10px] uppercase tracking-widest font-bold mb-1"
              style={{ color: catColour[cat] }}
            >
              {catLabel[cat]}
            </div>
            <ul className="space-y-1">
              {rows.map((r, i) => (
                <li key={`${cat}-${i}`} className="flex items-start gap-2 text-sm">
                  <span className="font-medium shrink-0">{r.label}:</span>
                  <span className="flex-1 min-w-0 break-words text-[var(--ink-soft)]">{r.value}</span>
                  {r.flagged && (
                    <AlertTriangle size={13} className="text-[var(--alert)] shrink-0 mt-0.5" />
                  )}
                  {r.time && (
                    <span className="text-[11px] tabular-nums text-[var(--ink-soft)] shrink-0 mt-0.5">{r.time}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </Card>
  );
}
