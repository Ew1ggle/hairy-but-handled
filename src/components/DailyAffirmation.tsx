"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { useEntries } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getTodayAffirmation, isSpicyAffirmation, type TonePreference } from "@/lib/affirmations";
import { getSuggestedActivity, type DayColour } from "@/lib/dayActivities";
import { isToday, parseISO } from "date-fns";

export default function DailyAffirmation() {
  const { activePatientId } = useSession();
  const [tone, setTone] = useState<TonePreference | null>(null);
  const daily = useEntries("daily");
  const todayLog = daily.find((d) => isToday(parseISO(d.createdAt)));
  const dayColour = (todayLog as unknown as { dayColour?: DayColour })?.dayColour;

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as { tonePreference?: TonePreference } | undefined;
        setTone(p?.tonePreference ?? "both");
      });
  }, [activePatientId]);

  if (!tone) return null;

  const text = getTodayAffirmation(tone);
  const spicy = isSpicyAffirmation(text);

  return (
    <div className="mb-4 space-y-2">
      <div className={`rounded-2xl px-4 py-3 text-center ${spicy ? "affirmation-spicy" : "affirmation-positive"}`}>
        <div className={`text-[15px] font-semibold italic leading-snug ${spicy ? "text-white" : ""}`}>
          &ldquo;{text}&rdquo;
        </div>
      </div>
      {dayColour && (
        <div className="rounded-xl px-3 py-2 text-xs text-center" style={{
          backgroundColor: dayColour === "red" ? "#fde8e8" : dayColour === "yellow" ? "#fef9e7" : "#e8f5e9",
          color: dayColour === "red" ? "#8b0000" : dayColour === "yellow" ? "#8a6d00" : "#1b5e20",
        }}>
          <span className="font-semibold">{dayColour === "red" ? "Red" : dayColour === "yellow" ? "Yellow" : "Green"} day</span>
          {" — "}
          {getSuggestedActivity(dayColour)}
        </div>
      )}
    </div>
  );
}
