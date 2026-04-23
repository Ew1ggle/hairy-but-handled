"use client";
import { MiniLineChart } from "@/components/MiniLineChart";
import type { DetectedTrend } from "@/lib/trends";
import { format, parseISO } from "date-fns";
import { AlertTriangle, TrendingUp, Eye } from "lucide-react";

const severityTone: Record<
  DetectedTrend["severity"],
  { label: string; bg: string; border: string; ink: string }
> = {
  urgent: {
    label: "URGENT",
    bg: "var(--alert-soft)",
    border: "var(--alert)",
    ink: "var(--alert)",
  },
  discuss: {
    label: "Discuss with team",
    bg: "color-mix(in srgb, var(--alert) 8%, transparent)",
    border: "var(--alert)",
    ink: "var(--alert)",
  },
  watch: {
    label: "Worth watching",
    bg: "#fef9e7",
    border: "#d4a017",
    ink: "#8a6d0f",
  },
};

export function TrendCard({ trend }: { trend: DetectedTrend }) {
  const tone = severityTone[trend.severity];
  const numericPoints = trend.dataPoints.filter((p) => typeof p.v === "number");

  return (
    <div
      className="mb-3 rounded-2xl p-4"
      style={{
        backgroundColor: tone.bg,
        border: `2px solid ${tone.border}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {trend.severity === "urgent" ? (
              <AlertTriangle size={16} style={{ color: tone.ink }} />
            ) : trend.severity === "discuss" ? (
              <TrendingUp size={16} style={{ color: tone.ink }} />
            ) : (
              <Eye size={16} style={{ color: tone.ink }} />
            )}
            <h3 className="font-semibold text-sm" style={{ color: tone.ink }}>
              {trend.title}
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: tone.ink, opacity: 0.9 }}>
            {trend.interpretation}
          </p>
        </div>
        <span
          className="shrink-0 inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: tone.ink, color: "#fff" }}
        >
          {tone.label}
        </span>
      </div>

      {/* Chart */}
      <div className="mt-2 bg-[var(--surface)] rounded-xl p-2 text-[var(--ink)]">
        <MiniLineChart
          points={trend.dataPoints}
          baseline={trend.baseline}
          threshold={trend.threshold}
          unit={trend.unit}
        />
      </div>

      {/* Data table */}
      {numericPoints.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs cursor-pointer font-medium" style={{ color: tone.ink }}>
            Show data table
          </summary>
          <div className="mt-2 overflow-auto bg-[var(--surface)] rounded-xl p-2 text-[var(--ink)]">
            <table className="w-full text-xs border-collapse table-fixed">
              <thead>
                <tr className="text-left border-b border-[var(--border)]">
                  <th className="py-1 px-1">When</th>
                  <th className="py-1 px-1">
                    {trend.metric}{trend.unit ? ` (${trend.unit})` : ""}
                  </th>
                  {trend.baseline != null && <th className="py-1 px-1">Δ baseline</th>}
                  {trend.dataPoints.some((p) => p.label) && <th className="py-1 px-1">Note</th>}
                </tr>
              </thead>
              <tbody>
                {trend.dataPoints.map((p, i) => {
                  const delta =
                    trend.baseline != null && typeof p.v === "number"
                      ? (p.v - trend.baseline).toFixed(1)
                      : null;
                  return (
                    <tr key={i} className={i % 2 ? "bg-[var(--surface-soft)]" : ""}>
                      <td className="py-1 px-1 align-top break-words">
                        {format(parseISO(p.t), "d MMM HH:mm")}
                      </td>
                      <td className="py-1 px-1 align-top break-words">
                        {typeof p.v === "number" ? p.v : "—"}
                      </td>
                      {trend.baseline != null && (
                        <td className="py-1 px-1 align-top break-words">
                          {delta != null ? (Number(delta) > 0 ? `+${delta}` : delta) : "—"}
                        </td>
                      )}
                      {trend.dataPoints.some((x) => x.label) && (
                        <td className="py-1 px-1 align-top break-words">{p.label ?? ""}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Why */}
      <div className="mt-2 text-xs leading-relaxed" style={{ color: tone.ink, opacity: 0.85 }}>
        <span className="font-semibold">Why:</span> {trend.why}
      </div>
    </div>
  );
}
