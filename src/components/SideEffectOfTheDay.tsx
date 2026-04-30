"use client";
import { useEntries } from "@/lib/store";
import { getNadirContext } from "@/lib/nadirWindow";
import { SIDE_EFFECTS } from "@/lib/sideEffects";
import { Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

/** Per-window side-effect rotation pool. Each id matches a SIDE_EFFECTS
 *  entry. The day-of-year mod len picks one deterministically so the
 *  carer sees the same heads-up all day but a different one tomorrow.
 *  Curated to surface what the eviQ + NCI guidance flag for each
 *  cladribine + rituximab phase. */
const POOL_BY_STATE: Record<string, string[]> = {
  // Day 0-4: infusion just done — watch for reactions, hydrate.
  pre: ["allergic-reaction", "rash-mild", "taste-smell", "flu-mild", "appetite-mild"],
  // Day 5-21: nadir window — neutropenia, mucositis, fever risk.
  nadir: [
    "low-white-cells",
    "mouth-ulcers-thrush",
    "sore-throat-cough",
    "skin-line-infection",
    "bleeding-bruising",
    "fatigue-significant",
    "fainting-dizziness",
    "diarrhoea",
  ],
  // Day 22-59: recovery — fatigue, eating patterns.
  recovery: ["fatigue-significant", "appetite-mild", "hair-thinning", "taste-smell"],
  // Day 60-210: late-onset window — shingles, late LON, eye stuff.
  late: ["shingles", "low-white-cells", "eye-irritation", "fatigue-significant"],
  // Stable: general HCL care.
  stable: ["appetite-mild", "fatigue-significant", "rash-mild"],
};

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Side-effect-of-the-day card — picks one HCL/cladribine side effect
 *  contextual to the current nadir window. Renders compact: title +
 *  description + first 3 whatToDo items + link to the full detail
 *  page. Rotates daily so over a week the user sees the breadth of
 *  what to watch for, not the same thing on repeat. */
export function SideEffectOfTheDay() {
  const infusions = useEntries("infusion");
  const ctx = useMemo(() => getNadirContext(infusions), [infusions]);
  const today = useMemo(() => dayOfYear(new Date()), []);

  const pick = useMemo(() => {
    const pool = POOL_BY_STATE[ctx.state] ?? POOL_BY_STATE.stable;
    const id = pool[today % pool.length];
    return SIDE_EFFECTS.find((s) => s.id === id);
  }, [ctx.state, today]);

  if (!pick) return null;

  return (
    <Link
      href={`/side-effects#${pick.id}`}
      className="block mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 active:scale-[0.99] transition"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-[var(--primary)]" />
        <div className="text-[10px] uppercase tracking-widest text-[var(--primary)] font-bold">
          Today&apos;s heads-up
        </div>
      </div>
      <div className="font-semibold text-sm">{pick.title}</div>
      <div className="text-xs text-[var(--ink-soft)] mt-0.5 line-clamp-2">
        {pick.description}
      </div>
      {pick.whatToDo && pick.whatToDo.length > 0 && (
        <ul className="text-xs text-[var(--ink-soft)] mt-1.5 space-y-0.5">
          {pick.whatToDo.slice(0, 3).map((s, i) => (
            <li key={i}>· {s}</li>
          ))}
        </ul>
      )}
      <div className="text-[11px] text-[var(--primary)] font-medium mt-1.5 flex items-center gap-1">
        Read more <ChevronRight size={11} />
      </div>
    </Link>
  );
}
