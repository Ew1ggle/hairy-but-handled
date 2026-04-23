"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import { TrendCard } from "@/components/TrendCard";
import { useEntries, type Trend } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { detectTrends, type DetectedTrend, type TrendSeverity } from "@/lib/trends";
import { format, parseISO } from "date-fns";
import { Sparkles, History, CheckCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "active" | "past";
type Filter = "all" | "discuss" | "watch";

export default function TrendsPage() {
  const { activePatientId } = useSession();
  const signals = useEntries("signal");
  const daily = useEntries("daily");
  const bloods = useEntries("bloods");
  const flags = useEntries("flag");
  const storedTrends = useEntries("trend");

  const [baselines, setBaselines] = useState<{
    temp?: number; hr?: number; weight?: number;
  }>({});
  const [tab, setTab] = useState<Tab>("active");
  const [filter, setFilter] = useState<Filter>("all");

  // Pull baseline vitals from the profile so rules that compare vs baseline
  // have the right yardstick.
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

  // Run the rule engine against the live data
  const detected: DetectedTrend[] = useMemo(
    () =>
      detectTrends({
        signals,
        daily,
        bloods,
        flags,
        baselineTemp: baselines.temp,
        baselineHR: baselines.hr,
        baselineWeight: baselines.weight,
      }),
    [signals, daily, bloods, flags, baselines],
  );

  // Persist: upsert Trend entries for every detected rule, mark resolvedAt
  // on stored open trends whose ruleId is no longer detected. Runs once per
  // mount to avoid ping-pong; the page is a natural place to reconcile.
  const reconciledRef = useRef(false);
  const { addEntry, updateEntry } = useSession();
  useEffect(() => {
    if (reconciledRef.current) return;
    if (signals.length === 0 && daily.length === 0 && bloods.length === 0 && flags.length === 0) return;
    reconciledRef.current = true;

    const detectedIds = new Set(detected.map((d) => d.ruleId));
    const openByRuleId = new Map<string, Trend>();
    for (const t of storedTrends) {
      if (!t.resolvedAt) openByRuleId.set(t.ruleId, t);
    }

    (async () => {
      // Close any open trend whose rule no longer fires
      for (const [ruleId, trend] of openByRuleId) {
        if (!detectedIds.has(ruleId)) {
          await updateEntry(trend.id, { resolvedAt: new Date().toISOString() });
        }
      }
      // Open a new entry for any newly-detected rule
      for (const d of detected) {
        if (openByRuleId.has(d.ruleId)) continue;
        await addEntry({
          kind: "trend",
          ruleId: d.ruleId,
          title: d.title,
          category: d.category,
          severity: d.severity,
          interpretation: d.interpretation,
          why: d.why,
          metric: d.metric,
          unit: d.unit,
          baseline: d.baseline,
          threshold: d.threshold,
          dataPoints: d.dataPoints,
          detectedAt: new Date().toISOString(),
        } as Omit<Trend, "id" | "createdAt">);
      }
    })();
  }, [detected, storedTrends, addEntry, updateEntry, signals.length, daily.length, bloods.length, flags.length]);

  // Display lists: active = detected now (fresh data); past = stored trends with resolvedAt set.
  const bySeverity = (t: { severity: TrendSeverity }) =>
    filter === "all" ? true : t.severity === filter;
  const activeList = detected.filter(bySeverity);

  const pastList = useMemo(
    () =>
      storedTrends
        .filter((t) => t.resolvedAt)
        .filter((t) => filter === "all" || t.severity === filter)
        .slice()
        .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? "")),
    [storedTrends, filter],
  );

  return (
    <AppShell>
      <PageTitle sub="What's shifting, and what it might mean">Trends</PageTitle>

      {/* Active / Past tabs */}
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border ${
            tab === "active"
              ? "bg-[var(--primary)] text-[var(--primary-ink)] border-[var(--primary)]"
              : "border-[var(--border)]"
          }`}
        >
          <Sparkles size={14} /> Active
          {activeList.length > 0 && <span className="text-[11px] opacity-80">({activeList.length})</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border ${
            tab === "past"
              ? "bg-[var(--primary)] text-[var(--primary-ink)] border-[var(--primary)]"
              : "border-[var(--border)]"
          }`}
        >
          <History size={14} /> Past
          {pastList.length > 0 && <span className="text-[11px] opacity-80">({pastList.length})</span>}
        </button>
      </div>

      {/* Severity filter */}
      <div className="mb-4 flex gap-1.5 text-xs">
        {(["all", "discuss", "watch"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 border ${
              filter === f
                ? "bg-[var(--surface-soft)] border-[var(--ink-soft)] font-medium"
                : "border-[var(--border)] text-[var(--ink-soft)]"
            }`}
          >
            {f === "all" ? "All" : f === "discuss" ? "Discuss" : "Worth watching"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "active" && (
        <>
          {activeList.length === 0 ? (
            <Card className="text-center py-8">
              <CheckCircle size={32} className="mx-auto mb-2 text-[var(--primary)] opacity-60" />
              <div className="font-semibold mb-1">No trends firing right now</div>
              <p className="text-xs text-[var(--ink-soft)]">
                Signals, daily logs, and blood results all look steady. Trends recompute automatically as new data lands.
              </p>
            </Card>
          ) : (
            <div>
              {activeList.map((t) => (
                <TrendCard key={t.ruleId} trend={t} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "past" && (
        <>
          {pastList.length === 0 ? (
            <Card className="text-center py-8">
              <History size={32} className="mx-auto mb-2 text-[var(--ink-soft)] opacity-60" />
              <div className="font-semibold mb-1">No past trends yet</div>
              <p className="text-xs text-[var(--ink-soft)]">
                When an active trend stops firing (e.g. temps settle), it moves here so the history is preserved.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {pastList.map((t) => (
                <Card key={t.id} className="opacity-80">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{t.title}</div>
                      <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                        {t.interpretation}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)]">
                      resolved
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--ink-soft)] mt-2">
                    Detected {format(parseISO(t.detectedAt), "d MMM yyyy")}
                    {t.resolvedAt ? ` · resolved ${format(parseISO(t.resolvedAt), "d MMM yyyy")}` : ""}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
