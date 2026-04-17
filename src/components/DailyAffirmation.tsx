"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { getTodayAffirmation, isSpicyAffirmation, type TonePreference } from "@/lib/affirmations";

export default function DailyAffirmation() {
  const { activePatientId } = useSession();
  const [tone, setTone] = useState<TonePreference | null>(null);

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
    <div className={`mb-4 rounded-2xl px-4 py-3 text-center ${spicy ? "affirmation-spicy" : "affirmation-positive"}`}>
      <div className={`text-[15px] font-semibold italic leading-snug ${spicy ? "text-white" : ""}`}>
        &ldquo;{text}&rdquo;
      </div>
    </div>
  );
}
