"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type BloodResult } from "@/lib/store";
import { useSession } from "@/lib/session";
import { loadDraft, useDraft } from "@/lib/drafts";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { FileUpload, AttachmentList, type Attachment } from "@/components/FileUpload";

type Key = "hb" | "wcc" | "neutrophils" | "lymphocytes" | "monocytes" | "platelets" | "creatinine" | "crp";

const FIELDS: { key: Key; label: string; hint: string }[] = [
  { key: "hb", label: "Hb (haemoglobin)", hint: "g/L · female ~115–165, male ~130–175" },
  { key: "wcc", label: "WCC (white cells)", hint: "×10⁹/L · ~4.0–11.0" },
  { key: "neutrophils", label: "Neutrophils", hint: "×10⁹/L · ~2.0–7.5 — lower = infection risk" },
  { key: "lymphocytes", label: "Lymphocytes", hint: "×10⁹/L · ~1.0–4.0" },
  { key: "monocytes", label: "Monocytes", hint: "×10⁹/L · ~0.2–0.8" },
  { key: "platelets", label: "Platelets", hint: "×10⁹/L · ~150–400 — lower = bleeding risk" },
  { key: "creatinine", label: "Creatinine", hint: "µmol/L · ~45–90 (women) · kidney function" },
  { key: "crp", label: "CRP", hint: "mg/L · <5 typical · higher = inflammation / infection" },
];

const INTERPRETATIONS = [
  "Expected treatment effect",
  "Worse than expected",
  "Bleeding risk",
  "Infection risk",
  "Transfusion may be needed",
];

export default function Bloods() {
  const entries = useEntries("bloods").slice().sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BloodResult | null>(null);
  const { deleteEntry, activePatientId } = useSession();

  // Auto-open form when an unsaved draft exists, so the home-page
  // 'Unfinished: Blood results' flag lands on a form ready to finish.
  useEffect(() => {
    if (!activePatientId) return;
    if (loadDraft("/bloods/new", activePatientId)) setOpen(true);
  }, [activePatientId]);

  return (
    <AppShell>
      <PageTitle sub="Add a row whenever new results come in. Trend arrows show compared to the last result.">
        Blood results
      </PageTitle>

      {editing ? (
        <BloodForm
          existing={editing}
          onDone={() => setEditing(null)}
          previous={entries.find((e) => e.id !== editing.id)}
        />
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5"
        >
          <Plus size={18} /> Add result
        </button>
      ) : (
        <BloodForm onDone={() => setOpen(false)} previous={entries[0]} />
      )}

      {entries.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No results yet.</Card>
      )}

      <div className="space-y-2">
        {entries.map((e, idx) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => { setEditing(e); setOpen(false); }}
                className="flex-1 text-left active:opacity-70 transition"
              >
                <div className="font-semibold">{format(parseISO(e.takenAt), "d MMM yyyy, h:mm a")}</div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-sm">
                  {FIELDS.map((f) => {
                    const v = e[f.key];
                    if (v == null) return null;
                    const prev = entries[idx + 1]?.[f.key];
                    return <Stat key={f.key} label={f.label.split(" ")[0]} value={v as number} prev={prev as number | null | undefined} />;
                  })}
                </div>
                {Array.isArray((e as unknown as { flags?: string[] }).flags) &&
                  ((e as unknown as { flags?: string[] }).flags?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(e as unknown as { flags?: string[] }).flags!.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-soft)]">{t}</span>
                    ))}
                  </div>
                )}
                {e.notes && <p className="text-sm text-[var(--ink-soft)] mt-2">{e.notes}</p>}
                <AttachmentList attachments={(e as unknown as { attachments?: Attachment[] }).attachments ?? []} />
              </button>
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

function Stat({ label, value, prev }: { label: string; value: number; prev?: number | null }) {
  const Icon = prev == null ? null : value > prev ? TrendingUp : value < prev ? TrendingDown : Minus;
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div className="font-semibold tabular-nums flex items-center gap-1">
        {value}
        {Icon && <Icon size={12} className="text-[var(--ink-soft)]" />}
      </div>
    </div>
  );
}

function BloodForm({ onDone, previous, existing }: { onDone: () => void; previous?: BloodResult; existing?: BloodResult }) {
  const { addEntry, updateEntry, activePatientId } = useSession();
  const nowLocal = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const stringify = (n: number | null | undefined) => (n == null ? "" : String(n));
  const [takenAt, setTakenAt] = useState(existing ? format(parseISO(existing.takenAt), "yyyy-MM-dd'T'HH:mm") : nowLocal);
  const [v, setV] = useState<Record<Key, string>>(existing
    ? {
        hb: stringify(existing.hb), wcc: stringify(existing.wcc), neutrophils: stringify(existing.neutrophils),
        lymphocytes: stringify(existing.lymphocytes), monocytes: stringify(existing.monocytes),
        platelets: stringify(existing.platelets), creatinine: stringify(existing.creatinine), crp: stringify(existing.crp),
      }
    : { hb: "", wcc: "", neutrophils: "", lymphocytes: "", monocytes: "", platelets: "", creatinine: "", crp: "" });
  const [flags, setFlags] = useState<string[]>(((existing as unknown as { flags?: string[] } | undefined)?.flags) ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(((existing as unknown as { attachments?: Attachment[] } | undefined)?.attachments) ?? []);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const num = (s: string) => (s === "" ? null : Number(s));

  const { clear: clearDraft } = useDraft<{ takenAt: string; v: Record<Key, string>; flags: string[]; notes: string }>({
    key: "/bloods/new",
    href: "/bloods",
    title: "Blood results",
    patientId: activePatientId,
    state: { takenAt, v, flags, notes },
    onRestore: (d) => {
      if (existing) return;
      if (d.takenAt) setTakenAt(d.takenAt);
      if (d.v) setV(d.v);
      if (d.flags) setFlags(d.flags);
      if (d.notes) setNotes(d.notes);
      setHasRestoredDraft(true);
    },
  });

  const save = async () => {
    const payload = {
      takenAt: new Date(takenAt).toISOString(),
      hb: num(v.hb), wcc: num(v.wcc), neutrophils: num(v.neutrophils),
      lymphocytes: num(v.lymphocytes), monocytes: num(v.monocytes),
      platelets: num(v.platelets), creatinine: num(v.creatinine), crp: num(v.crp),
      notes,
      flags,
      attachments,
    };
    if (existing) {
      await updateEntry(existing.id, payload as Partial<BloodResult>);
    } else {
      await addEntry({ kind: "bloods", ...payload } as unknown as Omit<BloodResult, "id" | "createdAt">);
      clearDraft();
    }
    onDone();
  };

  const discardDraft = () => {
    clearDraft();
    onDone();
  };

  return (
    <Card className="space-y-4 mb-5">
      {hasRestoredDraft && !existing && (
        <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-2 flex items-center gap-2">
          <div className="text-xs flex-1">
            <span className="font-semibold">Restored from where you left off.</span>
            <span className="text-[var(--ink-soft)]"> Save when ready, or discard if you don&apos;t want it.</span>
          </div>
          <button type="button" onClick={discardDraft} className="shrink-0 text-xs font-medium text-[var(--alert)]">
            Discard
          </button>
        </div>
      )}
      <Field label="Date / time taken">
        <TextInput type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
      </Field>
      <div className="space-y-3">
        {FIELDS.map((f) => {
          const prev = previous?.[f.key];
          return (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <div className="flex items-center gap-2">
                <TextInput type="number" inputMode="decimal" step="0.01" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                {prev != null && (
                  <span className="text-xs text-[var(--ink-soft)] whitespace-nowrap">last: {prev as number}</span>
                )}
              </div>
            </Field>
          );
        })}
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Flags the team should notice (optional)</div>
        <div className="flex flex-wrap gap-2">
          {INTERPRETATIONS.map((t) => {
            const on = flags.includes(t);
            return (
              <button key={t} type="button"
                onClick={() => setFlags(on ? flags.filter((x) => x !== t) : [...flags, t])}
                className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Notes">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. what the haematologist said about this set" />
      </Field>
      <FileUpload attachments={attachments} onChange={setAttachments} label="Attach report (photo or PDF)" />
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save}>Save</Submit>
      </div>
    </Card>
  );
}
