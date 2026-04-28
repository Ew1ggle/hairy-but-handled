"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle, Slider0to10, TextArea, TextInput } from "@/components/ui";
import { useEntries, type FlagEvent, type Signal } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, ChevronRight, Droplet, Smartphone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BODY_AREAS,
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  SIGNALS,
  SIGNAL_BY_ID,
  type Category,
  type SignalDef,
  evaluateRedFlag,
  formatReading,
  sideEffectSuggestsLocation,
} from "@/lib/signals";
import { PHASE_LABEL, SIDE_EFFECTS, searchSideEffects, type SideEffect } from "@/lib/sideEffects";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";

export default function SignalSweepPage() {
  const { addEntry, updateEntry, deleteEntry } = useSession();
  const signals = useEntries("signal");
  const dailyLogs = useEntries("daily");
  const infusions = useEntries("infusion");
  const [openSignal, setOpenSignal] = useState<SignalDef | null>(null);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);
  const [showPinSheet, setShowPinSheet] = useState(false);

  // Auto-open the pin sheet when the page is loaded with ?pin=1 — this is
  // the URL we hand off to Safari, so the Safari side picks up where the
  // PWA side left off.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pin") === "1") setShowPinSheet(true);
  }, []);
  /** Seed for the Other sheet when opened via the top "What are you tracking"
   *  search — pre-fills customLabel + a matched side-effect chip. */
  const [seedOther, setSeedOther] = useState<{ label: string; effect?: SideEffect } | null>(null);
  const [trackQuery, setTrackQuery] = useState<string>("");
  const trackMatches = searchSideEffects(trackQuery, { limit: 6, minLength: 2 });

  const todaysDaily = useMemo(
    () => dailyLogs.find((d) => isToday(parseISO(d.createdAt))),
    [dailyLogs],
  );
  const todaysInfusion = useMemo(
    () => infusions.find((i) => isToday(parseISO(i.createdAt))),
    [infusions],
  );
  const nextInfusion = useMemo(
    () => infusions.filter((i) => !i.completed).sort((a, b) => a.cycleDay - b.cycleDay)[0],
    [infusions],
  );

  const todaysSignals = useMemo(
    () =>
      signals
        .filter((s) => isToday(parseISO(s.createdAt)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [signals],
  );

  /** Set of signalTypes logged today — drives the small tick on each chip
   *  so a glance at the row shows what's already been captured. */
  const loggedSignalTypesToday = useMemo(
    () => new Set(todaysSignals.map((s) => s.signalType)),
    [todaysSignals],
  );

  /** Try to route a side-effect picked from the top search to one of the
   *  named symptom buttons. Returns the matched SignalDef, or null to fall
   *  through to the generic Other sheet. */
  const routeToSignal = (text: string): SignalDef | null => {
    const hay = text.toLowerCase();
    const tests: { id: string; words: string[] }[] = [
      { id: "headache", words: ["headache"] },
      { id: "soreThroat", words: ["sore throat", "pharyngitis"] },
      { id: "runnyNose", words: ["runny nose", "rhinorrhea", "rhinitis"] },
      { id: "drowsiness", words: ["drowsiness", "drowsy", "somnolence"] },
    ];
    for (const t of tests) {
      if (t.words.some((w) => hay.includes(w))) return SIGNAL_BY_ID[t.id] ?? null;
    }
    return null;
  };

  const trackPickEffect = (effect: SideEffect) => {
    const haystack = `${effect.title} ${effect.keywords.join(" ")}`;
    const routed = routeToSignal(haystack);
    setSeedOther({ label: routed ? (routed.input.kind === "other" ? routed.input.defaultLabel ?? trackQuery : trackQuery) : trackQuery, effect });
    setOpenSignal(routed ?? SIGNAL_BY_ID["other"]);
    setTrackQuery("");
  };

  const trackPickFreeform = () => {
    if (!trackQuery.trim()) return;
    const routed = routeToSignal(trackQuery);
    setSeedOther({ label: routed ? (routed.input.kind === "other" ? routed.input.defaultLabel ?? trackQuery : trackQuery) : trackQuery });
    setOpenSignal(routed ?? SIGNAL_BY_ID["other"]);
    setTrackQuery("");
  };

  const categories: Category[] = ["body", "fluids", "mind", "other"];

  const handleSave = async (def: SignalDef, reading: Partial<Signal>) => {
    const flagMsg = evaluateRedFlag(def, reading);
    if (editingSignal) {
      await updateEntry(editingSignal.id, { ...reading, autoFlag: !!flagMsg } as Partial<Signal>);
      setEditingSignal(null);
      setSeedOther(null);
      return;
    }
    const signal: Omit<Signal, "id" | "createdAt"> = {
      kind: "signal",
      signalType: def.id,
      ...reading,
      autoFlag: !!flagMsg,
    };
    await addEntry(signal as Omit<Signal, "id" | "createdAt">);
    // When a reading crosses a red-flag threshold, also create a flag entry
    // so Tripwires / agenda pick it up without any extra tap from the user.
    if (flagMsg) {
      await addEntry({
        kind: "flag",
        triggerLabel: `${def.label}: ${flagMsg}`,
      } as Omit<FlagEvent, "id" | "createdAt">);
    }
    setOpenSignal(null);
    setSeedOther(null);
  };

  return (
    <AppShell>
      <PageTitle sub="Spot the shift">Signal Sweep</PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-3">
        Log a Signal — tap any button below to capture a reading. Each one is
        timestamped automatically.
      </p>

      <button
        type="button"
        onClick={() => setShowPinSheet(true)}
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-[var(--primary)] font-medium underline-offset-2 hover:underline"
      >
        <Smartphone size={13} /> Pin Signal Sweep to your home screen
      </button>

      <MedicalDisclaimerBanner />

      {/* Top "What are you tracking" — accepts a free-text symptom and
          surfaces matching side effects. The dropdown always ends with a
          "Track as Other" item so unmatched text or "I don't see what I'm
          looking for" still has a clear path forward. Pressing Enter is
          equivalent to tapping that fallback. */}
      <Card className="mb-3">
        <div className="text-xs text-[var(--ink-soft)] mb-1.5">
          What are you tracking?
        </div>
        <TextInput
          value={trackQuery}
          onChange={(e) => setTrackQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trackQuery.trim().length >= 2) {
              e.preventDefault();
              trackPickFreeform();
            }
          }}
          placeholder="Type a symptom — e.g. headache, sore throat, rash"
        />
        {trackQuery.trim().length >= 2 && (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-1.5 space-y-0.5">
            {trackMatches.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold px-2 pt-1 pb-0.5">
                  Matches in side-effect library — tap to attach
                </div>
                {trackMatches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => trackPickEffect(s)}
                    className="w-full text-left rounded-lg px-3 py-2 text-sm bg-[var(--surface)] active:bg-[var(--primary)] active:text-white transition"
                  >
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-[var(--ink-soft)]">
                      {PHASE_LABEL[s.phase]}
                      {s.urgentAction === "ed" ? " · Urgent" : ""}
                    </div>
                  </button>
                ))}
                <div className="border-t border-[var(--border)] my-1" />
              </>
            )}
            <button
              type="button"
              onClick={trackPickFreeform}
              className="w-full text-left rounded-lg px-3 py-2 text-sm bg-[var(--surface)] active:bg-[var(--primary)] active:text-white transition"
            >
              <div className="font-medium">+ Track &ldquo;{trackQuery}&rdquo; as Other</div>
              <div className="text-xs text-[var(--ink-soft)]">
                {trackMatches.length > 0
                  ? "Skip the matches and log it as a free-text Other"
                  : "No library match — opens the Other sheet with your text pre-filled"}
              </div>
            </button>
          </div>
        )}
      </Card>

      {/* Sticky chip row of signal buttons, grouped by category */}
      <div className="sticky top-9 z-30 -mx-4 px-4 py-2 mb-4 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-sm">
        <div className="space-y-2">
          {categories.map((cat) => {
            const defs = SIGNALS.filter((s) => s.category === cat);
            const style = CATEGORY_STYLE[cat];
            return (
              <div key={cat}>
                <div
                  className="text-[10px] uppercase tracking-widest font-bold mb-1"
                  style={{ color: style.bg }}
                >
                  {CATEGORY_LABEL[cat]}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {defs.map((def) => {
                    // Only the bare "+ Other" entry uses the dashed
                    // free-text style — the named symptom buttons share
                    // the Other sheet but should look like normal chips.
                    const isFreeOther = def.id === "other";
                    const loggedToday = loggedSignalTypesToday.has(def.id);
                    return (
                      <button
                        key={def.id}
                        type="button"
                        onClick={() => setOpenSignal(def)}
                        className={`relative rounded-full px-3 py-1.5 text-sm font-medium active:scale-95 transition ${isFreeOther ? "border-2 border-dashed" : "border"}`}
                        style={{
                          backgroundColor: isFreeOther ? "transparent" : style.bg,
                          color: isFreeOther ? style.bg : style.ink,
                          borderColor: style.border,
                        }}
                      >
                        {isFreeOther ? "+ Other" : def.label}
                        {loggedToday && (
                          <span
                            aria-label="Logged today"
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's readings */}
      <Card className="mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">Today's signals</h2>
          <span className="text-xs text-[var(--ink-soft)]">
            {todaysSignals.length} logged
          </span>
        </div>
        {todaysSignals.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            Nothing logged yet today. Tap a button above to add your first signal.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {todaysSignals.map((s) => {
              const def = SIGNAL_BY_ID[s.signalType];
              if (!def) return null;
              return (
                <li
                  key={s.id}
                  className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <button
                    type="button"
                    onClick={() => setEditingSignal(s)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left active:opacity-70 transition"
                  >
                    <div className="shrink-0 w-14 text-xs tabular-nums text-[var(--ink-soft)] pt-0.5">
                      {format(parseISO(s.createdAt), "HH:mm")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{def.label}</span>
                        <span className="text-sm text-[var(--ink-soft)]">
                          {formatReading(def, s)}
                        </span>
                        {s.autoFlag && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 text-[11px] font-semibold">
                            <AlertTriangle size={11} /> flag
                          </span>
                        )}
                      </div>
                      {s.notes && (
                        <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                          {s.notes}
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEntry(s.id)}
                    className="text-[var(--ink-soft)] shrink-0 p-1"
                    aria-label="Delete reading"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Cross-link: summarise what's on Daily Trace + today's infusion.
          If Daily Trace hasn't been manually completed today, show the card
          in amber so it's clearly still outstanding. */}
      {(() => {
        const manuallyLogged = todaysDaily && (todaysDaily as { manuallyLogged?: boolean }).manuallyLogged === true;
        const amber = !manuallyLogged;
        return (
          <Link
            href="/log"
            className="flex items-center justify-between rounded-2xl px-4 py-3 mb-3 active:scale-[0.99] transition"
            style={amber
              ? { backgroundColor: "#fef9e7", border: "2px solid #d4a017" }
              : undefined
            }
          >
            <div className="min-w-0">
              <div
                className="font-semibold text-sm"
                style={amber ? { color: "#8a6d0f" } : undefined}
              >
                Daily Trace {amber ? "— not completed today" : "saved"}
              </div>
              <div
                className="text-xs truncate"
                style={amber ? { color: "#8a6d0f" } : { color: "var(--ink-soft)" }}
              >
                {manuallyLogged ? (
                  <>
                    {todaysDaily!.weightKg != null && `weight ${todaysDaily!.weightKg} kg`}
                    {(todaysDaily as { dayColour?: string } | undefined)?.dayColour && ` · day: ${(todaysDaily as { dayColour?: string }).dayColour}`}
                    {(todaysDaily as { nightSweats?: string } | undefined)?.nightSweats && ` · night sweats: ${(todaysDaily as { nightSweats?: string }).nightSweats}`}
                    {!todaysDaily!.weightKg && !(todaysDaily as { dayColour?: string } | undefined)?.dayColour && !(todaysDaily as { nightSweats?: string } | undefined)?.nightSweats && "Tap to review"}
                  </>
                ) : (
                  "Weight, night sweats, questions, test results — tap to fill in"
                )}
              </div>
            </div>
            <ChevronRight
              size={18}
              className="shrink-0"
              style={amber ? { color: "#b8860b" } : { color: "var(--ink-soft)" }}
            />
          </Link>
        );
      })()}


      {todaysInfusion && (
        <Link
          href={`/treatment/${todaysInfusion.cycleDay}`}
          className="flex items-center justify-between rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-3 mb-3 active:scale-[0.99] transition"
        >
          <div className="min-w-0">
            <div className="font-medium text-sm">Infusion today — Day {todaysInfusion.cycleDay}</div>
            <div className="text-xs text-[var(--ink-soft)] truncate">
              {todaysInfusion.drugs || "Open the infusion log"}
              {todaysInfusion.completed ? " · completed" : ""}
              {todaysInfusion.reaction ? " · reaction recorded" : ""}
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--ink-soft)] shrink-0" />
        </Link>
      )}

      {/* Treatment calendar — always reachable from Signal Sweep so the
           infusion log isn't buried, regardless of whether today is a cycle day. */}
      <Link
        href="/treatment"
        className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 mb-6 active:scale-[0.99] transition"
      >
        <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0 mr-3">
          <Droplet size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">Treatment calendar</div>
          <div className="text-xs text-[var(--ink-soft)] truncate">
            {nextInfusion
              ? `Next: Day ${nextInfusion.cycleDay} · ${nextInfusion.drugs}`
              : "Full cycle view + log infusions"}
          </div>
        </div>
        <ChevronRight size={18} className="text-[var(--ink-soft)] shrink-0" />
      </Link>

      {(() => {
        const def = editingSignal ? SIGNAL_BY_ID[editingSignal.signalType] : openSignal;
        if (!def) return null;
        return (
          <SignalSheet
            def={def}
            initial={editingSignal}
            initialLabel={!editingSignal && seedOther ? seedOther.label : undefined}
            initialEffects={!editingSignal && seedOther?.effect ? [seedOther.effect] : undefined}
            onClose={() => { setOpenSignal(null); setEditingSignal(null); setSeedOther(null); }}
            onSave={(reading) => handleSave(def, reading)}
          />
        );
      })()}

      {showPinSheet && <PinToHomeSheet onClose={() => setShowPinSheet(false)} />}
    </AppShell>
  );
}

/** Bottom-sheet that walks the user through pinning a deep link to
 *  Signal Sweep on their phone home screen. iOS doesn't permit web pages
 *  to install icons programmatically, so the flow is split in two halves:
 *
 *  - Inside the standalone PWA: a one-tap button that hands off to Safari
 *    via `target="_blank"` on a link to `/signal-sweep?pin=1`. The query
 *    param re-opens this sheet on the Safari side automatically.
 *  - Inside Safari: only the steps that matter from there (Share → Add to
 *    Home Screen → Add) plus a copy-link fallback. */
function PinToHomeSheet({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  // Detect standalone PWA mode on mount. We track it as state so the UI
  // can re-render once we've checked window/navigator (which aren't
  // available during SSR).
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standaloneMedia = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    // navigator.standalone is the iOS-Safari-specific flag for
    // "homescreen-installed" mode.
    const iosStandalone = !!(window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIsStandalone(standaloneMedia || iosStandalone);
  }, []);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/signal-sweep?pin=1`
    : "https://hairybuthandled.com/signal-sweep?pin=1";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — silent */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="display text-xl text-[var(--ink)]">Pin Signal Sweep</h2>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              {isStandalone
                ? "We'll hand you off to Safari — finish there in 3 taps."
                : "You're in Safari — 3 taps from here."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--ink-soft)] -mt-1 -mr-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {isStandalone ? (
          <>
            <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-xs text-[var(--ink-soft)] mb-4 leading-relaxed">
              iOS only allows new home-screen icons from <b>Safari</b> itself —
              not from inside an installed app like this one. Three short steps:
            </div>

            <button
              type="button"
              onClick={copy}
              className="w-full rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5 mb-4"
            >
              {copied ? "✓ Link copied — now open Safari" : "1. Copy the link"}
            </button>

            <ol className="space-y-2.5 text-sm mb-4">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-semibold">2</span>
                <span>
                  Close this app and tap your <b>Safari</b> icon on the home screen
                  (the blue compass).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-semibold">3</span>
                <span>
                  Tap Safari&apos;s address bar, then <b>Paste and Go</b>. The
                  page will open with the rest of the instructions ready.
                </span>
              </li>
            </ol>

            <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-[11px] text-[var(--ink-soft)] leading-relaxed">
              On the Safari side, this same panel will pop back up — it&apos;ll
              walk you through Share → Add to Home Screen.
            </div>
          </>
        ) : (
          <>
            <ol className="space-y-2.5 text-sm mb-4">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-semibold">1</span>
                <span>Tap the <b>Share</b> icon at the bottom of Safari — the square with an up arrow.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-semibold">2</span>
                <span>Scroll down and tap <b>Add to Home Screen</b>.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-semibold">3</span>
                <span>Tap <b>Add</b> in the top-right. The new icon will open straight into Signal Sweep.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-[var(--primary)] text-white font-semibold py-3"
            >
              Got it
            </button>
          </>
        )}

        <p className="text-[11px] text-[var(--ink-soft)] mt-3 text-center">
          You&apos;ll end up with two HBH icons — one for the app overall, one straight to Signal Sweep.
        </p>
      </div>
    </div>
  );
}

/** Severity descriptors used by the Other sheet. Optional — leaving it
 *  unset keeps the existing "+ Other" free-text behaviour. The named
 *  symptom buttons (Headache, etc.) seed defaultLabel so a severity feels
 *  like the natural next tap. */
const SEVERITY_LIKERT = ["None", "Mild", "Moderate", "Severe", "Worst"];

function SignalSheet({
  def,
  initial,
  initialLabel,
  initialEffects,
  onClose,
  onSave,
}: {
  def: SignalDef;
  initial?: Signal | null;
  /** Pre-fill customLabel when opening fresh (top-search seeding). */
  initialLabel?: string;
  /** Pre-fill selectedEffects when opening fresh (top-search seeding). */
  initialEffects?: SideEffect[];
  onClose: () => void;
  onSave: (reading: Partial<Signal>) => void;
}) {
  // Pre-fill from `initial` when editing an existing entry. The notes blob is
  // a single combined string at storage; for edit-mode we just drop it back
  // into the free-notes field — close-enough round-trip without parsing.
  const initialNotes = (() => {
    if (!initial) return "";
    return initial.notes ?? "";
  })();
  const editEffectsFromInitial: SideEffect[] = (() => {
    if (!initial?.choices || def.input.kind !== "other") return [];
    return initial.choices
      .map((title) => SIDE_EFFECTS.find((s) => s.title === title))
      .filter((s): s is SideEffect => !!s);
  })();
  const otherDefaultLabel = def.input.kind === "other" ? def.input.defaultLabel ?? "" : "";
  const [value, setValue] = useState<string>(initial?.value != null ? String(initial.value) : "");
  const [choice, setChoice] = useState<string>(initial?.choice ?? "");
  const [choices, setChoices] = useState<string[]>(
    def.input.kind === "multipick" ? (initial?.choices ?? []) : [],
  );
  const [score, setScore] = useState<number | null>(initial?.score ?? null);
  const [customLabel, setCustomLabel] = useState<string>(
    initial?.customLabel ?? initialLabel ?? otherDefaultLabel,
  );
  const [notes, setNotes] = useState<string>(initialNotes);
  const [followUps, setFollowUps] = useState<string[]>(initial?.followUps ?? []);
  const [contextText, setContextText] = useState<string>("");
  const [locationScores, setLocationScores] = useState<{ area: string; score: number }[]>(initial?.locationScores ?? []);
  const [optionLocations, setOptionLocations] = useState<Record<string, string[]>>(initial?.optionLocations ?? {});
  const [selectedEffects, setSelectedEffects] = useState<SideEffect[]>(
    editEffectsFromInitial.length ? editEffectsFromInitial : (initialEffects ?? []),
  );
  const [otherLocations, setOtherLocations] = useState<string[]>([]);
  const [sleepState, setSleepState] = useState<"slept-in" | "awake" | null>(initial?.sleepState ?? null);
  const [wokeBy, setWokeBy] = useState<"auto" | "woken" | null>(initial?.wokeBy ?? null);
  const [timeFrom, setTimeFrom] = useState<string>(initial?.timeFrom ?? "");
  const [timeTo, setTimeTo] = useState<string>(initial?.timeTo ?? "");

  // Body-location picker only appears when at least one selected side effect
  // is location-variable (e.g. thrush) — but not when the side effect's title
  // already names a body part (e.g. "Mouth ulcers"). Declared here so the
  // notes-builder below can reference it.
  const showOtherLocations = selectedEffects.some(sideEffectSuggestsLocation);

  // Merge the contextText, body-location selections, and free-notes into a
  // single notes blob for storage.
  const combinedNotes = (() => {
    const parts: string[] = [];
    if (def.contextText && contextText.trim()) {
      parts.push(`${def.contextText.label}: ${contextText.trim()}`);
    }
    if (def.input.kind === "other" && showOtherLocations && otherLocations.length) {
      parts.push(`Location: ${otherLocations.join(", ")}`);
    }
    if (notes.trim()) parts.push(notes.trim());
    return parts.join("\n\n") || undefined;
  })();

  const reading: Partial<Signal> = (() => {
    const base = {
      notes: combinedNotes,
      followUps: followUps.length ? followUps : undefined,
    };
    if (def.input.kind === "number")
      return { ...base, value: value ? Number(value) : null, unit: def.input.unit };
    if (def.input.kind === "pick") return { ...base, choice: choice || undefined };
    if (def.input.kind === "multipick") {
      // Only persist option-locations for options that are actually ticked.
      const filtered: Record<string, string[]> = {};
      for (const opt of choices) {
        const locs = optionLocations[opt];
        if (locs && locs.length) filtered[opt] = locs;
      }
      return {
        ...base,
        choices,
        optionLocations: Object.keys(filtered).length ? filtered : undefined,
      };
    }
    if (def.input.kind === "slider") return { ...base, score };
    if (def.input.kind === "other") {
      return {
        ...base,
        customLabel: customLabel || undefined,
        choice: choice || undefined,
        choices: selectedEffects.length ? selectedEffects.map((s) => s.title) : undefined,
      };
    }
    if (def.input.kind === "locatedRating") return { ...base, locationScores };
    if (def.input.kind === "sleep") {
      return {
        ...base,
        sleepState: sleepState ?? undefined,
        wokeBy: wokeBy ?? undefined,
        timeFrom: timeFrom || undefined,
        timeTo: sleepState === "awake" ? (timeTo || undefined) : undefined,
      };
    }
    return base;
  })();

  const flagMsg = evaluateRedFlag(def, reading);

  const canSave = (() => {
    if (def.input.kind === "number") return value.trim() !== "" && Number.isFinite(Number(value));
    if (def.input.kind === "pick") return !!choice;
    if (def.input.kind === "multipick") return choices.length > 0;
    if (def.input.kind === "slider") return score !== null;
    if (def.input.kind === "other") return customLabel.trim() !== "" || selectedEffects.length > 0;
    if (def.input.kind === "locatedRating") return locationScores.length > 0;
    if (def.input.kind === "sleep") {
      if (!sleepState || !wokeBy) return false;
      if (sleepState === "slept-in") return !!timeFrom;
      if (sleepState === "awake") return !!timeFrom && !!timeTo;
    }
    return false;
  })();

  const toggleChoice = (opt: string) => {
    setChoices((prev) =>
      prev.includes(opt) ? prev.filter((c) => c !== opt) : [...prev, opt],
    );
  };

  const toggleFollowUp = (opt: string) => {
    setFollowUps((prev) =>
      prev.includes(opt) ? prev.filter((c) => c !== opt) : [...prev, opt],
    );
  };

  // Side-effect suggestions driven by the "What are you tracking?" field.
  // Wait for 2+ chars before suggesting so the dropdown doesn't appear on
  // the first keystroke.
  const sideEffectMatches: SideEffect[] = searchSideEffects(customLabel, { limit: 5, minLength: 2 });

  const pickSideEffect = (s: SideEffect) => {
    if (!selectedEffects.some((x) => x.id === s.id)) {
      setSelectedEffects((prev) => [...prev, s]);
    }
  };
  const removeSideEffect = (id: string) => {
    setSelectedEffects((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleLocationScore = (area: string) => {
    setLocationScores((prev) =>
      prev.some((l) => l.area === area)
        ? prev.filter((l) => l.area !== area)
        : [...prev, { area, score: 5 }],
    );
  };
  const updateLocationScore = (area: string, score: number) => {
    setLocationScores((prev) => prev.map((l) => (l.area === area ? { ...l, score } : l)));
  };
  const toggleOtherLocation = (area: string) => {
    setOtherLocations((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };
  const toggleOptionLocation = (option: string, area: string) => {
    setOptionLocations((prev) => {
      const cur = prev[option] ?? [];
      const next = cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area];
      return { ...prev, [option]: next };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="display text-xl text-[var(--ink)]">{def.label}</h2>
            {def.hint && (
              <p className="text-xs text-[var(--ink-soft)] mt-0.5">{def.hint}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--ink-soft)] -mt-1 -mr-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {def.input.kind === "number" && (
            <div>
              <div className="flex items-center gap-2">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  step={def.input.step}
                  min={def.input.min}
                  max={def.input.max}
                  placeholder={def.input.placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
                <span className="shrink-0 text-sm font-medium text-[var(--ink-soft)] w-14 text-center">
                  {def.input.unit}
                </span>
              </div>
            </div>
          )}

          {def.input.kind === "pick" && (
            <div className="flex flex-wrap gap-2">
              {def.input.options.map((opt) => {
                const on = choice === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setChoice(on ? "" : opt)}
                    className={`rounded-xl px-3 py-2 text-sm border ${
                      on
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {def.input.kind === "multipick" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {def.input.options.map((opt) => {
                  const on = choices.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleChoice(opt)}
                      className={`rounded-full px-3 py-1.5 text-sm border transition ${
                        on
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "border-[var(--border)]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {/* Per-option body-location picker for selected clues that need one */}
              {def.input.locationOptions && choices
                .filter((c) => def.input.kind === "multipick" && def.input.locationOptions!.includes(c))
                .map((opt) => (
                  <div
                    key={`loc-${opt}`}
                    className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-soft)]"
                  >
                    <div className="text-xs font-semibold mb-1">
                      {def.input.kind === "multipick" ? def.input.locationLabel ?? "Where?" : "Where?"} <span className="text-[var(--ink-soft)] font-normal">— {opt}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {BODY_AREAS.map((area) => {
                        const on = (optionLocations[opt] ?? []).includes(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleOptionLocation(opt, area)}
                            className={`rounded-full px-2.5 py-1 text-xs border transition ${
                              on
                                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                : "border-[var(--border)]"
                            }`}
                          >
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {def.input.kind === "slider" && (
            <Slider0to10 label="" value={score} onChange={setScore} />
          )}

          {def.input.kind === "locatedRating" && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Where does it hurt?</div>
                <div className="text-xs text-[var(--ink-soft)] mb-2">
                  Tick any areas — a rating slider will appear for each
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {def.input.options.map((opt) => {
                    const on = locationScores.some((l) => l.area === opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleLocationScore(opt)}
                        className={`rounded-full px-3 py-1.5 text-sm border transition ${
                          on
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              {locationScores.length > 0 && (
                <div className="space-y-3 pt-1">
                  {locationScores.map((l) => (
                    <div key={l.area} className="rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">{l.area}</div>
                        <button
                          type="button"
                          onClick={() => toggleLocationScore(l.area)}
                          className="text-xs text-[var(--ink-soft)]"
                        >
                          remove
                        </button>
                      </div>
                      <Slider0to10
                        label=""
                        value={l.score}
                        onChange={(n) => n != null && updateLocationScore(l.area, n)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {def.input.kind === "sleep" && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-2">How did the sleep go?</div>
                <div className="flex gap-2">
                  {([
                    ["slept-in", "Slept in"],
                    ["awake", "Was wide awake"],
                  ] as const).map(([val, label]) => {
                    const on = sleepState === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSleepState(on ? null : val)}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium border transition ${
                          on
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">How did they wake?</div>
                <div className="flex gap-2">
                  {([
                    ["auto", "Woke autonomously"],
                    ["woken", "Had to be woken"],
                  ] as const).map(([val, label]) => {
                    const on = wokeBy === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setWokeBy(on ? null : val)}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium border transition ${
                          on
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sleepState === "slept-in" && (
                <div>
                  <div className="text-sm font-medium mb-1">Slept in until</div>
                  <TextInput
                    type="time"
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                  />
                </div>
              )}

              {sleepState === "awake" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Awake from</div>
                    <TextInput
                      type="time"
                      value={timeFrom}
                      onChange={(e) => setTimeFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Awake until</div>
                    <TextInput
                      type="time"
                      value={timeTo}
                      onChange={(e) => setTimeTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {def.input.kind === "other" && (
            <div className="space-y-3">
              {/* Free-text description doubles as the side-effect search.
                  As the user types, matching entries from the side-effect
                  library surface as tappable suggestions below. */}
              <div>
                <div className="text-xs text-[var(--ink-soft)] mb-1">
                  What are you tracking?
                </div>
                <TextInput
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Rash, headache, sore knee"
                  autoFocus
                />
                {selectedEffects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedEffects.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] text-[var(--primary-ink)] px-2.5 py-1 text-xs font-medium"
                      >
                        {s.title}
                        <button
                          type="button"
                          onClick={() => removeSideEffect(s.id)}
                          className="opacity-80 hover:opacity-100"
                          aria-label={`Remove ${s.title}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {sideEffectMatches.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-1.5 space-y-0.5">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold px-2 pt-1 pb-0.5">
                      Matches in side-effect library — tap to attach
                    </div>
                    {sideEffectMatches.map((s) => {
                      const already = selectedEffects.some((x) => x.id === s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => !already && pickSideEffect(s)}
                          disabled={already}
                          className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${already ? "opacity-50" : "bg-[var(--surface)] active:bg-[var(--primary)] active:text-white"}`}
                        >
                          <div className="font-medium">{s.title}{already ? " — added" : ""}</div>
                          <div className="text-xs text-[var(--ink-soft)]">
                            {PHASE_LABEL[s.phase]}
                            {s.urgentAction === "ed" ? " · Urgent" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action-hint panel — surfaces the "what to do now" + "call
                  team / go to ED if" content inline at point of logging.
                  Three modes: explicit attached effects (user picked from
                  library), preview from top match (user typed a known
                  symptom but hasn't attached), or a generic fallback for
                  free-text symptoms with no library match. */}
              {(() => {
                const hasText = customLabel.trim().length >= 2;
                const explicit = selectedEffects.filter(
                  (s) => (s.whatToDo?.length ?? 0) > 0 || (s.urgent?.length ?? 0) > 0,
                );
                const previewMatch = explicit.length === 0 && hasText
                  ? searchSideEffects(customLabel, { limit: 1, minLength: 2 })[0]
                  : undefined;
                const panelEffects = explicit.length > 0
                  ? explicit
                  : (previewMatch ? [previewMatch] : []);

                if (panelEffects.length > 0) {
                  return (
                    <div className="space-y-2">
                      {panelEffects.map((s) => {
                        const hasSteps = (s.whatToDo?.length ?? 0) > 0;
                        const hasUrgent = (s.urgent?.length ?? 0) > 0;
                        if (!hasSteps && !hasUrgent) return null;
                        return (
                          <div key={s.id} className="rounded-xl border border-[var(--border)] p-3">
                            {previewMatch && (
                              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
                                Closest library match — tap above to attach if it fits
                              </div>
                            )}
                            <div className="text-sm font-semibold mb-2">
                              What to do — {s.title}
                            </div>
                            {hasSteps && (
                              <ul className="text-sm space-y-1">
                                {s.whatToDo!.map((step, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-[var(--primary)] shrink-0">•</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {hasUrgent && (
                              <div className="rounded-lg bg-[var(--alert-soft)] p-2.5 mt-2.5">
                                <div className="text-xs font-semibold text-[var(--alert)] mb-1 flex items-center gap-1">
                                  <AlertTriangle size={12} />
                                  {s.urgentAction === "ed" ? "Go to ED if:" : "Call team now if:"}
                                </div>
                                <ul className="text-xs space-y-0.5 text-[var(--alert)]">
                                  {s.urgent!.map((step, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="shrink-0">•</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Generic fallback — typed text that didn't match the
                // library. Always show baseline escalation rules so the
                // user has guidance even for symptoms outside the library.
                if (hasText) {
                  return (
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <div className="text-sm font-semibold mb-2">
                        General — for any symptom not in the library
                      </div>
                      <ul className="text-sm space-y-1">
                        <li className="flex gap-2">
                          <span className="text-[var(--primary)] shrink-0">•</span>
                          <span>Note when it started, what makes it better or worse</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-[var(--primary)] shrink-0">•</span>
                          <span>Track severity over time — steady, improving, or worsening</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-[var(--primary)] shrink-0">•</span>
                          <span>Don&apos;t push through if it&apos;s interfering with eating, drinking, or sleeping</span>
                        </li>
                      </ul>
                      <div className="rounded-lg bg-[var(--alert-soft)] p-2.5 mt-2.5">
                        <div className="text-xs font-semibold text-[var(--alert)] mb-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> Call team or go to ED if:
                        </div>
                        <ul className="text-xs space-y-0.5 text-[var(--alert)]">
                          <li className="flex gap-2"><span className="shrink-0">•</span><span>Anything on the Tripwires list</span></li>
                          <li className="flex gap-2"><span className="shrink-0">•</span><span>Severe pain, breathing trouble, fainting, confusion</span></li>
                          <li className="flex gap-2"><span className="shrink-0">•</span><span>Heavy bleeding, black stools, blood in urine</span></li>
                          <li className="flex gap-2"><span className="shrink-0">•</span><span>Fever 38°C or higher, repeat vomiting / diarrhoea, can&apos;t keep fluids down</span></li>
                          <li className="flex gap-2"><span className="shrink-0">•</span><span>Any sudden change that feels seriously unwell</span></li>
                        </ul>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Severity — Likert with descriptive labels. Optional, but
                  feels native for the named symptom buttons. */}
              <div>
                <div className="text-xs text-[var(--ink-soft)] mb-1">Severity</div>
                <div className="flex gap-1.5">
                  {SEVERITY_LIKERT.map((opt) => {
                    const on = choice === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setChoice(on ? "" : opt)}
                        className={`flex-1 rounded-xl px-1 py-2 text-xs font-medium border transition ${
                          on
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Where on the body — only when a selected tag suggests it. */}
              {showOtherLocations && (
                <div>
                  <div className="text-sm font-medium mb-1">Where on the body?</div>
                  <div className="text-xs text-[var(--ink-soft)] mb-2">
                    Tick any areas that apply — these side effects can appear in different places
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BODY_AREAS.map((area) => {
                      const on = otherLocations.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleOtherLocation(area)}
                          className={`rounded-full px-3 py-1.5 text-sm border transition ${
                            on
                              ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                              : "border-[var(--border)]"
                          }`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-[var(--ink-soft)] mb-1">
                  Details (optional)
                </div>
                <TextArea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything — size, severity, what started it, what helps"
                />
              </div>
            </div>
          )}

          {def.followUp && def.input.kind !== "other" && (
            <div>
              <div className="text-sm font-medium mb-1">{def.followUp.label}</div>
              {def.followUp.hint && (
                <div className="text-xs text-[var(--ink-soft)] mb-2">{def.followUp.hint}</div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {def.followUp.options.map((opt) => {
                  const on = followUps.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleFollowUp(opt)}
                      className={`rounded-full px-3 py-1.5 text-sm border transition ${
                        on
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "border-[var(--border)]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {def.contextText && def.input.kind !== "other" && (
            <div>
              <div className="text-sm font-medium mb-1">{def.contextText.label}</div>
              {def.contextText.hint && (
                <div className="text-xs text-[var(--ink-soft)] mb-2">{def.contextText.hint}</div>
              )}
              <TextInput
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder={def.contextText.placeholder}
              />
            </div>
          )}

          {flagMsg && (
            <div className="rounded-xl bg-[var(--alert-soft)] border border-[var(--alert)] p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-[var(--alert)] mb-1">
                <AlertTriangle size={14} /> Red flag
              </div>
              {flagMsg}
            </div>
          )}

          {def.input.kind !== "other" && (
            <div>
              <div className="text-xs text-[var(--ink-soft)] mb-1">
                Notes (optional)
              </div>
              <TextInput
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth noting"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(reading)}
          className="mt-5 w-full rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5 disabled:opacity-50"
        >
          {initial ? "Update signal" : "Save signal"}
        </button>
      </div>
    </div>
  );
}
