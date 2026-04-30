"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Vaccination } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Plus, Syringe, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

/** Common vaccines; isLive marks the ones forbidden in the patient
 *  during/after cladribine and that need a contact-distancing plan
 *  in household contacts. Sourced from eviQ + Australian Immunisation
 *  Handbook live-attenuated list. */
const VACCINE_OPTIONS: { name: string; isLive: boolean; hint?: string }[] = [
  { name: "Influenza (inactivated)", isLive: false },
  { name: "COVID-19 (mRNA / protein)", isLive: false },
  { name: "Pneumococcal (PCV13 / PPV23)", isLive: false },
  { name: "Tdap (tetanus / diphtheria / pertussis)", isLive: false },
  { name: "Hepatitis B", isLive: false },
  { name: "Shingrix (recombinant zoster)", isLive: false, hint: "Non-live — safe for patient" },
  { name: "MMR (measles / mumps / rubella)", isLive: true, hint: "LIVE — forbidden for patient" },
  { name: "Varicella", isLive: true, hint: "LIVE — viral shedding for ~6 weeks if rash develops" },
  { name: "Zostavax (live zoster)", isLive: true, hint: "LIVE — forbidden for patient. Use Shingrix instead." },
  { name: "Rotavirus (oral)", isLive: true, hint: "LIVE — infants shed in faeces for 7-10 days" },
  { name: "Yellow fever", isLive: true },
  { name: "BCG (TB)", isLive: true },
  { name: "Oral polio (OPV)", isLive: true },
  { name: "Nasal flu (LAIV)", isLive: true, hint: "Inactivated injection is fine instead" },
  { name: "Other", isLive: false },
];

function findVaccineMeta(name: string) {
  const exact = VACCINE_OPTIONS.find((v) => v.name === name);
  if (exact) return exact;
  // Loose match by keywords for legacy / typed entries
  const lower = name.toLowerCase();
  for (const v of VACCINE_OPTIONS) {
    if (v.isLive && lower.includes(v.name.split(" ")[0].toLowerCase())) return v;
  }
  return undefined;
}

export default function VaccinationsPage() {
  const { addEntry, deleteEntry } = useSession();
  const all = useEntries("vaccination");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [recipient, setRecipient] = useState<"patient" | "contact">("patient");
  const [contactName, setContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [vaccine, setVaccine] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [riskWindow, setRiskWindow] = useState("");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(
    () => all.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [all],
  );

  const reset = () => {
    setRecipient("patient");
    setContactName("");
    setRelationship("");
    setVaccine("");
    setIsLive(false);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setRiskWindow("");
    setNotes("");
    setShowForm(false);
  };

  const save = async () => {
    if (!vaccine.trim() || !date) return;
    await addEntry({
      kind: "vaccination",
      recipient,
      contactName: recipient === "contact" ? contactName.trim() || undefined : undefined,
      relationship: recipient === "contact" ? relationship.trim() || undefined : undefined,
      vaccine: vaccine.trim(),
      isLive: isLive || undefined,
      date,
      riskWindow: riskWindow.trim() || undefined,
      notes: notes.trim() || undefined,
    } as Omit<Vaccination, "id" | "createdAt">);
    reset();
  };

  const pickVaccine = (opt: { name: string; isLive: boolean; hint?: string }) => {
    setVaccine(opt.name);
    setIsLive(opt.isLive);
    if (opt.isLive && recipient === "contact" && !riskWindow) {
      // Seed a sensible default for live-vaccine contacts.
      setRiskWindow(
        opt.name.startsWith("Rotavirus")
          ? "Faecal shedding for ~7-10 days. Wear gloves changing nappies; nappy disposal in sealed bag; thorough handwashing. Patient shouldn't change nappies in this window."
          : opt.name.startsWith("Varicella")
            ? "If rash develops, patient should avoid contact until lesions crust over (~6 weeks max). Otherwise low risk."
            : opt.name.startsWith("MMR")
              ? "No documented patient transmission. Standard hygiene precautions."
              : ""
      );
    }
  };

  return (
    <AppShell>
      <PageTitle sub="Patient + household contacts. Live vaccines flagged.">
        Vaccinations
      </PageTitle>

      <Card className="mb-4 border-[var(--alert)]">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--alert)] shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-[var(--alert)] mb-0.5">Live vaccines are forbidden for the patient on cladribine</div>
            <div className="text-[var(--ink-soft)]">
              That includes MMR, varicella, Zostavax (use Shingrix instead), yellow fever, BCG, oral polio, nasal flu, and rotavirus. Inactivated / mRNA / recombinant vaccines are fine. Household contacts <b>should</b> stay up to date — log theirs here so the timing of any shedding is visible.
            </div>
          </div>
        </div>
      </Card>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 rounded-2xl bg-[var(--primary)] text-white py-4 font-semibold text-base flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Log a vaccination
        </button>
      )}

      {showForm && (
        <Card className="mb-6 space-y-4">
          <h2 className="font-semibold text-lg">New vaccination</h2>

          <div>
            <div className="text-sm font-medium mb-2">Who got it?</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecipient("patient")}
                className={
                  recipient === "patient"
                    ? "rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)] text-white px-3 py-3 text-sm font-medium"
                    : "rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-medium"
                }
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRecipient("contact")}
                className={
                  recipient === "contact"
                    ? "rounded-xl border-2 border-[var(--primary)] bg-[var(--primary)] text-white px-3 py-3 text-sm font-medium"
                    : "rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-medium"
                }
              >
                <UserPlus size={14} className="inline mr-1" />
                Household contact
              </button>
            </div>
          </div>

          {recipient === "contact" && (
            <>
              <Field label="Contact name">
                <TextInput value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Sarah, Liam" />
              </Field>
              <Field label="Relationship">
                <TextInput value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Daughter (6yo), Husband" />
              </Field>
            </>
          )}

          <Field label="Vaccine">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VACCINE_OPTIONS.map((opt) => {
                const on = vaccine === opt.name;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => pickVaccine(opt)}
                    className={
                      on
                        ? `rounded-lg border px-2.5 py-1 text-xs font-medium text-white ${opt.isLive ? "bg-[var(--alert)] border-[var(--alert)]" : "bg-[var(--primary)] border-[var(--primary)]"}`
                        : `rounded-lg border border-dashed px-2.5 py-1 text-xs ${opt.isLive ? "border-[var(--alert)] text-[var(--alert)]" : "border-[var(--border)] text-[var(--ink-soft)]"}`
                    }
                  >
                    {on ? "✓" : "+"} {opt.name}
                    {opt.isLive && <span className="ml-1 text-[10px] opacity-80">LIVE</span>}
                  </button>
                );
              })}
            </div>
            <TextInput value={vaccine} onChange={(e) => setVaccine(e.target.value)} placeholder="Or type the name" />
          </Field>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="h-4 w-4 accent-[var(--alert)]"
            />
            <span>Live attenuated vaccine</span>
            {isLive && recipient === "patient" && (
              <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert)] text-white px-1.5 py-0.5 font-semibold ml-1">
                Forbidden during cladribine
              </span>
            )}
          </label>

          <Field label="Date given"><DateInput value={date} onChange={(e) => setDate(e.target.value)} /></Field>

          {(isLive && recipient === "contact") && (
            <Field label="Shedding / contact precautions" hint="When the patient should keep distance, what to do, for how long">
              <TextArea value={riskWindow} onChange={(e) => setRiskWindow(e.target.value)} placeholder="e.g. Avoid nappy changes for 10 days; wash hands thoroughly" />
            </Field>
          )}

          <Field label="Notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brand, batch number, reaction..." />
          </Field>

          <div className="flex gap-3">
            <Submit onClick={save}>Save</Submit>
            <button type="button" onClick={reset} className="rounded-2xl border border-[var(--border)] px-6 py-4 text-sm font-medium">
              Cancel
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {sorted.map((v) => {
          const meta = findVaccineMeta(v.vaccine);
          const live = v.isLive ?? meta?.isLive ?? false;
          return (
            <Card key={v.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Syringe size={14} className="text-[var(--ink-soft)] shrink-0" />
                    <span className="font-semibold">{v.vaccine}</span>
                    {live && (
                      <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert)] text-white px-1.5 py-0.5 font-semibold">
                        LIVE
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] px-1.5 py-0.5 font-semibold capitalize">
                      {v.recipient === "patient" ? "Patient" : (v.contactName ? `Contact: ${v.contactName}` : "Contact")}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--ink-soft)]">
                    {format(parseISO(v.date), "EEE d MMM yyyy")}
                    {v.relationship && ` · ${v.relationship}`}
                  </div>
                  {v.riskWindow && (
                    <div className="text-xs mt-1 text-[var(--alert)]">
                      <b>Precautions:</b> {v.riskWindow}
                    </div>
                  )}
                  {v.notes && <div className="text-xs text-[var(--ink-soft)] mt-1">{v.notes}</div>}
                </div>
                <button
                  onClick={() => { if (confirm("Delete this vaccination record?")) deleteEntry(v.id); }}
                  className="text-[var(--ink-soft)] p-1"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })}
        {sorted.length === 0 && !showForm && (
          <Card className="text-center text-[var(--ink-soft)]">
            <Syringe size={28} className="mx-auto mb-2 opacity-40" />
            <p>No vaccinations recorded yet.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
