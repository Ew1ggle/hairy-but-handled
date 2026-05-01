"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import {
  ESCALATION_NOTE,
  GLOBAL_LIMITATIONS,
  LAST_VERIFIED,
  REVIEW_INTERVAL_DAYS,
  SUPPORT_STEPS,
  type SupportStep,
} from "@/lib/supportProtocol";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Circle, ClipboardList, Phone, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** Per-step status — tracked locally so progress survives between
 *  visits. Not on the patient_entries table because the protocol
 *  belongs to the carer, not the medical record. localStorage is
 *  scoped to the browser, not the active patient — fine for this. */
type StepStatus = "not-started" | "in-progress" | "awaiting-response" | "complete" | "refused" | "not-applicable";

const STATUS_LABEL: Record<StepStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "awaiting-response": "Awaiting response",
  complete: "Complete",
  refused: "Refused (in writing)",
  "not-applicable": "Not applicable",
};

const STORAGE_KEY = "hbh-support-protocol-progress-v1";

type Progress = Record<string, { status: StepStatus; note?: string; updatedAt: string }>;

function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export default function SupportProtocolPage() {
  const [progress, setProgress] = useState<Progress>({});
  const [openStep, setOpenStep] = useState<string | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const setStatus = (id: string, status: StepStatus) => {
    setProgress((prev) => {
      const next = {
        ...prev,
        [id]: { ...prev[id], status, updatedAt: new Date().toISOString() },
      };
      saveProgress(next);
      return next;
    });
  };

  const setNote = (id: string, note: string) => {
    setProgress((prev) => {
      const next = {
        ...prev,
        [id]: { ...prev[id], status: prev[id]?.status ?? "not-started", note, updatedAt: new Date().toISOString() },
      };
      saveProgress(next);
      return next;
    });
  };

  const ordered = useMemo(() => SUPPORT_STEPS.slice().sort((a, b) => a.order - b.order), []);
  const counts = useMemo(() => {
    const c = { complete: 0, inflight: 0, notStarted: 0 };
    for (const s of ordered) {
      const st = progress[s.id]?.status ?? "not-started";
      if (st === "complete" || st === "not-applicable" || st === "refused") c.complete += 1;
      else if (st === "in-progress" || st === "awaiting-response") c.inflight += 1;
      else c.notStarted += 1;
    }
    return c;
  }, [ordered, progress]);

  const reviewDue = useMemo(() => {
    const verifiedDate = parseISO(LAST_VERIFIED);
    const daysOld = differenceInCalendarDays(new Date(), verifiedDate);
    return daysOld > REVIEW_INTERVAL_DAYS;
  }, []);

  return (
    <AppShell>
      <PageTitle sub="Practical financial + agency support — pragmatic checklist, no false reassurance.">
        Support protocol
      </PageTitle>

      <Card className="mb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-[var(--ink-soft)]">
            Last verified <b className="text-[var(--ink)]">{format(parseISO(LAST_VERIFIED), "d MMM yyyy")}</b>.
            Dollar amounts and policy details change. Cross-check the linked sources before acting.
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--primary)] font-semibold">
              <CheckCircle2 size={12} className="inline" /> {counts.complete} done
            </span>
            <span className="text-[var(--accent)] font-semibold">
              <Sparkles size={12} className="inline" /> {counts.inflight} in flight
            </span>
            <span className="text-[var(--ink-soft)]">
              <Circle size={12} className="inline" /> {counts.notStarted} to start
            </span>
          </div>
        </div>
      </Card>

      {reviewDue && (
        <Card className="mb-3 border-2 border-[var(--alert)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-[var(--alert)] shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-[var(--alert)] mb-0.5">Protocol content is more than a year old</div>
              <div className="text-[var(--ink-soft)]">
                Concession amounts, agency phone numbers, and policy details may have moved. Verify before relying on the figures here.
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-4 border-[var(--border)]">
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">
          Read these limitations first
        </div>
        <ul className="space-y-2 text-xs">
          {GLOBAL_LIMITATIONS.map((l, i) => (
            <li key={i}>
              <div className="font-semibold text-[var(--ink)]">{l.title}</div>
              <div className="text-[var(--ink-soft)]">{l.detail}</div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3 mb-6">
        {ordered.map((s) => (
          <StepCard
            key={s.id}
            step={s}
            status={progress[s.id]?.status ?? "not-started"}
            note={progress[s.id]?.note ?? ""}
            updatedAt={progress[s.id]?.updatedAt}
            isOpen={openStep === s.id}
            onToggle={() => setOpenStep((prev) => (prev === s.id ? null : s.id))}
            onStatus={(st) => setStatus(s.id, st)}
            onNote={(n) => setNote(s.id, n)}
          />
        ))}
      </div>

      <Card className="mb-6 border-2 border-[var(--alert)]">
        <div className="flex items-start gap-3">
          <ClipboardList size={18} className="text-[var(--alert)] shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-[var(--alert)] mb-0.5">{ESCALATION_NOTE.title}</div>
            <div className="text-[var(--ink-soft)] mb-1.5">{ESCALATION_NOTE.detail}</div>
            <a
              href={ESCALATION_NOTE.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--primary)] font-semibold"
            >
              {ESCALATION_NOTE.link.label} →
            </a>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}

function StepCard({
  step,
  status,
  note,
  updatedAt,
  isOpen,
  onToggle,
  onStatus,
  onNote,
}: {
  step: SupportStep;
  status: StepStatus;
  note: string;
  updatedAt?: string;
  isOpen: boolean;
  onToggle: () => void;
  onStatus: (s: StepStatus) => void;
  onNote: (n: string) => void;
}) {
  const isClosed = status === "complete" || status === "not-applicable" || status === "refused";
  const statusColor =
    status === "complete"
      ? "var(--primary)"
      : status === "refused" || status === "not-applicable"
        ? "var(--ink-soft)"
        : status === "in-progress" || status === "awaiting-response"
          ? "var(--accent)"
          : "var(--ink-soft)";
  return (
    <Card className={isClosed ? "opacity-80" : ""}>
      <button type="button" onClick={onToggle} className="w-full text-left flex items-start gap-3">
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: statusColor }}
        >
          {step.order}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{step.title}</div>
          <div className="text-xs text-[var(--ink-soft)] mt-0.5 flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] uppercase tracking-wider rounded-full px-1.5 py-0.5 font-semibold"
              style={{
                backgroundColor:
                  status === "complete" ? "var(--primary)"
                    : status === "in-progress" || status === "awaiting-response" ? "var(--accent)"
                      : status === "refused" ? "var(--alert)"
                        : "var(--surface-soft)",
                color: status === "not-started" || status === "not-applicable" ? "var(--ink-soft)" : "white",
              }}
            >
              {STATUS_LABEL[status]}
            </span>
            {updatedAt && <span>· updated {format(parseISO(updatedAt), "d MMM HH:mm")}</span>}
          </div>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-[var(--ink-soft)] shrink-0 mt-1" /> : <ChevronDown size={18} className="text-[var(--ink-soft)] shrink-0 mt-1" />}
      </button>
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Why this matters</div>
            <p className="text-[var(--ink)]">{step.why}</p>
          </div>

          {step.caveats && step.caveats.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Caveats</div>
              <ul className="text-xs space-y-1">
                {step.caveats.map((c, i) => (
                  <li key={i} className="text-[var(--ink-soft)]">· {c}</li>
                ))}
              </ul>
            </div>
          )}

          {step.asks && step.asks.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Asks / questions</div>
              <ul className="text-xs space-y-1">
                {step.asks.map((a, i) => (
                  <li key={i}>· {a}</li>
                ))}
              </ul>
            </div>
          )}

          {step.evidenceNeeded && step.evidenceNeeded.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Evidence to gather</div>
              <ul className="text-xs space-y-1">
                {step.evidenceNeeded.map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
              </ul>
            </div>
          )}

          {step.script && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Suggested wording</div>
              <pre className="text-xs whitespace-pre-wrap bg-[var(--surface-soft)] border border-[var(--border)] rounded-lg p-2.5">
                {step.script}
              </pre>
            </div>
          )}

          {step.contacts && step.contacts.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Contacts</div>
              <div className="flex flex-wrap gap-2">
                {step.contacts.map((c, i) => (
                  <a
                    key={i}
                    href={c.kind === "phone" ? `tel:${c.value}` : c.kind === "email" ? `mailto:${c.value}` : c.value}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium"
                  >
                    {c.kind === "phone" && <Phone size={12} />}
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {step.links && step.links.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Links</div>
              <ul className="text-xs space-y-1">
                {step.links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] font-medium underline-offset-2 hover:underline break-words">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Expected outcome</div>
            <ul className="text-xs space-y-1 text-[var(--ink-soft)]">
              {step.expectedOutcomes.map((o, i) => (
                <li key={i}>· {o}</li>
              ))}
            </ul>
            <div className="text-[11px] text-[var(--ink-soft)] mt-1.5 italic">
              Every contact should end with one of: <b>assists</b> · <b>defers</b> · <b>reduces cost</b> · <b>pays</b> · <b>refuses (in writing)</b>. No "we'll think about it" without a date attached.
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Status</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_LABEL) as StepStatus[]).map((st) => {
                const on = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onStatus(st)}
                    className={
                      on
                        ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                    }
                  >
                    {on ? "✓" : "+"} {STATUS_LABEL[st]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Notes</label>
            <textarea
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder="Reference numbers, names, dates, what they said, next action..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] resize-y"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
