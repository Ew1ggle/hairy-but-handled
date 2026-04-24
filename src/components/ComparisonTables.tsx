"use client";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { BloodRow, VitalRow } from "@/lib/trends";

/** Shared visual for the baseline-vs-current tables shown on /trends and in
 *  the export. Keeps the two surfaces rendering identically so patients and
 *  clinicians see the same numbers. */

type Props = { rows: VitalRow[]; windowLabel: string };

export function BaselineVitalsTable({ rows, windowLabel }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">
        No vital readings logged {windowLabel}.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="grid grid-cols-[1.3fr_0.9fr_1.1fr_0.9fr_0.7fr] text-[10px] uppercase tracking-wide text-[var(--ink-soft)] bg-[var(--surface-soft)] px-3 py-2 font-semibold">
        <div>Vital</div>
        <div>Baseline</div>
        <div>Latest</div>
        <div>{windowLabel === "all-time" ? "Average" : "Typical"}</div>
        <div className="text-right">Δ</div>
      </div>
      {rows.map((r) => (
        <div key={r.metric} className="grid grid-cols-[1.3fr_0.9fr_1.1fr_0.9fr_0.7fr] px-3 py-2.5 text-sm border-t border-[var(--border)] items-center">
          <div className="font-medium">{r.metric}</div>
          <div className="text-[var(--ink-soft)]">
            {typeof r.baseline === "number" ? `${r.baseline} ${r.unit}` : r.baselineLabel ?? "—"}
          </div>
          <div>
            {r.latest ? (
              <>
                <div>{r.latest.value} {r.unit}</div>
                <div className="text-[10px] text-[var(--ink-soft)]">
                  {format(parseISO(r.latest.at), "d MMM")}
                </div>
              </>
            ) : "—"}
          </div>
          <div className="text-[var(--ink-soft)]">
            {typeof r.recentAvg === "number" ? `${r.recentAvg} ${r.unit}` : "—"}
            {r.readings > 0 && (
              <div className="text-[10px]">{r.readings} reading{r.readings === 1 ? "" : "s"}</div>
            )}
          </div>
          <div className="text-right">
            <DeltaPill delta={r.delta} direction={r.direction} unit={r.unit} />
          </div>
        </div>
      ))}
    </div>
  );
}

type BloodsProps = { rows: BloodRow[]; windowLabel: string };

export function BloodsComparisonTable({ rows, windowLabel }: BloodsProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">
        No blood results {windowLabel}.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="grid grid-cols-[1.2fr_0.9fr_1fr_1fr_0.7fr] text-[10px] uppercase tracking-wide text-[var(--ink-soft)] bg-[var(--surface-soft)] px-3 py-2 font-semibold">
        <div>Test</div>
        <div>Ref range</div>
        <div>Latest</div>
        <div>Previous</div>
        <div className="text-right">Δ</div>
      </div>
      {rows.map((r) => (
        <div key={r.metric} className="grid grid-cols-[1.2fr_0.9fr_1fr_1fr_0.7fr] px-3 py-2.5 text-sm border-t border-[var(--border)] items-center">
          <div>
            <div className="font-medium">{r.metric}</div>
            <div className="text-[10px] text-[var(--ink-soft)]">{r.unit}</div>
          </div>
          <div className="text-[var(--ink-soft)] text-xs">{r.refRange ?? "—"}</div>
          <div>
            {r.latest ? (
              <>
                <div>{r.latest.value}</div>
                <div className="text-[10px] text-[var(--ink-soft)]">
                  {format(parseISO(r.latest.at), "d MMM")}
                </div>
              </>
            ) : "—"}
          </div>
          <div className="text-[var(--ink-soft)]">
            {r.previous ? (
              <>
                <div>{r.previous.value}</div>
                <div className="text-[10px]">
                  {format(parseISO(r.previous.at), "d MMM")}
                </div>
              </>
            ) : "—"}
          </div>
          <div className="text-right">
            <DeltaPill delta={r.delta} direction={r.direction} unit="" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DeltaPill({
  delta, direction, unit,
}: {
  delta?: number;
  direction?: "up" | "down" | "same";
  unit: string;
}) {
  if (typeof delta !== "number" || !direction) {
    return <span className="text-[var(--ink-soft)] text-xs">—</span>;
  }
  if (direction === "same" || delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--ink-soft)]">
        <ArrowRight size={10} /> 0
      </span>
    );
  }
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  const sign = delta > 0 ? "+" : "";
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium">
      <Icon size={10} />
      {sign}{delta}{unit ? ` ${unit}` : ""}
    </span>
  );
}
