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

  return (
    <div
      className="mb-3 rounded-2xl border-2 px-4 py-3 flex items-start gap-3"
      style={{
        backgroundColor: isHigh ? "var(--alert-soft)" : "#fef9e7",
        borderColor: isHigh ? "var(--alert)" : "#d4a017",
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: isHigh ? "var(--alert)" : "#d4a017",
          color: "#fff",
        }}
      >
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-bold text-sm uppercase tracking-wide"
          style={{ color: isHigh ? "var(--alert)" : "#8a6d0f" }}
        >
          {ctx.headline}
        </div>
        <div className="text-xs mt-0.5" style={{ color: isHigh ? "var(--alert)" : "#8a6d0f" }}>
          {ctx.detail}
        </div>
        <div className="text-[10px] uppercase tracking-wider mt-1.5 inline-block rounded-full bg-white/40 px-2 py-0.5 font-semibold" style={{ color: isHigh ? "var(--alert)" : "#8a6d0f" }}>
          Fever threshold: {ctx.feverThreshold.toFixed(1)}°C
        </div>
      </div>
    </div>
  );
}
