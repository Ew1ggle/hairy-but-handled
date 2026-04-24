"use client";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { detectTrends, type DetectedTrend } from "@/lib/trends";
import { Sparkles, TrendingUp, AlertTriangle, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Compact "trends firing now" summary, used on home + Daily Trace.
 *  Runs the same rule engine as /trends; lists top few + links to full page. */
export function TrendsSummaryCard({ maxItems = 3, title = "Trends firing" }: {
  maxItems?: number;
  title?: string;
}) {
  const { activePatientId } = useSession();
  const signals = useEntries("signal");
  const daily = useEntries("daily");
  const bloods = useEntries("bloods");
  const flags = useEntries("flag");

  const [baselines, setBaselines] = useState<{ temp?: number; hr?: number; weight?: number }>({});

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as
          | { baselineTemp?: string; baselineHR?: string; baselineWeight?: string }
          | undefined;
        const parse = (s?: string) => {
          if (!s) return undefined;
          const n = Number(s);
          return Number.isFinite(n) ? n : undefined;
        };
        setBaselines({
          temp: parse(p?.baselineTemp),
          hr: parse(p?.baselineHR),
          weight: parse(p?.baselineWeight),
        });
      });
  }, [activePatientId]);

  const trends: DetectedTrend[] = useMemo(
    () => detectTrends({
      signals, daily, bloods, flags,
      baselineTemp: baselines.temp,
      baselineHR: baselines.hr,
      baselineWeight: baselines.weight,
    }),
    [signals, daily, bloods, flags, baselines],
  );

  if (trends.length === 0) {
    return (
      <Link href="/trends" className="block mb-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition">
          <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-[var(--ink-soft)]">Nothing jumping out right now — tap to see the full view.</div>
          </div>
          <Sparkles size={14} className="text-[var(--ink-soft)] shrink-0" />
        </div>
      </Link>
    );
  }

  const discuss = trends.filter((t) => t.severity === "discuss").length;
  const watch = trends.filter((t) => t.severity === "watch").length;
  const urgent = trends.filter((t) => t.severity === "urgent").length;

  return (
    <Link href="/trends" className="block mb-4">
      <div
        className="rounded-2xl border-2 p-4"
        style={{
          borderColor: urgent > 0 || discuss > 0 ? "var(--alert)" : "#d4a017",
          backgroundColor: urgent > 0 || discuss > 0 ? "var(--alert-soft)" : "#fef9e7",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: urgent > 0 || discuss > 0 ? "var(--alert)" : "#d4a017",
              color: "#fff",
            }}>
            <TrendingUp size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="font-semibold text-sm"
                style={{ color: urgent > 0 || discuss > 0 ? "var(--alert)" : "#8a6d0f" }}
              >
                {title} — {trends.length}
              </div>
              <div className="text-[10px] flex gap-1.5">
                {urgent > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-white bg-[var(--alert)] px-1.5 py-0.5 rounded-full">
                    <AlertTriangle size={9} /> {urgent} urgent
                  </span>
                )}
                {discuss > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-white px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--alert)" }}
                  >
                    <TrendingUp size={9} /> {discuss} discuss
                  </span>
                )}
                {watch > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-white px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "#d4a017" }}
                  >
                    <Eye size={9} /> {watch} watch
                  </span>
                )}
              </div>
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {trends.slice(0, maxItems).map((t) => (
                <li
                  key={t.ruleId}
                  className="text-xs"
                  style={{ color: urgent > 0 || discuss > 0 ? "var(--alert)" : "#8a6d0f", opacity: 0.9 }}
                >
                  · {t.title}
                </li>
              ))}
              {trends.length > maxItems && (
                <li
                  className="text-[11px] mt-1"
                  style={{ color: urgent > 0 || discuss > 0 ? "var(--alert)" : "#8a6d0f", opacity: 0.75 }}
                >
                  +{trends.length - maxItems} more — tap to review →
                </li>
              )}
            </ul>
          </div>
          <Sparkles
            size={16}
            className="shrink-0"
            style={{ color: urgent > 0 || discuss > 0 ? "var(--alert)" : "#8a6d0f" }}
          />
        </div>
      </div>
    </Link>
  );
}
