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

  // Palette tones — alert / blue / good — instead of the older
  // red / amber / green which violated the project's no-amber rule.
  // The dayColour key in storage stays as red / yellow / green so
  // existing data round-trips; only the rendered tone and label
  // change.
  const buttonLabel: Record<Exclude<DayColour, "">, string> = {
    red: "Tough",
    yellow: "Mixed",
    green: "Good",
  };
  const tone = dayColour
    ? {
        red: { bg: "var(--alert-soft)", text: "#5a1313", accent: "var(--alert)" },
        yellow: { bg: "color-mix(in srgb, var(--blue) 14%, transparent)", text: "var(--ink)", accent: "var(--blue)" },
        green: { bg: "color-mix(in srgb, var(--good) 14%, transparent)", text: "var(--ink)", accent: "var(--good)" },
      }[dayColour]
    : null;

  return (
    <Card className="space-y-3 mb-4">
      <div>
        <h2 className="font-semibold">
          {isSupport ? `How is ${firstName} feeling overall?` : "How am I feeling overall?"}
        </h2>
        <p className="text-xs text-[var(--ink-soft)]">
          Tap the option that best fits right now
        </p>
      </div>
      <div className="flex gap-2">
        {(["red", "yellow", "green"] as const).map((colour) => {
          const on = dayColour === colour;
          const accent = colour === "red" ? "var(--alert)" : colour === "yellow" ? "var(--blue)" : "var(--good)";
          return (
            <button
              key={colour}
              type="button"
              onClick={() => setColour(colour)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold border-2 transition ${
                on ? "text-white" : "border-[var(--border)] text-[var(--ink)]"
              }`}
              style={on ? { backgroundColor: accent, borderColor: accent } : undefined}
            >
              {buttonLabel[colour]}
            </button>
          );
        })}
      </div>

      {dayColour && definition && tone && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            backgroundColor: tone.bg,
            color: tone.text,
            borderLeft: `4px solid ${tone.accent}`,
          }}
        >
          <div className="font-semibold mb-1" style={{ color: tone.accent }}>
            {definition.label}
          </div>
          <div className="text-xs leading-relaxed" style={{ color: tone.text }}>
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
                    color: dayColour === "red" ? "var(--alert)" : dayColour === "yellow" ? "var(--blue)" : "var(--good)",
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
