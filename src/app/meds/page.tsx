"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type MedEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function Meds() {
  const entries = useEntries("med").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [open, setOpen] = useState(false);
  const { deleteEntry } = useSession();

  return (
    <AppShell>
      <PageTitle sub="Current medications, prophylaxis, and as-needed.">
        Medications
      </PageTitle>

      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5">
          <Plus size={18} /> Add medication
        </button>
      ) : (
        <NewMedForm onDone={() => setOpen(false)} />
      )}

      {entries.length === 0 && <Card className="text-center text-[var(--ink-soft)]">No meds logged yet.</Card>}

      <div className="space-y-2">
        {entries.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold">{m.name}{m.dose && <span className="text-[var(--ink-soft)] font-normal"> · {m.dose}</span>}</div>
                {m.reason && <div className="text-sm text-[var(--ink-soft)]">{m.reason}</div>}
                <div className="text-xs text-[var(--ink-soft)] mt-1">Added {format(parseISO(m.createdAt), "d MMM, h:mm a")}</div>
                {m.sideEffects && <div className="text-sm mt-1">Side effects: {m.sideEffects}</div>}
                {m.stopped && <div className="text-xs text-[var(--alert)] mt-1">Stopped</div>}
              </div>
              <button onClick={() => deleteEntry(m.id)} className="text-[var(--ink-soft)] p-1" aria-label="Delete">
                <Trash2 size={18} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function NewMedForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [reason, setReason] = useState("");
  const [timeTaken, setTime] = useState("");
  const [sideEffects, setSide] = useState("");

  const { addEntry } = useSession();
  const save = async () => {
    if (!name) return;
    await addEntry({ kind: "med", name, dose, reason, timeTaken, sideEffects } as Omit<MedEntry, "id" | "createdAt">);
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      <Field label="Medicine"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol" /></Field>
      <Field label="Dose"><TextInput value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 1g" /></Field>
      <Field label="Why taking it"><TextInput value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Field label="Time taken"><TextInput value={timeTaken} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 8 am" /></Field>
      <Field label="Side effects"><TextArea value={sideEffects} onChange={(e) => setSide(e.target.value)} /></Field>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!name}>Save</Submit>
      </div>
    </Card>
  );
}
