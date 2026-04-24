/** Rule-based trend detector across signals, daily logs, bloods, and flags.
 *
 *  Deliberately boring: no ML, no smoothing. Each rule is a tight function
 *  that returns a DetectedTrend if its condition holds, else null. Rules are
 *  defined with clinical context for HCL on cladribine — patients can shift
 *  over days, not weeks, so lookback windows are tight. */

import { subDays, subHours, parseISO, differenceInDays } from "date-fns";
import type { BloodResult, DailyLog, FlagEvent, Signal } from "./store";

export type TrendSeverity = "watch" | "discuss" | "urgent";
export type TrendCategory =
  | "vitals" | "mind" | "weight" | "sweats" | "infection"
  | "bloods" | "intake" | "bowel" | "autoimmune" | "flags";

export type TrendDataPoint = { t: string; v?: number | null; label?: string };

export type DetectedTrend = {
  ruleId: string;
  title: string;
  category: TrendCategory;
  severity: TrendSeverity;
  interpretation: string;
  why: string;
  metric: string;
  unit?: string;
  baseline?: number;
  threshold?: number;
  dataPoints: TrendDataPoint[];
};

export type TrendInput = {
  signals: readonly Signal[];
  daily: readonly DailyLog[];
  bloods: readonly BloodResult[];
  flags: readonly FlagEvent[];
  baselineTemp?: number;
  baselineHR?: number;
  baselineWeight?: number;
};

/** Order of the rules drives display priority (urgent/discuss first). */
export function detectTrends(input: TrendInput): DetectedTrend[] {
  const rules = [
    // Vitals
    ruleTempCreepingFever,
    ruleTempUnstable,
    ruleTachycardia,
    ruleHrBaselineDrift,
    ruleSpo2Low,
    ruleSpo2Trending,
    // Weight
    ruleWeightLossBaseline,
    ruleRapidWeightLoss,
    // Mind (includes mental health)
    ruleFatigueEscalating,
    rulePainEscalating,
    ruleMoodLow,
    ruleAnxietyEscalating,
    ruleBrainFogEscalating,
    ruleMoodSwing,
    ruleSleepShort,
    ruleNewPainLocation,
    // Sweats
    ruleNightSweatsPattern,
    ruleDaySweatsFrequency,
    // Infection clues
    ruleRecurringInfectionClue,
    // Bloods
    ruleNeutrophilsDown,
    rulePlateletsDown,
    ruleHbDrop,
    ruleCrpRising,
    ruleAutoimmuneCytopenia,
    // Intake / output
    ruleReducedIntake,
    ruleVomitingRecurring,
    ruleDarkUrine,
    ruleDiarrhoeaStreak,
    // Flag frequency
    ruleFlagsIncreasing,
    // Autoimmune pattern signals (secondary autoimmunity risk on cladribine)
    ruleAutoimmuneJointPlusRash,
    ruleAutoimmuneRecurringBruising,
    ruleAutoimmuneRecurringJointPain,
    ruleAutoimmuneRecurringRash,
  ];
  const out: DetectedTrend[] = [];
  for (const rule of rules) {
    try {
      const t = rule(input);
      if (t) out.push(t);
    } catch { /* skip any rule that throws on malformed data */ }
  }
  const weight = { urgent: 0, discuss: 1, watch: 2 };
  out.sort((a, b) => weight[a.severity] - weight[b.severity]);
  return out;
}

// ─── helpers ──────────────────────────────────────────────────────────────

function signalsOfType(input: TrendInput, type: string): Signal[] {
  return input.signals.filter((s) => s.signalType === type);
}

function withinHours<T extends { createdAt: string }>(entries: readonly T[], hours: number): T[] {
  const cutoff = subHours(new Date(), hours).toISOString();
  return entries.filter((e) => e.createdAt >= cutoff);
}

function withinDays<T extends { createdAt: string }>(entries: readonly T[], days: number): T[] {
  const cutoff = subDays(new Date(), days).toISOString();
  return entries.filter((e) => e.createdAt >= cutoff);
}

function byOldestFirst<T extends { createdAt: string }>(entries: T[]): T[] {
  return entries.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function pointsFromNumericSignals(list: Signal[]): TrendDataPoint[] {
  return list.map((s) => ({ t: s.createdAt, v: s.value ?? null }));
}

// ─── VITALS ───────────────────────────────────────────────────────────────

function ruleTempCreepingFever(input: TrendInput): DetectedTrend | null {
  const base = input.baselineTemp ?? 36.5;
  const threshold = base + 0.3;
  const recent = withinHours(signalsOfType(input, "temp"), 24);
  const above = recent.filter((s) => typeof s.value === "number" && s.value >= threshold);
  if (above.length < 3) return null;
  const pts = pointsFromNumericSignals(byOldestFirst(recent));
  return {
    ruleId: "temp-creeping-fever",
    title: "Temp edging up vs your baseline",
    category: "vitals",
    severity: "discuss",
    metric: "Temperature",
    unit: "°C",
    baseline: base,
    threshold,
    interpretation: `${above.length} readings in the last 24h at or above ${threshold.toFixed(1)}°C.`,
    why: `When at least 3 temperature readings in 24 hours sit above your normal + 0.3°C, the body is running warmer — worth a call even if no single reading hit 37.8°C.`,
    dataPoints: pts,
  };
}

function ruleTempUnstable(input: TrendInput): DetectedTrend | null {
  const recent = withinHours(signalsOfType(input, "temp"), 72);
  const vals = recent.map((s) => s.value).filter((v): v is number => typeof v === "number");
  if (vals.length < 4) return null;
  const range = Math.max(...vals) - Math.min(...vals);
  if (range < 1.0) return null;
  const pts = pointsFromNumericSignals(byOldestFirst(recent));
  return {
    ruleId: "temp-unstable",
    title: "Temperature swinging more than usual",
    category: "vitals",
    severity: "watch",
    metric: "Temperature",
    unit: "°C",
    interpretation: `Range of ${range.toFixed(1)}°C across ${vals.length} readings in 72h.`,
    why: `A swing over 1°C in three days can signal fever cycling, medication effect, or infection brewing. Not urgent, but worth flagging at the next review.`,
    dataPoints: pts,
  };
}

function ruleTachycardia(input: TrendInput): DetectedTrend | null {
  const recent = withinHours(signalsOfType(input, "pulse"), 24);
  const high = recent.filter((s) => typeof s.value === "number" && s.value > 100);
  if (high.length < 3) return null;
  const pts = pointsFromNumericSignals(byOldestFirst(recent));
  return {
    ruleId: "pulse-tachycardia",
    title: "Resting heart rate high",
    category: "vitals",
    severity: "discuss",
    metric: "Pulse",
    unit: "bpm",
    threshold: 100,
    interpretation: `${high.length} readings above 100 bpm in the last 24h.`,
    why: `A resting heart rate above 100 for multiple readings can indicate infection, anaemia, dehydration, or stress. Worth raising with the team.`,
    dataPoints: pts,
  };
}

function ruleHrBaselineDrift(input: TrendInput): DetectedTrend | null {
  if (input.baselineHR == null) return null;
  const recent = withinDays(signalsOfType(input, "pulse"), 7);
  const vals = recent.map((s) => s.value).filter((v): v is number => typeof v === "number");
  if (vals.length < 5) return null;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  if (avg - input.baselineHR < 10) return null;
  const pts = pointsFromNumericSignals(byOldestFirst(recent));
  return {
    ruleId: "pulse-drift",
    title: "Resting heart rate drifting above baseline",
    category: "vitals",
    severity: "watch",
    metric: "Pulse",
    unit: "bpm",
    baseline: input.baselineHR,
    interpretation: `7-day average ${avg.toFixed(0)} bpm vs baseline ${input.baselineHR}.`,
    why: `A sustained 10+ bpm rise above your normal resting rate can be an early sign of something shifting — infection, anaemia, or reduced fitness while unwell.`,
    dataPoints: pts,
  };
}

function ruleSpo2Low(input: TrendInput): DetectedTrend | null {
  const recent = withinHours(signalsOfType(input, "spo2"), 72);
  const low = recent.filter((s) => typeof s.value === "number" && s.value < 94 && s.value >= 92);
  if (low.length === 0) return null;
  const pts = pointsFromNumericSignals(byOldestFirst(recent));
  return {
    ruleId: "spo2-low",
    title: "SpO₂ below 94",
    category: "vitals",
    severity: "watch",
    metric: "SpO₂",
    unit: "%",
    threshold: 94,
    interpretation: `${low.length} reading${low.length === 1 ? "" : "s"} between 92 and 94 in the last 72h.`,
    why: `Below 94 isn't urgent on its own but is lower than normal (usually 95–99). Worth watching for a downward trend or breathlessness.`,
    dataPoints: pts,
  };
}

function ruleSpo2Trending(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "spo2"), 7);
  if (recent.length < 4) return null;
  const sorted = byOldestFirst(recent);
  const half = Math.floor(sorted.length / 2);
  const oldVals = sorted.slice(0, half).map((s) => s.value).filter((v): v is number => typeof v === "number");
  const newVals = sorted.slice(half).map((s) => s.value).filter((v): v is number => typeof v === "number");
  if (oldVals.length < 2 || newVals.length < 2) return null;
  const oldAvg = oldVals.reduce((s, v) => s + v, 0) / oldVals.length;
  const newAvg = newVals.reduce((s, v) => s + v, 0) / newVals.length;
  if (oldAvg - newAvg < 2) return null;
  return {
    ruleId: "spo2-trending-down",
    title: "SpO₂ drifting down",
    category: "vitals",
    severity: "watch",
    metric: "SpO₂",
    unit: "%",
    interpretation: `Average down ${(oldAvg - newAvg).toFixed(1)}% in the last 7 days.`,
    why: `Oxygen saturation sliding more than 2 points over a week is subtle but can mean something is changing in the lungs or blood-oxygen carrying capacity.`,
    dataPoints: pointsFromNumericSignals(sorted),
  };
}

// ─── WEIGHT ───────────────────────────────────────────────────────────────

function weightSeries(input: TrendInput, days: number): TrendDataPoint[] {
  const recent = withinDays(input.daily, days);
  return byOldestFirst(recent)
    .filter((d) => typeof d.weightKg === "number")
    .map((d) => ({ t: d.createdAt, v: d.weightKg ?? null }));
}

function ruleWeightLossBaseline(input: TrendInput): DetectedTrend | null {
  if (input.baselineWeight == null) return null;
  const pts = weightSeries(input, 14);
  if (pts.length === 0) return null;
  const latest = pts[pts.length - 1].v;
  if (typeof latest !== "number") return null;
  const loss = input.baselineWeight - latest;
  const pct = (loss / input.baselineWeight) * 100;
  if (pct < 2) return null;
  return {
    ruleId: "weight-loss-baseline",
    title: "Unintentional weight loss vs baseline",
    category: "weight",
    severity: "discuss",
    metric: "Weight",
    unit: "kg",
    baseline: input.baselineWeight,
    interpretation: `Down ${loss.toFixed(1)} kg (${pct.toFixed(1)}%) from baseline of ${input.baselineWeight} kg.`,
    why: `A 2%+ drop from baseline within two weeks is clinically meaningful — can affect chemo dosing and is a classic cancer warning signal.`,
    dataPoints: pts,
  };
}

function ruleRapidWeightLoss(input: TrendInput): DetectedTrend | null {
  const pts = weightSeries(input, 7);
  if (pts.length < 2) return null;
  const first = pts[0].v;
  const last = pts[pts.length - 1].v;
  if (typeof first !== "number" || typeof last !== "number") return null;
  if (first - last < 1) return null;
  return {
    ruleId: "weight-rapid-loss",
    title: "Rapid weight drop this week",
    category: "weight",
    severity: "discuss",
    metric: "Weight",
    unit: "kg",
    interpretation: `Down ${(first - last).toFixed(1)} kg in the last 7 days.`,
    why: `Losing a kilogram or more within a week without trying is fast — worth raising with the team in case fluid balance, appetite, or dosing needs review.`,
    dataPoints: pts,
  };
}

// ─── MIND / MENTAL HEALTH ─────────────────────────────────────────────────

function sliderSeries(input: TrendInput, type: string, days: number): Signal[] {
  return withinDays(signalsOfType(input, type), days);
}

function escalatingRule(series: Signal[]): boolean {
  const ordered = byOldestFirst(series);
  if (ordered.length < 3) return false;
  const last3 = ordered.slice(-3).map((s) => s.score).filter((v): v is number => typeof v === "number");
  if (last3.length < 3) return false;
  return last3[0] < last3[1] && last3[1] < last3[2];
}

function ruleFatigueEscalating(input: TrendInput): DetectedTrend | null {
  const s = sliderSeries(input, "fatigue", 7);
  if (!escalatingRule(s)) return null;
  const pts = byOldestFirst(s).map((x) => ({ t: x.createdAt, v: x.score ?? null }));
  return {
    ruleId: "fatigue-escalating",
    title: "Fatigue trending up",
    category: "mind",
    severity: "watch",
    metric: "Fatigue",
    interpretation: `Three readings rising in the last week (0–10 scale).`,
    why: `Fatigue climbing day-on-day can indicate anaemia building, infection, or disease load. Worth flagging if it keeps rising.`,
    dataPoints: pts,
  };
}

function rulePainEscalating(input: TrendInput): DetectedTrend | null {
  const s = sliderSeries(input, "pain", 7);
  // Pain is locatedRating — use max score across locations as the "value" for trend
  const ordered = byOldestFirst(s);
  const scored = ordered
    .map((p) => {
      const scores = (p.locationScores ?? []).map((l) => l.score);
      if (scores.length === 0) return null;
      return { t: p.createdAt, v: Math.max(...scores) };
    })
    .filter((x): x is { t: string; v: number } => x !== null);
  if (scored.length < 3) return null;
  const last3 = scored.slice(-3);
  if (!(last3[0].v < last3[1].v && last3[1].v < last3[2].v)) return null;
  return {
    ruleId: "pain-escalating",
    title: "Pain trending up",
    category: "mind",
    severity: "discuss",
    metric: "Pain (max)",
    interpretation: `Peak pain rating has risen three readings in a row.`,
    why: `Pain climbing without an obvious cause is worth a conversation — could be spleen-related, bone involvement, or an injury accumulating.`,
    dataPoints: scored,
  };
}

function ruleMoodLow(input: TrendInput): DetectedTrend | null {
  const s = sliderSeries(input, "mood", 7);
  const low = s.filter((x) => typeof x.score === "number" && x.score <= 3);
  if (low.length < 5) return null;
  const pts = byOldestFirst(s).map((x) => ({ t: x.createdAt, v: x.score ?? null }));
  return {
    ruleId: "mood-low-sustained",
    title: "Mood persistently low",
    category: "mind",
    severity: "discuss",
    metric: "Mood",
    interpretation: `${low.length} readings at 3/10 or below in the last 7 days.`,
    why: `Sustained low mood during cancer treatment isn't automatic depression, but it's worth flagging to psychology or your care team — support options exist.`,
    dataPoints: pts,
  };
}

function ruleAnxietyEscalating(input: TrendInput): DetectedTrend | null {
  const s = sliderSeries(input, "anxiety", 7);
  if (!escalatingRule(s)) return null;
  const pts = byOldestFirst(s).map((x) => ({ t: x.createdAt, v: x.score ?? null }));
  return {
    ruleId: "anxiety-escalating",
    title: "Anxiety trending up",
    category: "mind",
    severity: "watch",
    metric: "Anxiety",
    interpretation: `Anxiety rating rising across the last three readings.`,
    why: `Climbing anxiety is a real clinical symptom — can affect sleep, appetite, and immune function. Raise with GP or psychology if it persists.`,
    dataPoints: pts,
  };
}

function ruleBrainFogEscalating(input: TrendInput): DetectedTrend | null {
  const s = sliderSeries(input, "brainFog", 7);
  if (!escalatingRule(s)) return null;
  const pts = byOldestFirst(s).map((x) => ({ t: x.createdAt, v: x.score ?? null }));
  return {
    ruleId: "brainfog-escalating",
    title: "Brain fog worsening",
    category: "mind",
    severity: "watch",
    metric: "Brain fog",
    interpretation: `Fuzzy-thinking rating rising across the last three readings.`,
    why: `Escalating cognitive fog can be a side of anaemia, sleep disruption, low-grade infection, or medication accumulation. Worth flagging.`,
    dataPoints: pts,
  };
}

function ruleMoodSwing(input: TrendInput): DetectedTrend | null {
  const s = byOldestFirst(sliderSeries(input, "mood", 5));
  if (s.length < 4) return null;
  const recent = s.slice(-1)[0];
  const prior = s.slice(-4, -1);
  if (typeof recent.score !== "number") return null;
  const priorAvg = prior.map((x) => x.score ?? 0).reduce((a, b) => a + b, 0) / prior.length;
  if (priorAvg - recent.score < 4) return null;
  const pts = s.map((x) => ({ t: x.createdAt, v: x.score ?? null }));
  return {
    ruleId: "mood-swing",
    title: "Sudden mood drop",
    category: "mind",
    severity: "discuss",
    metric: "Mood",
    interpretation: `Latest mood ${recent.score}/10 vs recent average of ${priorAvg.toFixed(1)}.`,
    why: `A sharp 4+ point drop in a day — worth checking in on what changed (sleep, news, pain, medication side effect).`,
    dataPoints: pts,
  };
}

function ruleSleepShort(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(input.daily, 7);
  const short = recent.filter((d) => typeof d.sleepHours === "number" && d.sleepHours < 5);
  if (short.length < 3) return null;
  const pts = byOldestFirst(recent)
    .filter((d) => typeof d.sleepHours === "number")
    .map((d) => ({ t: d.createdAt, v: d.sleepHours ?? null }));
  return {
    ruleId: "sleep-short",
    title: "Sleep short multiple nights",
    category: "mind",
    severity: "watch",
    metric: "Sleep",
    unit: "h",
    threshold: 5,
    interpretation: `${short.length} nights under 5h in the last week.`,
    why: `Poor sleep multiplies everything — fatigue, pain, mood, immune function. If it keeps happening, worth discussing sleep hygiene or short-term pharmacological support.`,
    dataPoints: pts,
  };
}

function ruleNewPainLocation(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "pain"), 7);
  const older = signalsOfType(input, "pain").filter((s) => !recent.includes(s));
  if (recent.length === 0 || older.length === 0) return null;
  const recentAreas = new Set(
    recent.flatMap((s) => (s.locationScores ?? []).map((l) => l.area)),
  );
  const olderAreas = new Set(
    older.flatMap((s) => (s.locationScores ?? []).map((l) => l.area)),
  );
  const newAreas: string[] = [];
  for (const a of recentAreas) if (!olderAreas.has(a)) newAreas.push(a);
  if (newAreas.length === 0) return null;
  const pts = byOldestFirst(recent).flatMap((s) =>
    (s.locationScores ?? [])
      .filter((l) => newAreas.includes(l.area))
      .map((l) => ({ t: s.createdAt, v: l.score, label: l.area })),
  );
  return {
    ruleId: `pain-new-location-${newAreas.join("|")}`,
    title: "New pain location",
    category: "mind",
    severity: "watch",
    metric: "Pain location",
    interpretation: `New area${newAreas.length === 1 ? "" : "s"}: ${newAreas.join(", ")}.`,
    why: `Pain in a place you haven't logged before — worth flagging in case it's the start of something (shingles, bone pain, muscle injury, new disease site).`,
    dataPoints: pts,
  };
}

// ─── SWEATS ───────────────────────────────────────────────────────────────

function ruleNightSweatsPattern(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(input.daily, 7);
  const sweatNights = recent.filter((d) => {
    const ns = (d as unknown as { nightSweats?: string }).nightSweats;
    return ns === "some" || ns === "drenched";
  });
  if (sweatNights.length < 3) return null;
  const pts = byOldestFirst(recent).map((d) => ({
    t: d.createdAt,
    label: (d as unknown as { nightSweats?: string }).nightSweats ?? "none",
  }));
  return {
    ruleId: "night-sweats-pattern",
    title: "Night sweats recurring",
    category: "sweats",
    severity: "discuss",
    metric: "Night sweats",
    interpretation: `${sweatNights.length} of the last 7 nights marked damp or drenched.`,
    why: `Recurring night sweats are one of the classic B-symptoms for lymphoma and HCL. Trend it and mention it, especially if they're drenching.`,
    dataPoints: pts,
  };
}

function ruleDaySweatsFrequency(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "sweats"), 7);
  if (recent.length < 5) return null;
  const pts = byOldestFirst(recent).map((s) => ({ t: s.createdAt, label: s.choice }));
  return {
    ruleId: "day-sweats-frequency",
    title: "Day sweats logged often",
    category: "sweats",
    severity: "watch",
    metric: "Daytime sweats",
    interpretation: `${recent.length} sweat signals logged in the last 7 days.`,
    why: `Frequent daytime sweats (naps, rest, for no clear reason) can also fall into the B-symptom family — pair with night sweats and weight loss for context.`,
    dataPoints: pts,
  };
}

// ─── INFECTION CLUES ──────────────────────────────────────────────────────

function ruleRecurringInfectionClue(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "infection"), 7);
  const counts = new Map<string, { t: string }[]>();
  for (const s of recent) {
    for (const choice of s.choices ?? []) {
      const arr = counts.get(choice) ?? [];
      arr.push({ t: s.createdAt });
      counts.set(choice, arr);
    }
  }
  for (const [choice, list] of counts) {
    if (list.length < 2) continue;
    return {
      ruleId: `infection-recurring-${choice}`,
      title: `Recurring infection clue: ${choice}`,
      category: "infection",
      severity: "discuss",
      metric: "Infection clue",
      interpretation: `"${choice}" logged ${list.length} times in the last 7 days.`,
      why: `A repeating infection clue can mean something's brewing that the body isn't clearing — worth raising with the team while it's still catchable.`,
      dataPoints: list.map((l) => ({ t: l.t, label: choice })),
    };
  }
  return null;
}

// ─── BLOODS ───────────────────────────────────────────────────────────────

function bloodSeries(
  bloods: readonly BloodResult[], field: keyof BloodResult,
): { t: string; v: number }[] {
  const out: { t: string; v: number }[] = [];
  const sorted = bloods.slice().sort((a, b) => (a.takenAt ?? "").localeCompare(b.takenAt ?? ""));
  for (const b of sorted) {
    const raw = b[field];
    if (typeof raw === "number") {
      out.push({ t: b.takenAt ?? b.createdAt, v: raw });
    }
  }
  return out;
}

function ruleBloodsDecliningOver2(
  input: TrendInput, field: keyof BloodResult, title: string, ruleId: string, metric: string, severity: TrendSeverity, why: string,
): DetectedTrend | null {
  const series = bloodSeries(input.bloods, field);
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (last.v >= prev.v) return null;
  return {
    ruleId,
    title,
    category: "bloods",
    severity,
    metric,
    interpretation: `Down from ${prev.v} to ${last.v} between last two tests.`,
    why,
    dataPoints: series,
  };
}

function ruleNeutrophilsDown(input: TrendInput): DetectedTrend | null {
  return ruleBloodsDecliningOver2(
    input, "neutrophils", "Neutrophils trending down", "bloods-neutrophils-down", "Neutrophils", "discuss",
    "Neutrophils falling increases infection risk. If they keep dropping, the team may want to adjust treatment or add support.",
  );
}

function rulePlateletsDown(input: TrendInput): DetectedTrend | null {
  return ruleBloodsDecliningOver2(
    input, "platelets", "Platelets trending down", "bloods-platelets-down", "Platelets", "discuss",
    "Falling platelets mean higher bleeding risk. Watch for bruises, nosebleeds, gum bleeds; the team will want to know.",
  );
}

function ruleHbDrop(input: TrendInput): DetectedTrend | null {
  const series = bloodSeries(input.bloods, "hb");
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (prev.v - last.v < 10) return null;
  return {
    ruleId: "bloods-hb-drop",
    title: "Haemoglobin dropping",
    category: "bloods",
    severity: "discuss",
    metric: "Hb",
    interpretation: `Dropped ${prev.v - last.v} points between last two tests (${prev.v} → ${last.v}).`,
    why: `A 10+ point drop in haemoglobin is notable — can cause fatigue, breathlessness, and may need iron, B12, or transfusion review.`,
    dataPoints: series,
  };
}

function ruleCrpRising(input: TrendInput): DetectedTrend | null {
  const series = bloodSeries(input.bloods, "crp");
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (last.v < 5 || last.v <= prev.v) return null;
  return {
    ruleId: "bloods-crp-rising",
    title: "CRP rising and elevated",
    category: "bloods",
    severity: "discuss",
    metric: "CRP",
    interpretation: `CRP up from ${prev.v} to ${last.v}.`,
    why: `CRP climbing past 5 suggests inflammation or infection is active. On cladribine, it's a particularly worthwhile trend to raise early.`,
    dataPoints: series,
  };
}

/** Autoimmune cytopenia risk: low Hb + low platelets together. */
function ruleAutoimmuneCytopenia(input: TrendInput): DetectedTrend | null {
  const hb = bloodSeries(input.bloods, "hb");
  const plt = bloodSeries(input.bloods, "platelets");
  if (hb.length === 0 || plt.length === 0) return null;
  const lastHb = hb[hb.length - 1];
  const lastPlt = plt[plt.length - 1];
  if (lastHb.v >= 110 || lastPlt.v >= 150) return null;
  return {
    ruleId: "autoimmune-cytopenia",
    title: "Low Hb + low platelets",
    category: "autoimmune",
    severity: "discuss",
    metric: "Hb + Platelets",
    interpretation: `Latest Hb ${lastHb.v} AND platelets ${lastPlt.v}.`,
    why: `Low Hb with low platelets can indicate marrow suppression from treatment, but also raises autoimmune cytopenia risk (Evans syndrome — can follow cladribine). Worth specifically naming at the next appointment.`,
    dataPoints: [...hb, ...plt],
  };
}

// ─── INTAKE / OUTPUT ──────────────────────────────────────────────────────

function ruleReducedIntake(input: TrendInput): DetectedTrend | null {
  const recent = withinHours(signalsOfType(input, "food"), 48);
  const low = recent.filter((s) => s.choice === "None" || s.choice === "A few bites");
  if (low.length < 3) return null;
  const pts = byOldestFirst(recent).map((s) => ({ t: s.createdAt, label: s.choice }));
  return {
    ruleId: "food-reduced",
    title: "Eating less than usual",
    category: "intake",
    severity: "watch",
    metric: "Food intake",
    interpretation: `${low.length} "none" or "a few bites" entries in 48h.`,
    why: `Persistent low intake risks dehydration and weight loss. If it keeps up, raise with the team; an anti-emetic, nutrition referral, or mouth-care review might help.`,
    dataPoints: pts,
  };
}

function ruleVomitingRecurring(input: TrendInput): DetectedTrend | null {
  const recent = withinHours(signalsOfType(input, "vomit"), 48);
  if (recent.length < 3) return null;
  const pts = byOldestFirst(recent).map((s) => ({ t: s.createdAt, label: s.choice }));
  return {
    ruleId: "vomit-recurring",
    title: "Vomiting recurring",
    category: "intake",
    severity: "discuss",
    metric: "Vomiting",
    interpretation: `${recent.length} episodes in the last 48h.`,
    why: `Repeated vomiting risks dehydration, electrolyte issues, and missed medications. Worth flagging to the team regardless of severity.`,
    dataPoints: pts,
  };
}

// ─── BOWEL / URINE ────────────────────────────────────────────────────────

function ruleDarkUrine(input: TrendInput): DetectedTrend | null {
  const recent = withinHours(signalsOfType(input, "urine"), 24);
  const dark = recent.filter((s) => s.choice === "Dark" || s.choice === "Very dark");
  if (dark.length < 2) return null;
  const pts = byOldestFirst(recent).map((s) => ({ t: s.createdAt, label: s.choice }));
  return {
    ruleId: "urine-dark",
    title: "Urine consistently dark",
    category: "bowel",
    severity: "watch",
    metric: "Urine colour",
    interpretation: `${dark.length} dark readings in the last 24h.`,
    why: `Dark urine across multiple readings usually means dehydration but can also mean urinary infection or kidney stress. First try increasing fluids; if it persists, call the team.`,
    dataPoints: pts,
  };
}

function ruleDiarrhoeaStreak(input: TrendInput): DetectedTrend | null {
  const recent = withinHours(signalsOfType(input, "bowel"), 24);
  const d = recent.filter((s) => s.choice === "Diarrhoea" || s.choice === "Severe / uncontrolled diarrhoea");
  if (d.length < 3) return null;
  const pts = byOldestFirst(recent).map((s) => ({ t: s.createdAt, label: s.choice }));
  return {
    ruleId: "bowel-diarrhoea-streak",
    title: "Diarrhoea recurring",
    category: "bowel",
    severity: "discuss",
    metric: "Bowel",
    interpretation: `${d.length} diarrhoea entries in the last 24h.`,
    why: `Persistent diarrhoea on cladribine is an escalation symptom. Risk of dehydration, electrolyte loss, and worsening neutropenic colitis if it continues.`,
    dataPoints: pts,
  };
}

// ─── FLAG FREQUENCY ───────────────────────────────────────────────────────

function ruleFlagsIncreasing(input: TrendInput): DetectedTrend | null {
  const thisWeek = withinDays(input.flags, 7).length;
  const allFlags = input.flags.filter((f) => {
    const d = differenceInDays(new Date(), parseISO(f.createdAt));
    return d > 7 && d <= 14;
  }).length;
  if (thisWeek <= allFlags || thisWeek < 3) return null;
  return {
    ruleId: "flags-trending-up",
    title: "More red flags this week than last",
    category: "flags",
    severity: "watch",
    metric: "Flag count",
    interpretation: `${thisWeek} flags this week vs ${allFlags} the week before.`,
    why: `An uptick in overall tripwires (any cause) often precedes a clinical shift. Worth comparing side-by-side at the next review.`,
    dataPoints: [
      { t: subDays(new Date(), 7).toISOString(), v: allFlags, label: "previous week" },
      { t: new Date().toISOString(), v: thisWeek, label: "this week" },
    ],
  };
}

// ─── AUTOIMMUNE PATTERN RULES ─────────────────────────────────────────────

/** Joint pain + skin rash within the same 21-day window — lupus / RA-adjacent. */
function ruleAutoimmuneJointPlusRash(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "pain"), 21);
  const jointPain = recent.find((s) =>
    (s.locationScores ?? []).some((l) => l.area.toLowerCase().includes("joint") || l.area.toLowerCase().includes("knee") || l.area.toLowerCase().includes("hip") || l.area.toLowerCase().includes("hand")),
  );
  if (!jointPain) return null;
  const others = withinDays(signalsOfType(input, "other"), 21);
  const rashOther = others.find((s) => {
    const hay = [(s.customLabel ?? ""), ...(s.choices ?? [])].join(" ").toLowerCase();
    return hay.includes("rash") || hay.includes("hives") || hay.includes("patch");
  });
  if (!rashOther) return null;
  return {
    ruleId: "autoimmune-joint-plus-rash",
    title: "Joint pain + skin symptom together",
    category: "autoimmune",
    severity: "discuss",
    metric: "Autoimmune pattern",
    interpretation: `Joint pain and a rash/skin-patch report logged in the last 3 weeks.`,
    why: `Cladribine can unmask secondary autoimmune conditions. Joint pain paired with a skin rash is a classic lupus / rheumatoid pattern — worth specifically naming to the haematologist or GP.`,
    dataPoints: [
      { t: jointPain.createdAt, label: "joint pain" },
      { t: rashOther.createdAt, label: rashOther.customLabel ?? "skin symptom" },
    ],
  };
}

/** Recurring bruising without injury — autoimmune thrombocytopenia pattern. */
function ruleAutoimmuneRecurringBruising(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "bleeding"), 14);
  const bruising = recent.filter((s) => (s.choices ?? []).some((c) => c.toLowerCase().includes("bruise") || c.toLowerCase().includes("petechiae")));
  if (bruising.length < 3) return null;
  const pts = byOldestFirst(bruising).map((s) => ({ t: s.createdAt, label: (s.choices ?? []).join(", ") }));
  return {
    ruleId: "autoimmune-recurring-bruising",
    title: "Recurring bruising / petechiae",
    category: "autoimmune",
    severity: "discuss",
    metric: "Bleeding pattern",
    interpretation: `${bruising.length} bruising or petechiae entries in the last 14 days.`,
    why: `Bruising that keeps appearing without injury can indicate platelet issues — including autoimmune thrombocytopenia (ITP), which can follow cladribine. Worth a blood test and conversation.`,
    dataPoints: pts,
  };
}

/** Recurring joint pain — rheumatoid-adjacent autoimmunity. */
function ruleAutoimmuneRecurringJointPain(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "pain"), 21);
  const jointEntries = recent.filter((s) =>
    (s.locationScores ?? []).some((l) => {
      const a = l.area.toLowerCase();
      return a.includes("joint") || a === "knees" || a === "hips" || a === "hands / wrists" || a === "feet / ankles" || a === "shoulders";
    }),
  );
  if (jointEntries.length < 4) return null;
  const pts = byOldestFirst(jointEntries).flatMap((s) =>
    (s.locationScores ?? [])
      .filter((l) => ["joint", "knee", "hip", "hand", "foot", "shoulder"].some((k) => l.area.toLowerCase().includes(k)))
      .map((l) => ({ t: s.createdAt, v: l.score, label: l.area })),
  );
  return {
    ruleId: "autoimmune-recurring-joint-pain",
    title: "Recurring joint pain",
    category: "autoimmune",
    severity: "discuss",
    metric: "Joint pain",
    interpretation: `${jointEntries.length} joint-pain entries across the last 3 weeks.`,
    why: `Persistent joint pain during or after cladribine is on the differential for secondary autoimmunity (RA-like, reactive arthritis). Good to raise even if you think it's just post-treatment aching.`,
    dataPoints: pts,
  };
}

/** Recurring rash-type side effects — skin autoimmunity signal. */
function ruleAutoimmuneRecurringRash(input: TrendInput): DetectedTrend | null {
  const recent = withinDays(signalsOfType(input, "other"), 21);
  const matches = recent.filter((s) => {
    const hay = [(s.customLabel ?? ""), ...(s.choices ?? [])].join(" ").toLowerCase();
    return hay.includes("rash") || hay.includes("eczema") || hay.includes("psoriasis") || hay.includes("patch");
  });
  if (matches.length < 3) return null;
  const pts = byOldestFirst(matches).map((s) => ({ t: s.createdAt, label: s.customLabel ?? "skin symptom" }));
  return {
    ruleId: "autoimmune-recurring-rash",
    title: "Recurring skin rash / patch symptoms",
    category: "autoimmune",
    severity: "watch",
    metric: "Skin",
    interpretation: `${matches.length} rash or skin-patch entries in the last 3 weeks.`,
    why: `Persistent rashes can be side effects, but repeated flares raise the possibility of autoimmune skin conditions (psoriasis, lupus, eczema exacerbation). Worth asking the dermatologist or GP if they persist.`,
    dataPoints: pts,
  };
}

// ─── COMPARISON TABLES ────────────────────────────────────────────────────
// Always-on panels: not threshold-gated, just the most recent state vs the
// yardstick (personal baseline for vitals, previous test for bloods). These
// render on /trends and in the export, which is why the functions accept an
// optional `daysBack` — export passes 14 or undefined to match its toggle.

export type VitalRow = {
  metric: string;
  unit: string;
  baseline?: number;
  baselineLabel?: string;          // e.g. "95–99%" for SpO₂ where the yardstick is a range
  latest?: { value: number; at: string };
  recentAvg?: number;              // average of readings within window
  delta?: number;                  // latest − baseline (if baseline is numeric)
  direction?: "up" | "down" | "same";
  readings: number;                // how many readings in window
};

export type BloodRow = {
  metric: string;
  unit: string;
  refRange?: string;               // adult-female reference range as a hint
  latest?: { value: number; at: string };
  previous?: { value: number; at: string };
  delta?: number;
  direction?: "up" | "down" | "same";
  readings: number;
};

function windowSignals(signals: readonly Signal[], type: string, daysBack?: number): Signal[] {
  const list = signals.filter((s) => s.signalType === type && typeof s.value === "number");
  if (daysBack == null) return list;
  const cutoff = subDays(new Date(), daysBack).toISOString();
  return list.filter((s) => s.createdAt >= cutoff);
}

function windowDaily(daily: readonly DailyLog[], daysBack?: number): DailyLog[] {
  if (daysBack == null) return daily.slice();
  const cutoff = subDays(new Date(), daysBack).toISOString();
  return daily.filter((d) => d.createdAt >= cutoff);
}

function directionOf(latest: number, baseline: number): "up" | "down" | "same" {
  if (latest > baseline) return "up";
  if (latest < baseline) return "down";
  return "same";
}

/** Vitals comparison: Temperature, Heart rate, Weight, SpO₂.
 *  Includes any row with at least one reading in the window — a missing
 *  baseline just leaves the baseline column blank so the latest still
 *  displays. `daysBack` undefined = all-time. */
export function getBaselineComparison(
  input: TrendInput,
  daysBack?: number,
): VitalRow[] {
  const rows: VitalRow[] = [];

  // Temperature
  const temps = windowSignals(input.signals, "temp", daysBack)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (temps.length > 0) {
    const last = temps[temps.length - 1];
    const lastValue = last.value as number;
    const avg = temps.reduce((s, t) => s + (t.value as number), 0) / temps.length;
    const row: VitalRow = {
      metric: "Temperature",
      unit: "°C",
      baseline: input.baselineTemp,
      latest: { value: lastValue, at: last.createdAt },
      recentAvg: Number(avg.toFixed(1)),
      readings: temps.length,
    };
    if (typeof input.baselineTemp === "number") {
      row.delta = Number((lastValue - input.baselineTemp).toFixed(1));
      row.direction = directionOf(lastValue, input.baselineTemp);
    }
    rows.push(row);
  }

  // Heart rate
  const pulses = windowSignals(input.signals, "pulse", daysBack)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (pulses.length > 0) {
    const last = pulses[pulses.length - 1];
    const lastValue = last.value as number;
    const avg = pulses.reduce((s, p) => s + (p.value as number), 0) / pulses.length;
    const row: VitalRow = {
      metric: "Heart rate",
      unit: "bpm",
      baseline: input.baselineHR,
      latest: { value: lastValue, at: last.createdAt },
      recentAvg: Math.round(avg),
      readings: pulses.length,
    };
    if (typeof input.baselineHR === "number") {
      row.delta = Math.round(lastValue - input.baselineHR);
      row.direction = directionOf(lastValue, input.baselineHR);
    }
    rows.push(row);
  }

  // Weight (from daily log)
  const dailyW = windowDaily(input.daily, daysBack)
    .filter((d) => typeof d.weightKg === "number")
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (dailyW.length > 0) {
    const last = dailyW[dailyW.length - 1];
    const lastValue = last.weightKg as number;
    const avg = dailyW.reduce((s, d) => s + (d.weightKg as number), 0) / dailyW.length;
    const row: VitalRow = {
      metric: "Weight",
      unit: "kg",
      baseline: input.baselineWeight,
      latest: { value: lastValue, at: last.createdAt },
      recentAvg: Number(avg.toFixed(1)),
      readings: dailyW.length,
    };
    if (typeof input.baselineWeight === "number") {
      row.delta = Number((lastValue - input.baselineWeight).toFixed(1));
      row.direction = directionOf(lastValue, input.baselineWeight);
    }
    rows.push(row);
  }

  // SpO₂ — no personal baseline; compare to typical range (95–99%)
  const spo2s = windowSignals(input.signals, "spo2", daysBack)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (spo2s.length > 0) {
    const last = spo2s[spo2s.length - 1];
    const lastValue = last.value as number;
    const avg = spo2s.reduce((s, p) => s + (p.value as number), 0) / spo2s.length;
    rows.push({
      metric: "SpO₂",
      unit: "%",
      baselineLabel: "95–99%",
      latest: { value: lastValue, at: last.createdAt },
      recentAvg: Math.round(avg),
      readings: spo2s.length,
    });
  }

  return rows;
}

type BloodField = "hb" | "wcc" | "neutrophils" | "lymphocytes" | "monocytes" | "platelets" | "creatinine" | "crp";

const BLOOD_METRICS: { field: BloodField; metric: string; unit: string; refRange?: string }[] = [
  { field: "hb",          metric: "Haemoglobin",   unit: "g/L",    refRange: "120–160" },
  { field: "wcc",         metric: "White cells",   unit: "×10⁹/L", refRange: "4.0–11.0" },
  { field: "neutrophils", metric: "Neutrophils",   unit: "×10⁹/L", refRange: "2.0–7.5" },
  { field: "lymphocytes", metric: "Lymphocytes",   unit: "×10⁹/L", refRange: "1.0–4.0" },
  { field: "monocytes",   metric: "Monocytes",     unit: "×10⁹/L", refRange: "0.2–1.0" },
  { field: "platelets",   metric: "Platelets",     unit: "×10⁹/L", refRange: "150–400" },
  { field: "creatinine",  metric: "Creatinine",    unit: "µmol/L", refRange: "45–90" },
  { field: "crp",         metric: "CRP",           unit: "mg/L",   refRange: "< 5" },
];

/** Bloods comparison: latest vs previous within the window, per metric.
 *  Only emits rows for metrics that have at least one result in the window. */
export function getBloodsComparison(
  bloods: readonly BloodResult[],
  daysBack?: number,
): BloodRow[] {
  const cutoff = daysBack == null ? null : subDays(new Date(), daysBack).toISOString();
  const windowed = cutoff ? bloods.filter((b) => (b.takenAt ?? b.createdAt) >= cutoff) : bloods.slice();
  const rows: BloodRow[] = [];
  for (const { field, metric, unit, refRange } of BLOOD_METRICS) {
    const series = windowed
      .filter((b) => typeof b[field] === "number")
      .slice()
      .sort((a, b) => (a.takenAt ?? a.createdAt).localeCompare(b.takenAt ?? b.createdAt));
    if (series.length === 0) continue;
    const last = series[series.length - 1];
    const prev = series.length > 1 ? series[series.length - 2] : undefined;
    const lastValue = last[field] as number;
    const row: BloodRow = {
      metric, unit, refRange,
      latest: { value: lastValue, at: last.takenAt ?? last.createdAt },
      readings: series.length,
    };
    if (prev) {
      const prevValue = prev[field] as number;
      row.previous = { value: prevValue, at: prev.takenAt ?? prev.createdAt };
      row.delta = Number((lastValue - prevValue).toFixed(2));
      row.direction = directionOf(lastValue, prevValue);
    }
    rows.push(row);
  }
  return rows;
}
