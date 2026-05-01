"use client";
import { useEntries } from "@/lib/store";
import { getNadirContext, NADIR_LABEL, type NadirContext } from "@/lib/nadirWindow";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

/** "Where are we on the curve" banner. Tells the carer what window
 *  the patient is in relative to the most recent infusion + the
 *  fever threshold to use for that window. Shown on home and Daily
 *  Trace. Loud red when in nadir, accent-blue for late-onset, and
 *  compact-but-expandable for pre / recovery / stable so the
 *  framing is reachable without dominating the page. */
export function NadirBanner() {
  const infusions = useEntries("infusion");
  const ctx = useMemo(() => getNadirContext(infusions), [infusions]);
  const [expanded, setExpanded] = useState(false);

  if (!ctx.lastInfusion) return null;

  const isHigh = ctx.state === "nadir";
  const isWatch = ctx.state === "late";

  if (!isHigh && !isWatch) {
    // Compact (pre / recovery / stable) — collapsed by default with a
    // tap to expand. The "what this means" copy is the most important
    // pre-nadir framing so we want it reachable, not buried.
    return (
      <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--ink)]">{NADIR_LABEL[ctx.state]}</span>
            <span className="text-[var(--ink-soft)]">· {ctx.headline}</span>
          </div>
          <span className="text-[var(--primary)] font-semibold shrink-0">{expanded ? "Hide" : "Read"}</span>
        </button>
        {expanded && <BannerBody ctx={ctx} />}
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
        <BannerBody ctx={ctx} accentColor={accentColor} loud />
        <div
          className="text-[10px] uppercase tracking-wider mt-2 inline-block rounded-full bg-white/40 px-2 py-0.5 font-semibold"
          style={{ color: accentColor }}
        >
          Fever threshold: {ctx.feverThreshold.toFixed(1)}°C
        </div>
      </div>
    </div>
  );
}

/** Reusable body — three labelled blocks: What's happening / What
 *  this means / Today. Used by both the loud nadir / late banners
 *  and the expanded compact pre / recovery / stable banner. */
function BannerBody({
  ctx,
  accentColor,
  loud,
}: {
  ctx: NadirContext;
  accentColor?: string;
  loud?: boolean;
}) {
  const labelStyle = loud && accentColor ? { color: accentColor } : undefined;
  const bodyClass = loud
    ? "text-xs"
    : "text-[var(--ink)] mt-1";
  const bodyStyle = loud && accentColor ? { color: accentColor } : undefined;
  return (
    <div className={loud ? "mt-1 space-y-1.5" : "mt-2 space-y-1.5"}>
      <Block title="What's happening" loud={loud} labelStyle={labelStyle}>
        <span className={bodyClass} style={bodyStyle}>{ctx.context}</span>
      </Block>
      <Block title="What this means" loud={loud} labelStyle={labelStyle}>
        <span className={bodyClass} style={bodyStyle}>{ctx.whatItMeans}</span>
      </Block>
      {ctx.actionsToday.length > 0 && (
        <Block title="Today" loud={loud} labelStyle={labelStyle}>
          <ul className={`${bodyClass} space-y-0.5`} style={bodyStyle}>
            {ctx.actionsToday.map((a, i) => (
              <li key={i}>· {a}</li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}

function Block({
  title,
  loud,
  labelStyle,
  children,
}: {
  title: string;
  loud?: boolean;
  labelStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`text-[10px] uppercase tracking-widest font-semibold ${loud ? "" : "text-[var(--ink-soft)]"}`}
        style={labelStyle}
      >
        {title}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
