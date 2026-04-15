"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type BloodResult } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function Bloods() {
  const entries = useEntries("bloods").slice().sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""));
  const [open, setOpen] = useState(false);
  const { deleteEntry } = useSession();

  return (
    <AppShell>
      <PageTitle sub="Add a row whenever new results come in. Trends show in the export.">
        Blood results
      </PageTitle>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5"
        >
          <Plus size={18} /> Add result
        </button>
      ) : (
        <NewBloodForm onDone={() => setOpen(false)} />
      )}

      {entries.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No results yet.</Card>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold">{format(parseISO(e.takenAt), "d MMM yyyy, h:mm a")}</div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-sm">
                  {e.hb != null && <Stat label="Hb" value={e.hb} />}
                  {e.wcc != null && <Stat label="WCC" value={e.wcc} />}
                  {e.neutrophils != null && <Stat label="Neuts" value={e.neutrophils} />}
                  {e.lymphocytes != null && <Stat label="Lymphs" value={e.lymphocytes} />}
                  {e.monocytes != null && <Stat label="Mono" value={e.monocytes} />}
                  {e.platelets != null && <Stat label="Plt" value={e.platelets} />}
                  {e.creatinine != null && <Stat label="Creat" value={e.creatinine} />}
                  {e.crp != null && <Stat label="CRP" value={e.crp} />}
                </div>
                {e.notes && <p className="text-sm text-[var(--ink-soft)] mt-2">{e.notes}</p>}
              </div>
              <button onClick={() => deleteEntry(e.id)} className="text-[var(--ink-soft)] p-1" aria-label="Delete">
                <Trash2 size={18} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function NewBloodForm({ onDone }: { onDone: () => void }) {
  const nowLocal = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const [takenAt, setTakenAt] = useState(nowLocal);
  const [v, setV] = useState({ hb: "", wcc: "", neutrophils: "", lymphocytes: "", monocytes: "", platelets: "", creatinine: "", crp: "" });
  const [notes, setNotes] = useState("");
  const num = (s: string) => (s === "" ? null : Number(s));
  const { addEntry } = useSession();

  const save = async () => {
    await addEntry({
      kind: "bloods",
      takenAt: new Date(takenAt).toISOString(),
      hb: num(v.hb), wcc: num(v.wcc), neutrophils: num(v.neutrophils),
      lymphocytes: num(v.lymphocytes), monocytes: num(v.monocytes),
      platelets: num(v.platelets), creatinine: num(v.creatinine), crp: num(v.crp),
      notes,
    } as Omit<BloodResult, "id" | "createdAt">);
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      <Field label="Date / time taken">
        <TextInput type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {(["hb","wcc","neutrophils","lymphocytes","monocytes","platelets","creatinine","crp"] as const).map((k) => (
          <Field key={k} label={k.toUpperCase()}>
            <TextInput type="number" inputMode="decimal" step="0.01" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      <Field label="Notes">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save}>Save</Submit>
      </div>
    </Card>
  );
}
