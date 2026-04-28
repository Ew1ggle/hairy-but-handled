"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type FlagEvent } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { format, isToday, parseISO } from "date-fns";
import { AlertTriangle, Phone, Trash2, X } from "lucide-react";
import { MedicalDisclaimerFull } from "@/components/MedicalDisclaimer";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const TRIGGERS = [
  "Temperature 37.8°C or higher",
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
  const { addEntry, deleteEntry, user, activePatientId } = useSession();
  const [contacts, setContacts] = useState<QuickContact[]>([]);
  const [editingFlag, setEditingFlag] = useState<FlagEvent | null>(null);
  const flags = useEntries("flag");

  const todaysFlags = useMemo(
    () =>
      flags
        .filter((f) => isToday(parseISO(f.createdAt)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [flags],
  );

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
      <PageTitle sub="Catch what can't wait">
        Tripwires
      </PageTitle>
      <p className="-mt-3 mb-5 text-sm text-[var(--ink-soft)]">
        If any of these are happening, call the treating team or go to ED now.
      </p>

      <MedicalDisclaimerFull />

      <Card className="mb-4 border-[var(--alert)] bg-[var(--alert-soft)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-[var(--alert)] shrink-0 mt-0.5" size={22} />
          <div className="text-sm">
            <p className="font-semibold text-[var(--alert)] mb-1">Urgent = call or go now</p>
            <p className="text-[var(--ink)]">Don't wait to see if it passes. Tap a trigger below to log it + note it for the team.</p>
          </div>
        </div>
      </Card>

      {/* Live flags raised today — from Signal Sweep auto-flags or manual taps */}
      {todaysFlags.length > 0 && (
        <Card className="mb-4 border-[var(--alert)]">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold text-[var(--alert)] flex items-center gap-1.5">
              <AlertTriangle size={14} /> Flags raised today
            </h2>
            <span className="text-xs text-[var(--ink-soft)]">{todaysFlags.length} active</span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {todaysFlags.map((f) => (
              <li key={f.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setEditingFlag(f)}
                  className="flex items-start gap-3 flex-1 min-w-0 text-left active:opacity-70 transition"
                >
                  <div className="shrink-0 w-12 text-xs tabular-nums text-[var(--ink-soft)] pt-0.5">
                    {format(parseISO(f.createdAt), "HH:mm")}
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <div>{f.triggerLabel}</div>
                    {(f.whatHappened || f.whoCalled || f.outcome || f.wentToED) && (
                      <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                        {[
                          f.wentToED ? "Went to ED" : null,
                          f.whoCalled ? `Called ${f.whoCalled}` : null,
                          f.outcome,
                        ].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntry(f.id)}
                  className="text-[var(--ink-soft)] shrink-0 p-1"
                  aria-label="Clear flag"
                  title="Clear this flag"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[var(--ink-soft)] mt-2 leading-relaxed">
            Flags come from Signal Sweep auto-detections (temp ≥37.8, SpO₂ &lt;92, uncontrolled diarrhoea, blood in urine / stool / vomit) or from tapping a trigger below. Clear one once it's been actioned with the team.
          </p>
        </Card>
      )}

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

      {editingFlag && (
        <FlagSheet
          flag={editingFlag}
          onClose={() => setEditingFlag(null)}
        />
      )}
    </AppShell>
  );
}

function FlagSheet({ flag, onClose }: { flag: FlagEvent; onClose: () => void }) {
  const { updateEntry } = useSession();
  const [triggerLabel, setTriggerLabel] = useState(flag.triggerLabel);
  const [whatHappened, setWhatHappened] = useState(flag.whatHappened ?? "");
  const [whoCalled, setWhoCalled] = useState(flag.whoCalled ?? "");
  const [adviceGiven, setAdviceGiven] = useState(flag.adviceGiven ?? "");
  const [wentToED, setWentToED] = useState(!!flag.wentToED);
  const [outcome, setOutcome] = useState(flag.outcome ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await updateEntry(flag.id, {
      triggerLabel,
      whatHappened: whatHappened || undefined,
      whoCalled: whoCalled || undefined,
      adviceGiven: adviceGiven || undefined,
      wentToED,
      outcome: outcome || undefined,
    } as Partial<FlagEvent>);
    setBusy(false);
    onClose();
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
            <h2 className="display text-xl text-[var(--ink)]">Flag detail</h2>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              Logged {format(parseISO(flag.createdAt), "d MMM, h:mm a")}
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

        <div className="space-y-3">
          <Field label="What was flagged">
            <TextInput value={triggerLabel} onChange={(e) => setTriggerLabel(e.target.value)} />
          </Field>
          <Field label="What happened">
            <TextArea
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              placeholder="Symptoms, when it started, what made it worse"
            />
          </Field>
          <Field label="Who you called (or are about to call)">
            <TextInput
              value={whoCalled}
              onChange={(e) => setWhoCalled(e.target.value)}
              placeholder="e.g. Hematologist, after-hours, ED triage"
            />
          </Field>
          <Field label="Advice given">
            <TextArea
              value={adviceGiven}
              onChange={(e) => setAdviceGiven(e.target.value)}
              placeholder="What the team said to do"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={wentToED}
              onChange={(e) => setWentToED(e.target.checked)}
              className="w-4 h-4"
            />
            Went to ED
          </label>
          <Field label="Outcome">
            <TextInput
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Sent home with antibiotics"
            />
          </Field>
        </div>

        <div className="mt-5">
          <Submit onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Submit>
        </div>
      </div>
    </div>
  );
}
