"use client";
import { useEntries } from "@/lib/store";
import { getNadirContext, NADIR_LABEL } from "@/lib/nadirWindow";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

/** "Where are we on the curve" banner. Tells the carer what window
 *  the patient is in relative to the most recent infusion + the
 *  fever threshold to use for that window. Shown on home and Daily
 *  Trace. Only fires loudly during the high-risk windows (nadir +
 *  late-onset); for pre/recovery/stable it stays compact and grey
 *  so it doesn't add noise. */
export function NadirBanner() {
  const infusions = useEntries("infusion");
  const ctx = useMemo(() => getNadirContext(infusions), [infusions]);

  if (!ctx.lastInfusion) return null;

  const isHigh = ctx.state === "nadir";
  const isWatch = ctx.state === "late";

  if (!isHigh && !isWatch) {
    return (
      <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--ink)]">{NADIR_LABEL[ctx.state]}</span>
          <span className="text-[var(--ink-soft)]">· {ctx.headline}</span>
        </div>
        <div className="text-[var(--ink-soft)] mt-0.5">{ctx.detail}</div>
      </div>
    );
  }

  // High = nadir (red, urgent). Watch = late-onset (blue accent,
  // less alarming but still worth seeing). Both pull from the
  // project palette — no amber/yellow.
  const accentColor = isHigh ? "var(--alert)" : "var(--accent)";
  const accentSoft = isHigh ? "var(--alert-soft)" : "var(--surface-soft)";

  return (
    <div
      className="mb-3 rounded-2xl border-2 px-4 py-3 flex items-start gap-3"
      style={{ backgroundColor: accentSoft, borderColor: accentColor }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white"
        style={{ backgroundColor: accentColor }}
      >
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm uppercase tracking-wide" style={{ color: accentColor }}>
          {ctx.headline}
        </div>
        <div className="text-xs mt-0.5" style={{ color: accentColor }}>
          {ctx.detail}
        </div>
        <div
          className="text-[10px] uppercase tracking-wider mt-1.5 inline-block rounded-full bg-white/40 px-2 py-0.5 font-semibold"
          style={{ color: accentColor }}
        >
          Fever threshold: {ctx.feverThreshold.toFixed(1)}°C
        </div>
      </div>
    </div>
  );
}
