"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import type { FlagEvent } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

type QuickContact = { label: string; phone: string };

export default function EDTriggers() {
  const router = useRouter();
  const { addEntry, user, activePatientId } = useSession();
  const [contacts, setContacts] = useState<QuickContact[]>([]);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = (data?.data ?? {}) as Record<string, string | undefined>;
        const list: QuickContact[] = [];
        const pick = (name: string, label: string) => {
          const phone = p[`${name}Phone`] || p[`${name}Mobile`];
          if (phone && !p[`${name}NA`]) list.push({ label: `${label} — ${p[name] || ""}`.trim(), phone });
        };
        pick("hematologist", "Hematologist");
        pick("immunologist", "Immunologist");
        pick("coordinator", "Coordinator");
        pick("gp", "GP");
        setContacts(list);
      });
  }, [activePatientId]);

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
            <p className="text-[var(--ink)]">Don't wait to see if it passes. Tap a trigger below to log it + note it for the team.</p>
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

      <div className="grid gap-3 mb-4">
        <a
          href="tel:000"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--alert)] text-white font-semibold py-4 text-base"
        >
          <Phone size={20} /> Call 000 (emergency)
        </a>
      </div>

      {contacts.length > 0 && (
        <Card>
          <div className="text-sm font-semibold mb-3">Call the treating team</div>
          <div className="space-y-2">
            {contacts.map((c) => (
              <a key={c.phone} href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5">
                <div>
                  <div className="text-sm">{c.label}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{c.phone}</div>
                </div>
                <Phone size={18} className="text-[var(--primary)]" />
              </a>
            ))}
          </div>
          <p className="text-xs text-[var(--ink-soft)] mt-3">Add or edit these numbers in Profile → Care team.</p>
        </Card>
      )}
      {contacts.length === 0 && (
        <Card className="text-sm text-[var(--ink-soft)]">
          Add your hematologist, GP, and coordinator phone numbers in <b>Profile → Care team</b>. They'll appear here as one-tap call buttons.
        </Card>
      )}
    </AppShell>
  );
}
