"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle, Submit } from "@/components/ui";
import type { FlagEvent } from "@/lib/store";
import { useSession } from "@/lib/session";
import { AlertTriangle, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

const TRIGGERS = [
  "Temperature 38.0°C or higher",
  "Chills, sweats, shivers, or shakes",
  "Shortness of breath, wheeze, chest pain, arm tingling/discomfort",
  "Uncontrolled vomiting or diarrhoea",
  "Sudden deterioration, confusion, faintness, severe weakness",
  "Severe rash, swelling, allergic reaction, or anaphylaxis symptoms",
  "New bleeding, black stools, blood in urine",
  "Severe left upper abdominal pain",
];

export default function EDTriggers() {
  const router = useRouter();
  const { addEntry, user } = useSession();

  const logFlag = async (trigger: string) => {
    if (user) await addEntry({ kind: "flag", triggerLabel: trigger } as Omit<FlagEvent, "id" | "createdAt">);
    router.push(user ? "/log?flagged=1" : "/");
  };

  return (
    <AppShell>
      <PageTitle sub="If any of these are happening, call the treating team or go to ED now.">
        Red flags
      </PageTitle>

      <Card className="mb-4 border-[var(--alert)] bg-[var(--alert-soft)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-[var(--alert)] shrink-0 mt-0.5" size={22} />
          <div className="text-sm">
            <p className="font-semibold text-[var(--alert)] mb-1">Urgent = call or go now</p>
            <p className="text-[var(--ink)]">Don't wait to see if it passes. Tap one below to log it + call.</p>
          </div>
        </div>
      </Card>

      <div className="space-y-2 mb-5">
        {TRIGGERS.map((t) => (
          <button
            key={t}
            onClick={() => logFlag(t)}
            className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 active:bg-[var(--surface-soft)]"
          >
            <span className="text-[var(--ink)]">{t}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        <a
          href="tel:000"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--alert)] text-white font-semibold py-4 text-base"
        >
          <Phone size={20} /> Call 000 (emergency)
        </a>
        <a
          href="/contacts"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-4 text-base"
        >
          <Phone size={20} /> Call treating team
        </a>
      </div>
    </AppShell>
  );
}
