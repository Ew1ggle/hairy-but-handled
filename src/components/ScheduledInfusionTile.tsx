"use client";
import { getScheduledInfusion, useTreatmentProfile } from "@/lib/scheduledInfusion";
import { useEntries } from "@/lib/store";
import { AlertTriangle, ChevronRight, Droplet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

/** Tile for a given date that flags a scheduled treatment day and links to
 *  the infusion log. States:
 *   - scheduled + no entry yet      → red banner ("scheduled today — not logged yet")
 *   - scheduled + entry, !completed → amber banner ("in progress / not completed")
 *   - scheduled + entry, completed  → green accent tile ("completed")
 *   - not a scheduled day           → renders nothing (returns null)
 *
 *  `variant="banner"` renders a compact full-width row (for use under a
 *  secondary card like Daily Trace on home). `variant="card"` renders a
 *  slightly taller tile for primary slots. */
export function ScheduledInfusionTile({
  date,
  variant = "banner",
  className = "",
}: {
  date: string;
  variant?: "banner" | "card";
  className?: string;
}) {
  const infusions = useEntries("infusion");
  const { regimen, startDate, customDays } = useTreatmentProfile();

  const scheduled = useMemo(
    () => getScheduledInfusion({ date, startDate, regimen, customTreatmentDays: customDays, infusions }),
    [date, startDate, regimen, customDays, infusions],
  );

  if (!scheduled) return null;

  const { cycleDay, scheduled: day, entry, isIncomplete } = scheduled;
  const inProgress = !!entry && !entry.completed;
  const completed = !!entry && entry.completed;

  // Visual state — colours echo the flag/accent palette already used elsewhere.
  const state = completed
    ? {
        bg: "bg-[var(--surface)]",
        border: "border-2 border-[var(--accent)]",
        iconBg: "bg-[var(--accent)]",
        iconColor: "text-white",
        title: "Infusion completed",
        sub: `Day ${cycleDay} · ${day.drugs}`,
        badge: null as null | React.ReactNode,
      }
    : inProgress
      ? {
          bg: "",
          border: "",
          iconBg: "",
          iconColor: "text-white",
          title: "Infusion in progress",
          sub: `Day ${cycleDay} · ${day.drugs} — not marked completed`,
          badge: (
            <span className="inline-block text-[10px] uppercase font-semibold text-white bg-[#d4a017] px-2 py-0.5 rounded-full ml-2">
              incomplete
            </span>
          ),
        }
      : {
          bg: "",
          border: "",
          iconBg: "",
          iconColor: "text-white",
          title: "Infusion scheduled today",
          sub: `Day ${cycleDay} · ${day.drugs} — not logged yet`,
          badge: (
            <span className="inline-block text-[10px] uppercase font-semibold text-white bg-[var(--alert)] px-2 py-0.5 rounded-full ml-2">
              action needed
            </span>
          ),
        };

  // Non-completed states use alert-red (scheduled) or amber (in-progress) inline.
  const inlineStyle: React.CSSProperties | undefined = completed
    ? undefined
    : inProgress
      ? { backgroundColor: "#fef9e7", border: "2px solid #d4a017" }
      : { backgroundColor: "var(--alert-soft)", border: "2px solid var(--alert)" };

  const iconStyle: React.CSSProperties = completed
    ? {}
    : inProgress
      ? { backgroundColor: "#d4a017", color: "#fff" }
      : { backgroundColor: "var(--alert)", color: "#fff" };

  const titleColor = completed
    ? undefined
    : inProgress
      ? { color: "#8a6d0f" }
      : { color: "var(--alert)" };

  const padding = variant === "card" ? "px-4 py-3.5" : "px-4 py-3";

  return (
    <Link
      href={`/treatment/${cycleDay}`}
      className={`flex items-center gap-3 rounded-2xl ${state.bg} ${state.border} ${padding} active:scale-[0.99] transition ${className}`}
      style={inlineStyle}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${state.iconBg} ${state.iconColor}`}
        style={iconStyle}
      >
        {completed ? <Droplet size={18} /> : <AlertTriangle size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm flex items-center flex-wrap" style={titleColor}>
          {state.title}
          {state.badge}
        </div>
        <div className="text-xs text-[var(--ink-soft)] truncate" style={titleColor}>
          {state.sub}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0" style={titleColor ?? { color: "var(--ink-soft)" }} />
    </Link>
  );
}
