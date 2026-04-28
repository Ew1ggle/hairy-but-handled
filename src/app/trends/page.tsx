"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import { TrendCard } from "@/components/TrendCard";
import { useEntries, type FlagEvent, type Trend } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { detectTrends, getBaselineComparison, getBloodsComparison, type DetectedTrend, type TrendSeverity } from "@/lib/trends";
import { BaselineVitalsTable, BloodsComparisonTable } from "@/components/ComparisonTables";
import { SIGNAL_BY_ID } from "@/lib/signals";
import { format, parseISO, subDays } from "date-fns";
import { ChevronRight, Sparkles, History, CheckCircle, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/** signalTypes excluded from the auto-derived "symptom picture from
 *  signals" — these are vitals or intake/output, not symptoms. */
const NON_SYMPTOM_SIGNAL_IDS = new Set([
  "spo2", "pulse",
  "food", "fluids", "urine", "bowel", "vomit",
]);

type Tab = "active" | "past";
type Filter = "all" | "discuss" | "watch";

export default function TrendsPage() {
  const { activePatientId } = useSession();
  const signals = useEntries("signal");
  const daily = useEntries("daily");
  const bloods = useEntries("bloods");
  const flags = useEntries("flag");
  const storedTrends = useEntries("trend");
  const symptomCards = useEntries("symptom");

  /** Symptom picture: combine the user's manually-created Symptom Deck
   *  cards with auto-derived rows from any signalType the user has logged
   *  3+ times in the last 14 days (vitals + intake/output excluded). */
  const symptomPicture = useMemo(() => {
    const active = symptomCards.filter((s) => s.stillActive !== false);
    const cutoff = subDays(new Date(), 14).toISOString();
    const recent = signals.filter((s) => s.createdAt >= cutoff);
    const groups = new Map<string, typeof signals>();
    for (const s of recent) {
      if (NON_SYMPTOM_SIGNAL_IDS.has(s.signalType)) continue;
      if (!groups.has(s.signalType)) groups.set(s.signalType, []);
      groups.get(s.signalType)!.push(s);
    }
    const derived = Array.from(groups.entries())
      .filter(([, list]) => list.length >= 3)
      .map(([id, list]) => {
        const def = SIGNAL_BY_ID[id];
        const sorted = list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return {
          id,
          label: def?.label ?? id,
          count: list.length,
          latest: sorted[0],
        };
      })
      .filter((d) => {
        // Drop derived rows that already exist as a manual Symptom Deck
        // card so the user doesn't see the same name twice.
        return !active.some((s) => s.name.toLowerCase().trim() === d.label.toLowerCase().trim());
      })
      .sort((a, b) => b.count - a.count);
    return { active, derived };
  }, [symptomCards, signals]);

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
  const ruleInput = useMemo(() => ({
    signals, daily, bloods, flags,
    baselineTemp: baselines.temp,
    baselineHR: baselines.hr,
    baselineWeight: baselines.weight,
  }), [signals, daily, bloods, flags, baselines]);

  const detected: DetectedTrend[] = useMemo(
    () => detectTrends(ruleInput),
    [ruleInput],
  );

  // Always-visible comparison tables: default to a 14-day window so they
  // stay responsive to recent changes. The /export page shows the same
  // tables with a user-controlled window.
  const vitalRows = useMemo(() => getBaselineComparison(ruleInput, 14), [ruleInput]);
  const bloodRows = useMemo(() => getBloodsComparison(bloods, 14), [bloods]);

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
      // Close any open trend whose rule no longer fires. If the trend
      // was urgent and had a linked Tripwire flag, mark that flag's
      // outcome too so /ed-triggers shows the trend has resolved
      // rather than dangling forever.
      for (const [ruleId, trend] of openByRuleId) {
        if (!detectedIds.has(ruleId)) {
          await updateEntry(trend.id, { resolvedAt: new Date().toISOString() });
          if (trend.severity === "urgent") {
            const linkedFlag = flags.find((f) =>
              f.triggerLabel === `Trend (urgent): ${trend.title}` && !f.outcome,
            );
            if (linkedFlag) {
              await updateEntry(linkedFlag.id, { outcome: "Trend resolved" });
            }
          }
        }
      }
      // Open a new entry for any newly-detected rule. Urgent trends
      // also fire a linked Tripwire flag the first time they're
      // detected — title-based dedup means re-renders don't pile up
      // duplicates.
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
        if (d.severity === "urgent") {
          const flagLabel = `Trend (urgent): ${d.title}`;
          const alreadyFlagged = flags.some((f) => f.triggerLabel === flagLabel);
          if (!alreadyFlagged) {
            await addEntry({
              kind: "flag",
              triggerLabel: flagLabel,
            } as Omit<FlagEvent, "id" | "createdAt">);
          }
        }
      }
    })();
  }, [detected, storedTrends, flags, addEntry, updateEntry, signals.length, daily.length, bloods.length]);

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

      {/* Always-on snapshot: where current numbers sit vs the personal
           baseline (vitals) and vs the previous result (bloods). Last 14
           days of readings — export carries the same view with its own
           window toggle. */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-2 mb-2">
        Compared to your baseline · last 14 days
      </h2>
      <div className="mb-4">
        <BaselineVitalsTable rows={vitalRows} windowLabel="in the last 14 days" />
      </div>

      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mb-2">
        Bloods · latest vs previous · last 14 days
      </h2>
      <div className="mb-5">
        <BloodsComparisonTable rows={bloodRows} windowLabel="in the last 14 days" />
      </div>

      {/* Symptom picture — combines manually-tracked Symptom Deck cards
           with anything the user has logged ≥ 3 times in Signal Sweep
           over the last 14 days. Auto-derived rows have a 'tap to add
           to Deck' link that deep-links to /symptoms with the name
           pre-filled, so promoting a recurring signal to a tracked
           symptom is one tap. */}
      {(symptomPicture.active.length > 0 || symptomPicture.derived.length > 0) && (
        <Card className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-1.5">
              <Stethoscope size={16} className="text-[var(--purple)]" />
              Symptom picture · last 14 days
            </h2>
            <Link href="/symptoms" className="text-xs text-[var(--primary)] font-medium">
              Open Deck →
            </Link>
          </div>
          {symptomPicture.active.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
                From your Symptom Deck
              </div>
              <div className="flex flex-wrap gap-1.5">
                {symptomPicture.active.map((s) => (
                  <Link
                    key={s.id}
                    href="/symptoms"
                    className="text-xs rounded-full px-2.5 py-1 font-medium bg-[var(--surface-soft)] text-[var(--ink)]"
                  >
                    {s.name}
                    {s.severity && <span className="opacity-70"> · {s.severity}</span>}
                    {s.pattern && <span className="opacity-70"> · {s.pattern}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {symptomPicture.derived.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
                From recent signals (logged ≥ 3 times) — tap to add to Deck
              </div>
              <ul className="space-y-1.5">
                {symptomPicture.derived.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/symptoms?addName=${encodeURIComponent(d.label)}`}
                      className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 active:bg-[var(--surface-soft)] transition"
                    >
                      <span className="text-sm font-medium flex-1">{d.label}</span>
                      <span className="text-xs text-[var(--ink-soft)]">
                        {d.count}× · last {format(parseISO(d.latest.createdAt), "d MMM HH:mm")}
                      </span>
                      <ChevronRight size={14} className="text-[var(--ink-soft)] shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

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
