"use client";
import { Card } from "@/components/ui";
import { useEntries, type DailyLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { DAY_DEFINITIONS, getSuggestedActivities, type DayColour } from "@/lib/dayActivities";
import { usePatientName } from "@/lib/usePatientName";
import { isToday, parseISO } from "date-fns";
import { useMemo } from "react";

/** "How am I feeling overall?" picker — surfaces the daily-trace dayColour
 *  on the home page so the descriptor and suggested activities are visible
 *  up-front instead of buried in the log.
 *
 *  Writes directly to today's DailyLog entry (creates one if absent). */
export function DayColourCard() {
  const { addEntry, updateEntry } = useSession();
  const { firstName, isSupport } = usePatientName();
  const daily = useEntries("daily");
  const todayLog = useMemo(() => daily.find((d) => isToday(parseISO(d.createdAt))), [daily]);
  const dayColour = (todayLog?.dayColour as DayColour | undefined) ?? "";

  const setColour = async (c: DayColour | "") => {
    const next = dayColour === c ? "" : c;
    if (todayLog) {
      await updateEntry(todayLog.id, { dayColour: next } as Partial<DailyLog>);
    } else {
      await addEntry({
        kind: "daily",
        dayColour: next || undefined,
        manuallyLogged: false,
      } as Omit<DailyLog, "id" | "createdAt">);
    }
  };

  const definition = dayColour ? DAY_DEFINITIONS[dayColour] : null;

  // Readable text + bg tuned for dark + light mode; inline styles so the same
  // component works regardless of the surrounding theme.
  const descriptorStyle = dayColour
    ? {
        red: { bg: "#fde8e8", text: "#5a1313", accent: "#8b0000" },
        yellow: { bg: "#fef9e7", text: "#4a3a0a", accent: "#b8860b" },
        green: { bg: "#e8f5e9", text: "#1f3b24", accent: "#2d7a4f" },
      }[dayColour]
    : null;

  return (
    <Card className="space-y-3 mb-4">
      <div>
        <h2 className="font-semibold">
          {isSupport ? `How is ${firstName} feeling overall?` : "How am I feeling overall?"}
        </h2>
        <p className="text-xs text-[var(--ink-soft)]">
          Tap the colour that best fits right now
        </p>
      </div>
      <div className="flex gap-2">
        {(["red", "yellow", "green"] as const).map((colour) => {
          const on = dayColour === colour;
          const bg = colour === "red" ? "#8b0000" : colour === "yellow" ? "#d4a017" : "#2d7a4f";
          return (
            <button
              key={colour}
              type="button"
              onClick={() => setColour(colour)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold border-2 transition ${
                on ? "text-white" : "border-[var(--border)] text-[var(--ink)]"
              }`}
              style={on ? { backgroundColor: bg, borderColor: bg } : undefined}
            >
              {colour === "red" ? "Red" : colour === "yellow" ? "Yellow" : "Green"}
            </button>
          );
        })}
      </div>

      {dayColour && definition && descriptorStyle && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            backgroundColor: descriptorStyle.bg,
            color: descriptorStyle.text,
            borderLeft: `4px solid ${descriptorStyle.accent}`,
          }}
        >
          <div className="font-semibold mb-1" style={{ color: descriptorStyle.accent }}>
            {definition.label}
          </div>
          <div className="text-xs leading-relaxed" style={{ color: descriptorStyle.text }}>
            {definition.description}
          </div>
        </div>
      )}

      {dayColour && (
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">
            Suggested for today
          </div>
          <ul className="space-y-2 text-sm">
            {getSuggestedActivities(dayColour).map((a, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className="shrink-0 mt-0.5"
                  style={{
                    color: dayColour === "red" ? "#8b0000" : dayColour === "yellow" ? "#d4a017" : "#2d7a4f",
                  }}
                >
                  {dayColour === "green" ? "→" : dayColour === "yellow" ? "·" : "~"}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
