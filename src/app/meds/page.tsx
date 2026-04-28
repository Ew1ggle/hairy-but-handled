"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type MedEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Pill } from "lucide-react";
import { useState } from "react";

const COMMON_MEDS = [
  { name: "Paracetamol", dose: "1g", reason: "Pain / fever" },
  { name: "Ibuprofen", dose: "400 mg", reason: "Pain / inflammation" },
  { name: "Ondansetron", dose: "4–8 mg", reason: "Nausea" },
  { name: "Loratadine", dose: "10 mg", reason: "Allergy / itch" },
  { name: "Phenergan", dose: "10 mg", reason: "Antihistamine / nausea" },
  { name: "Dexamethasone", dose: "", reason: "Steroid / anti-inflammatory" },
  { name: "Valaciclovir", dose: "500 mg", reason: "Antiviral prophylaxis" },
  { name: "Bactrim / cotrimoxazole", dose: "", reason: "PCP prophylaxis" },
  { name: "Omeprazole", dose: "20 mg", reason: "Reflux / stomach" },
  { name: "Iron", dose: "", reason: "Iron deficiency" },
];

type MedExtra = { purpose?: "prophylaxis" | "regular" | "as-needed" | ""; helped?: "Yes" | "No" | "Not sure" | "" };

export default function Meds() {
  const entries = useEntries("med").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = entries.filter((m) => !m.stopped);
  const stopped = entries.filter((m) => m.stopped);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedEntry | null>(null);
  const { deleteEntry, updateEntry } = useSession();

  return (
    <AppShell>
      <PageTitle sub="Tap a common med to add fast, or add a custom one.">Medications</PageTitle>

      {editing ? (
        <MedForm existing={editing} onDone={() => setEditing(null)} />
      ) : !open ? (
        <button onClick={() => setOpen(true)} className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5">
          <Plus size={18} /> Add medication
        </button>
      ) : (
        <MedForm onDone={() => setOpen(false)} />
      )}

      {active.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Currently taking</h2>
          <div className="space-y-2 mb-4">
            {active.map((m) => (
              <MedCard
                key={m.id}
                m={m}
                onEdit={() => { setEditing(m); setOpen(false); }}
                onStop={() => updateEntry(m.id, { stopped: true })}
                onDelete={() => deleteEntry(m.id)}
              />
            ))}
          </div>
        </>
      )}

      {stopped.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Stopped</h2>
          <div className="space-y-2">
            {stopped.map((m) => (
              <MedCard
                key={m.id}
                m={m}
                onEdit={() => { setEditing(m); setOpen(false); }}
                onRestart={() => updateEntry(m.id, { stopped: false })}
                onDelete={() => deleteEntry(m.id)}
              />
            ))}
          </div>
        </>
      )}

      {entries.length === 0 && <Card className="text-center text-[var(--ink-soft)]">No meds logged yet.</Card>}
    </AppShell>
  );
}

function MedCard({ m, onEdit, onStop, onRestart, onDelete }: { m: MedEntry; onEdit: () => void; onStop?: () => void; onRestart?: () => void; onDelete: () => void }) {
  const ex = m as unknown as MedExtra;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2">
            <Pill size={14} className="text-[var(--ink-soft)]" />
            <div className="font-semibold">{m.name}{m.dose && <span className="text-[var(--ink-soft)] font-normal"> · {m.dose}</span>}</div>
          </div>
          {m.reason && <div className="text-sm text-[var(--ink-soft)]">{m.reason}</div>}
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            Added {format(parseISO(m.createdAt), "d MMM, h:mm a")}
            {ex.purpose && <> · {ex.purpose}</>}
            {ex.helped && <> · helped: {ex.helped}</>}
          </div>
          {m.sideEffects && <div className="text-sm mt-1">Side effects: {m.sideEffects}</div>}
        </button>
        <div className="flex flex-col items-end gap-1">
          {onStop && <button onClick={onStop} className="text-xs text-[var(--alert)] font-medium">Stop</button>}
          {onRestart && <button onClick={onRestart} className="text-xs text-[var(--primary)] font-medium">Restart</button>}
          <button onClick={onDelete} className="text-[var(--ink-soft)] p-1" aria-label="Delete"><Trash2 size={16} /></button>
        </div>
      </div>
    </Card>
  );
}

function MedForm({ onDone, existing }: { onDone: () => void; existing?: MedEntry }) {
  const { addEntry, updateEntry, activePatientId } = useSession();
  const ex = existing as unknown as MedExtra | undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [dose, setDose] = useState(existing?.dose ?? "");
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [timeTaken, setTime] = useState(existing?.timeTaken ?? "");
  const [sideEffects, setSide] = useState(existing?.sideEffects ?? "");
  const [purpose, setPurpose] = useState<MedExtra["purpose"]>(ex?.purpose ?? "");
  const [helped, setHelped] = useState<MedExtra["helped"]>(ex?.helped ?? "");

  const { clear: clearDraft } = useDraft<Record<string, string>>({
    key: "/meds/new",
    href: "/meds",
    title: "Medication",
    patientId: activePatientId,
    state: { name, dose, reason, timeTaken, sideEffects, purpose: purpose ?? "", helped: helped ?? "" },
    onRestore: (d) => {
      if (existing) return;
      setName(d.name ?? "");
      setDose(d.dose ?? "");
      setReason(d.reason ?? "");
      setTime(d.timeTaken ?? "");
      setSide(d.sideEffects ?? "");
      setPurpose((d.purpose as MedExtra["purpose"]) ?? "");
      setHelped((d.helped as MedExtra["helped"]) ?? "");
    },
  });

  const pickCommon = (c: typeof COMMON_MEDS[number]) => {
    setName(c.name); setDose(c.dose); setReason(c.reason);
  };

  const save = async () => {
    if (!name) return;
    const payload = { name, dose, reason, timeTaken, sideEffects, purpose, helped };
    if (existing) {
      await updateEntry(existing.id, payload as Partial<MedEntry>);
    } else {
      await addEntry({ kind: "med", ...payload } as unknown as Omit<MedEntry, "id" | "createdAt">);
      clearDraft();
    }
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      <div>
        <div className="text-sm font-medium mb-2">Common meds — tap to pre-fill</div>
        <div className="flex flex-wrap gap-2">
          {COMMON_MEDS.map((c) => (
            <button key={c.name} type="button" onClick={() => pickCommon(c)}
              className="px-3 py-1.5 rounded-full text-xs border border-[var(--border)]">
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <Field label="Medicine"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dose"><TextInput value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 1g" /></Field>
        <Field label="Time taken"><TextInput value={timeTaken} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 8 am" /></Field>
      </div>
      <Field label="Why taking it"><TextInput value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div>
        <div className="text-sm font-medium mb-2">Type</div>
        <div className="flex gap-2">
          {([
            ["prophylaxis", "Prophylaxis"],
            ["regular", "Regular"],
            ["as-needed", "As needed"],
          ] as const).map(([val, label]) => {
            const on = purpose === val;
            return (
              <button key={val} type="button" onClick={() => setPurpose(on ? "" : val)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Did it help?</div>
        <div className="flex gap-2">
          {(["Yes","No","Not sure"] as const).map((opt) => {
            const on = helped === opt;
            return (
              <button key={opt} type="button" onClick={() => setHelped(on ? "" : opt)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Side effects (optional)"><TextArea value={sideEffects} onChange={(e) => setSide(e.target.value)} /></Field>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!name}>Save</Submit>
      </div>
    </Card>
  );
}
