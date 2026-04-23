"use client";

/** Inline SVG line chart for trend data — no external deps.
 *  - Numeric points (v:number) plot as a line.
 *  - Label-only points (label:string) are stacked as a discrete timeline.
 *  - Baseline and threshold render as dashed / dotted horizontal guides. */
export function MiniLineChart({
  points,
  baseline,
  threshold,
  unit,
  height = 120,
}: {
  points: { t: string; v?: number | null; label?: string }[];
  baseline?: number;
  threshold?: number;
  unit?: string;
  height?: number;
}) {
  const width = 320;
  const padL = 28;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const numericPoints = points
    .map((p, i) => ({ ...p, i }))
    .filter((p): p is { t: string; v: number; label?: string; i: number } => typeof p.v === "number");

  // If nothing numeric, render a label timeline instead
  if (numericPoints.length === 0) {
    const labels = points.filter((p) => p.label);
    if (labels.length === 0) return null;
    const maxPerRow = 4;
    return (
      <div className="space-y-1 mb-2">
        <div className="flex flex-wrap gap-1.5">
          {labels.slice(0, maxPerRow * 2).map((p, i) => (
            <div
              key={i}
              className="text-[10px] rounded bg-[var(--surface-soft)] px-2 py-0.5 border border-[var(--border)]"
            >
              <span className="text-[var(--ink-soft)]">
                {new Date(p.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}:
              </span>{" "}
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const times = numericPoints.map((p) => new Date(p.t).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const tSpan = Math.max(tMax - tMin, 1);

  const vals = numericPoints.map((p) => p.v);
  const extra = [baseline, threshold].filter((v): v is number => typeof v === "number");
  const vMin = Math.min(...vals, ...extra);
  const vMax = Math.max(...vals, ...extra);
  const vSpan = Math.max(vMax - vMin, 1);
  const yPad = vSpan * 0.1;

  const scaleX = (t: number) => padL + ((t - tMin) / tSpan) * plotW;
  const scaleY = (v: number) =>
    padT + plotH - ((v - (vMin - yPad)) / (vSpan + 2 * yPad)) * plotH;

  const path = numericPoints
    .map((p, i) => {
      const x = scaleX(new Date(p.t).getTime());
      const y = scaleY(p.v);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const lineColor = "var(--primary)";
  const baselineY = baseline != null ? scaleY(baseline) : null;
  const thresholdY = threshold != null ? scaleY(threshold) : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxWidth: "100%" }}
      role="img"
      aria-label="Trend chart"
    >
      {/* Y-axis labels (min / max) */}
      <text x={padL - 4} y={padT + 4} fontSize="9" textAnchor="end" fill="currentColor" opacity={0.5}>
        {(vMax + yPad).toFixed(1)}
      </text>
      <text x={padL - 4} y={padT + plotH} fontSize="9" textAnchor="end" fill="currentColor" opacity={0.5}>
        {(vMin - yPad).toFixed(1)}
      </text>

      {/* Baseline guide */}
      {baselineY != null && (
        <>
          <line
            x1={padL}
            x2={padL + plotW}
            y1={baselineY}
            y2={baselineY}
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 3"
            strokeWidth="1"
          />
          <text x={padL + plotW} y={baselineY - 2} fontSize="9" textAnchor="end" fill="currentColor" opacity={0.55}>
            baseline {baseline}{unit ?? ""}
          </text>
        </>
      )}

      {/* Threshold guide (red) */}
      {thresholdY != null && (
        <>
          <line
            x1={padL}
            x2={padL + plotW}
            y1={thresholdY}
            y2={thresholdY}
            stroke="var(--alert)"
            strokeOpacity="0.6"
            strokeDasharray="2 3"
            strokeWidth="1"
          />
          <text
            x={padL + plotW}
            y={thresholdY - 2}
            fontSize="9"
            textAnchor="end"
            fill="var(--alert)"
            opacity={0.75}
          >
            threshold {threshold}{unit ?? ""}
          </text>
        </>
      )}

      {/* The line */}
      <path d={path} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Points */}
      {numericPoints.map((p) => {
        const x = scaleX(new Date(p.t).getTime());
        const y = scaleY(p.v);
        const overThreshold = threshold != null && p.v >= threshold;
        return (
          <circle
            key={p.i}
            cx={x}
            cy={y}
            r={overThreshold ? 3.5 : 2.5}
            fill={overThreshold ? "var(--alert)" : lineColor}
          />
        );
      })}

      {/* First + last date labels */}
      <text x={padL} y={height - 6} fontSize="9" fill="currentColor" opacity={0.5}>
        {new Date(numericPoints[0].t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </text>
      <text x={padL + plotW} y={height - 6} fontSize="9" textAnchor="end" fill="currentColor" opacity={0.5}>
        {new Date(numericPoints[numericPoints.length - 1].t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </text>
    </svg>
  );
}
