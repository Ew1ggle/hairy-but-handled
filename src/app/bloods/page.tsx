"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type BloodResult, type FlagEvent } from "@/lib/store";
import { useSession } from "@/lib/session";
import { loadDraft, useDraft } from "@/lib/drafts";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { FileUpload, AttachmentList, type Attachment } from "@/components/FileUpload";

type Key =
  | "hb" | "rbc" | "hct" | "mcv" | "mch" | "mchc" | "rdw"
  | "wcc" | "neutrophils" | "lymphocytes" | "monocytes" | "eosinophils" | "basophils"
  | "platelets" | "creatinine" | "crp";

/** Field group on the bloods form. Grouping keeps the FBC indices
 *  visually together so a carer typing from a printed report can
 *  scan top-to-bottom in the same order. */
type FieldGroup = "red" | "white" | "platelets" | "chemistry";

const FIELDS: { key: Key; label: string; hint: string; group: FieldGroup }[] = [
  // Red cell line — Hb is the headline. The indices fill in the
  // 'what kind of anaemia' picture when Hb is borderline.
  { key: "hb", label: "Hb (haemoglobin)", hint: "g/L · female ~115–165, male ~130–175", group: "red" },
  { key: "rbc", label: "RBC (red cell count)", hint: "×10¹²/L · female ~3.9–5.0, male ~4.5–5.9", group: "red" },
  { key: "hct", label: "Hct (haematocrit)", hint: "% or fraction · female ~0.36–0.46, male ~0.40–0.50", group: "red" },
  { key: "mcv", label: "MCV (mean cell volume)", hint: "fL · ~80–100 — small = iron-deficient, large = B12/folate", group: "red" },
  { key: "mch", label: "MCH (mean cell Hb)", hint: "pg · ~27–33", group: "red" },
  { key: "mchc", label: "MCHC (Hb concentration)", hint: "g/L · ~315–355", group: "red" },
  { key: "rdw", label: "RDW (red cell width)", hint: "% · ~11.5–14.5 — high = mixed RBC sizes", group: "red" },
  // White cell line — total WCC + differential.
  { key: "wcc", label: "WCC (white cells)", hint: "×10⁹/L · ~4.0–11.0", group: "white" },
  { key: "neutrophils", label: "Neutrophils", hint: "×10⁹/L · ~2.0–7.5 — lower = infection risk", group: "white" },
  { key: "lymphocytes", label: "Lymphocytes", hint: "×10⁹/L · ~1.0–4.0", group: "white" },
  { key: "monocytes", label: "Monocytes", hint: "×10⁹/L · ~0.2–0.8", group: "white" },
  { key: "eosinophils", label: "Eosinophils", hint: "×10⁹/L · ~0.04–0.4 — high = allergy / drug reaction / parasite", group: "white" },
  { key: "basophils", label: "Basophils", hint: "×10⁹/L · ~0.0–0.1 — small population, rarely abnormal", group: "white" },
  // Platelets + chemistry / inflammation.
  { key: "platelets", label: "Platelets", hint: "×10⁹/L · ~150–400 — lower = bleeding risk", group: "platelets" },
  { key: "creatinine", label: "Creatinine", hint: "µmol/L · ~45–90 (women) · kidney function", group: "chemistry" },
  { key: "crp", label: "CRP", hint: "mg/L · <5 typical · higher = inflammation / infection", group: "chemistry" },
];

const GROUP_LABEL: Record<FieldGroup, string> = {
  red: "Red cell line",
  white: "White cell line + differential",
  platelets: "Platelets",
  chemistry: "Chemistry + inflammation",
};

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

  // Auto-open only when arriving via the home-page Unfinished link
  // (which appends ?continue=1). Direct nav shows the list view.
  useEffect(() => {
    if (typeof window === "undefined" || !activePatientId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("continue") !== "1") return;
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
  // Build the values dict from the FIELDS schema so adding a new
  // key (e.g. eosinophils, mch) flows through automatically without
  // having to update the literal object below.
  const [v, setV] = useState<Record<Key, string>>(() => {
    const init = {} as Record<Key, string>;
    for (const f of FIELDS) {
      init[f.key] = stringify(existing?.[f.key]);
    }
    return init;
  });
  const [flags, setFlags] = useState<string[]>(((existing as unknown as { flags?: string[] } | undefined)?.flags) ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  // Viral surveillance — strings rather than numbers because results
  // arrive as detection/no-detection / qualitative readings as often
  // as actual copy counts. eviQ 1382: HBV DNA monthly while on
  // rituximab + entecavir/tenofovir suppression.
  const [hbvDna, setHbvDna] = useState<string>(existing?.hbvDna ?? "");
  const [cmvPcr, setCmvPcr] = useState<string>(existing?.cmvPcr ?? "");
  const [ebvPcr, setEbvPcr] = useState<string>(existing?.ebvPcr ?? "");
  const [hbsAg, setHbsAg] = useState<string>(existing?.hbsAg ?? "");
  const [antiHbc, setAntiHbc] = useState<string>(existing?.antiHbc ?? "");
  const [antiHbs, setAntiHbs] = useState<string>(existing?.antiHbs ?? "");
  const [showViral, setShowViral] = useState<boolean>(
    !!(existing?.hbvDna || existing?.cmvPcr || existing?.ebvPcr || existing?.hbsAg || existing?.antiHbc || existing?.antiHbs),
  );
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
    // Build the numeric payload from the FIELDS schema so additions
    // (e.g. eosinophils, mch) sync automatically.
    const numericPayload: Partial<Record<Key, number | null>> = {};
    for (const f of FIELDS) {
      numericPayload[f.key] = num(v[f.key]);
    }
    const payload = {
      takenAt: new Date(takenAt).toISOString(),
      ...numericPayload,
      notes,
      flags,
      attachments,
      hbvDna: hbvDna.trim() || undefined,
      cmvPcr: cmvPcr.trim() || undefined,
      ebvPcr: ebvPcr.trim() || undefined,
      hbsAg: hbsAg.trim() || undefined,
      antiHbc: antiHbc.trim() || undefined,
      antiHbs: antiHbs.trim() || undefined,
    };
    if (existing) {
      await updateEntry(existing.id, payload as Partial<BloodResult>);
    } else {
      await addEntry({ kind: "bloods", ...payload } as unknown as Omit<BloodResult, "id" | "createdAt">);
      clearDraft();
      // Auto-fire Tripwire flags when key cytopenias hit clinically
      // significant thresholds. Compares the new result against
      // `previous` (most recent prior bloods) so a single low value
      // out of context still flags. Each flag is created once per
      // entry — the entry id ties them together. Carer can dismiss
      // any false positives on /ed-triggers.
      const newHb = num(v.hb);
      const newNeut = num(v.neutrophils);
      const newPlt = num(v.platelets);
      const flagsToFire: string[] = [];
      if (newNeut != null && newNeut < 0.5) {
        flagsToFire.push(`Neutrophils ${newNeut} — severe neutropenia (<0.5)`);
      }
      if (newPlt != null && newPlt < 20) {
        flagsToFire.push(`Platelets ${newPlt} — bleeding risk (<20)`);
      }
      if (newHb != null && newHb < 70) {
        flagsToFire.push(`Hb ${newHb} — transfusion threshold (<70)`);
      }
      if (newHb != null && previous?.hb != null && previous.hb - newHb >= 20) {
        flagsToFire.push(`Hb dropped ${previous.hb} → ${newHb} since last bloods`);
      }
      for (const label of flagsToFire) {
        await addEntry({
          kind: "flag",
          triggerLabel: label,
        } as unknown as Omit<FlagEvent, "id" | "createdAt">);
      }
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
      {/* Group the fields by FBC line so the carer typing from a
           printed report scans top-to-bottom in the same order
           (red cells → white cells + diff → platelets → chemistry).
           Each group is collapsed under a small heading so the form
           doesn't read as one long undifferentiated wall of inputs. */}
      <div className="space-y-4">
        {(["red", "white", "platelets", "chemistry"] as const).map((group) => {
          const groupFields = FIELDS.filter((f) => f.group === group);
          if (groupFields.length === 0) return null;
          return (
            <div key={group} className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                {GROUP_LABEL[group]}
              </div>
              <div className="space-y-3">
                {groupFields.map((f) => {
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
            </div>
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
      <div>
        <button
          type="button"
          onClick={() => setShowViral((v) => !v)}
          className="text-xs font-semibold text-[var(--primary)]"
        >
          {showViral ? "Hide viral surveillance" : "+ Viral surveillance (HBV / CMV / EBV)"}
        </button>
        {showViral && (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-2">
            <div className="text-[11px] text-[var(--ink-soft)]">
              For HCL on cladribine + rituximab — HBV reactivation risk and CMV reactivation are the classical surveillance items. Free text so detection/no-detection / qualitative readings fit.
            </div>
            <Field label="HBV DNA">
              <TextInput value={hbvDna} onChange={(e) => setHbvDna(e.target.value)} placeholder="e.g. <10 IU/mL · not detected" />
            </Field>
            <Field label="CMV PCR">
              <TextInput value={cmvPcr} onChange={(e) => setCmvPcr(e.target.value)} placeholder="e.g. not detected · 1240 copies/mL" />
            </Field>
            <Field label="EBV PCR (when requested)">
              <TextInput value={ebvPcr} onChange={(e) => setEbvPcr(e.target.value)} placeholder="not detected" />
            </Field>
            <div className="text-[11px] text-[var(--ink-soft)] pt-1">Baseline serology — usually one-off at start of treatment.</div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="HBsAg"><TextInput value={hbsAg} onChange={(e) => setHbsAg(e.target.value)} placeholder="neg" /></Field>
              <Field label="anti-HBc"><TextInput value={antiHbc} onChange={(e) => setAntiHbc(e.target.value)} placeholder="neg" /></Field>
              <Field label="anti-HBs"><TextInput value={antiHbs} onChange={(e) => setAntiHbs(e.target.value)} placeholder=">10" /></Field>
            </div>
          </div>
        )}
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
