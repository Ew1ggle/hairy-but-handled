"use client";
import { Card, DateInput, TextArea } from "@/components/ui";
import type { DoctorUpdate, DoctorUpdateChange, DoctorUpdateChangeType } from "@/lib/store";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

/** Timeline of doctor / team updates during an admission or ED
 *  visit. Each row is a small inline-editable card with date + time
 *  (defaulting to now), doctor / team name, optional change-type
 *  array, and free-text update. Most-recent first so today's
 *  thinking is visible without scrolling.
 *
 *  The doctor field is a chip-picker built from the admitting team,
 *  ED-phase doctors logged on the row, the patient's care-team
 *  practitioners, and any doctor names already used in earlier
 *  updates — plus an "Other" chip that drops the user into the
 *  free-text input. */
export function DoctorUpdatesCard({
  updates,
  onChange,
  admittingTeam,
  edDoctors,
  careTeam,
}: {
  updates: DoctorUpdate[];
  onChange: (next: DoctorUpdate[]) => void;
  admittingTeam: string;
  edDoctors: string[];
  careTeam: { value: string; label: string; role?: string }[];
}) {
  const sorted = updates.slice().sort((a, b) => {
    const aKey = `${a.date}T${a.time}`;
    const bKey = `${b.date}T${b.time}`;
    return bKey.localeCompare(aKey);
  });
  const known = (() => {
    const seen = new Map<string, { value: string; label: string; role?: string }>();
    const add = (value: string | undefined, label?: string, role?: string) => {
      if (!value || !value.trim()) return;
      const key = value.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          value: value.trim(),
          label: (label ?? value).trim(),
          role,
        });
      }
    };
    add(admittingTeam);
    for (const m of careTeam) add(m.value, m.label, m.role);
    for (const d of edDoctors) add(d);
    for (const u of updates) add(u.doctor, undefined, u.doctorRole);
    return Array.from(seen.values());
  })();
  const addUpdate = () => {
    const now = new Date();
    onChange([
      ...updates,
      {
        id: crypto.randomUUID(),
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm"),
        doctor: "",
        update: "",
        detailsKnown: true,
      },
    ]);
  };
  const addUnknownChange = () => {
    const now = new Date();
    onChange([
      ...updates,
      {
        id: crypto.randomUUID(),
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm"),
        doctor: "",
        update: "",
        changeType: "plan-changed",
        detailsKnown: false,
      },
    ]);
  };
  const updateRow = (id: string, patch: Partial<DoctorUpdate>) => {
    onChange(updates.map((u) => u.id === id ? { ...u, ...patch } : u));
  };
  const removeRow = (id: string) => {
    onChange(updates.filter((u) => u.id !== id));
  };
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-semibold">Doctor / team updates</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addUnknownChange}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
            title="Log that something changed when you don't know what specifically"
          >
            ↔ Change · TBC
          </button>
          <button
            type="button"
            onClick={addUpdate}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
          >
            <Plus size={12} /> Log update
          </button>
        </div>
      </div>
      {updates.length === 0 ? (
        <div className="text-[11px] text-[var(--ink-soft)] bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5">
          Log each ward round, plan change, or conversation with the
          team here. Tap <b>Change · TBC</b> when you know something
          shifted but the team didn&apos;t tell you what — fill in
          the details once you find out.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((u) => (
            <div key={u.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Update
                  {u.detailsKnown === false && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-[var(--accent)] text-white px-1.5 py-0.5 text-[9px] font-bold">
                      Details TBC
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(u.id)}
                  className="text-[var(--ink-soft)] p-1 shrink-0"
                  aria-label="Remove update"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <DateInput
                  value={u.date}
                  onChange={(e) => updateRow(u.id, { date: e.target.value })}
                />
                <input
                  type="time"
                  value={u.time}
                  onChange={(e) => updateRow(u.id, { time: e.target.value })}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <DoctorPicker
                name={u.doctor ?? ""}
                role={u.doctorRole ?? ""}
                onChange={(name, role) => updateRow(u.id, { doctor: name, doctorRole: role })}
                known={known}
              />
              <DoctorUpdateChanges
                changes={u.changes ?? []}
                onChange={(changes) => updateRow(u.id, { changes })}
                legacyChangeType={u.changeType}
                legacyDetailsKnown={u.detailsKnown}
                onClearLegacy={() => updateRow(u.id, { changeType: undefined, detailsKnown: undefined })}
              />
              <button
                type="button"
                onClick={() => updateRow(u.id, { detailsKnown: !(u.detailsKnown ?? true) })}
                className={
                  u.detailsKnown === false
                    ? "rounded-full px-2.5 py-0.5 text-[10px] font-semibold border bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "rounded-full px-2.5 py-0.5 text-[10px] font-semibold border border-dashed border-[var(--border)] text-[var(--ink-soft)]"
                }
              >
                {u.detailsKnown === false ? "✓ Details TBC — fill in once known" : "+ Mark details TBC"}
              </button>
              <TextArea
                value={u.update}
                onChange={(e) => updateRow(u.id, { update: e.target.value })}
                placeholder={u.detailsKnown === false ? "Fill in once you find out what was changed" : "What was said — plan, results, next step…"}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const COMMON_DOCTOR_ROLES = [
  "Haematology consultant",
  "Haematology registrar",
  "Oncology consultant",
  "Oncology registrar",
  "ED consultant",
  "ED registrar",
  "Resident",
  "Intern",
  "Cancer care coordinator",
  "Nurse practitioner",
  "GP",
];

function DoctorPicker({
  name,
  role,
  onChange,
  known,
}: {
  name: string;
  role: string;
  onChange: (name: string, role: string) => void;
  known: { value: string; label: string; role?: string }[];
}) {
  const matchedChip = known.find((d) => name.trim() && d.value.toLowerCase() === name.trim().toLowerCase());
  return (
    <div className="space-y-1.5">
      {known.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {known.map((d) => {
            const on = matchedChip === d;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  if (on) onChange("", "");
                  else onChange(d.value, d.role ?? role);
                }}
                className={
                  on
                    ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                }
              >
                {on ? "✓" : "+"} {d.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              if (matchedChip) onChange("", role);
            }}
            className={
              !matchedChip && name.trim()
                ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
            }
          >
            {!matchedChip && name.trim() ? "✓" : "+"} Other
          </button>
        </div>
      )}
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value, role)}
        placeholder={
          known.length > 0
            ? "Doctor name (pick a chip or type)"
            : "Doctor name (e.g. Dr Patel)"
        }
        className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
      />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
          Role / position
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          {COMMON_DOCTOR_ROLES.map((r) => {
            const on = role.trim().toLowerCase() === r.toLowerCase();
            return (
              <button
                key={r}
                type="button"
                onClick={() => onChange(name, on ? "" : r)}
                className={
                  on
                    ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2 py-0.5 text-[11px] font-medium text-white"
                    : "rounded-lg border border-dashed border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--ink-soft)]"
                }
              >
                {on ? "✓" : "+"} {r}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={role}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder="Or type the role"
          className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
        />
      </div>
    </div>
  );
}

const CHANGE_TYPE_OPTIONS: { v: DoctorUpdateChangeType; l: string }[] = [
  { v: "med-added", l: "Med added" },
  { v: "med-stopped", l: "Med stopped" },
  { v: "med-switched", l: "Med switched" },
  { v: "dose-changed", l: "Dose changed" },
  { v: "frequency-changed", l: "Frequency changed" },
  { v: "plan-changed", l: "Plan changed" },
  { v: "other", l: "Other" },
];

const CHANGE_TYPE_LABEL: Record<DoctorUpdateChangeType, string> = Object.fromEntries(
  CHANGE_TYPE_OPTIONS.map((o) => [o.v, o.l]),
) as Record<DoctorUpdateChangeType, string>;

function DoctorUpdateChanges({
  changes,
  onChange,
  legacyChangeType,
  legacyDetailsKnown,
  onClearLegacy,
}: {
  changes: DoctorUpdateChange[];
  onChange: (next: DoctorUpdateChange[]) => void;
  legacyChangeType?: DoctorUpdateChangeType;
  legacyDetailsKnown?: boolean;
  onClearLegacy: () => void;
}) {
  const addChange = (preset?: DoctorUpdateChangeType) => {
    onChange([
      ...changes,
      { id: crypto.randomUUID(), type: preset, drug: "", details: "" },
    ]);
  };
  const updateChange = (id: string, patch: Partial<DoctorUpdateChange>) => {
    onChange(changes.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeChange = (id: string) => {
    onChange(changes.filter((c) => c.id !== id));
  };
  const migrateLegacy = () => {
    onChange([
      ...changes,
      { id: crypto.randomUUID(), type: legacyChangeType, drug: "", details: "" },
    ]);
    onClearLegacy();
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
          Changes ({changes.length})
        </div>
        <button
          type="button"
          onClick={() => addChange()}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]"
        >
          <Plus size={10} /> Add change
        </button>
      </div>
      {legacyChangeType && (
        <button
          type="button"
          onClick={migrateLegacy}
          className="w-full text-left text-[11px] text-[var(--accent)] font-semibold bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5"
        >
          Convert legacy &lsquo;{CHANGE_TYPE_LABEL[legacyChangeType]}&rsquo; tag into a change row
          {legacyDetailsKnown === false && " · TBC carries over"}
        </button>
      )}
      {changes.length === 0 && !legacyChangeType && (
        <div className="text-[11px] text-[var(--ink-soft)] bg-[var(--surface-soft)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5">
          Tap <b>Add change</b> for each thing the team did this round (med stopped, new med started, dose changed, etc). Drug name + details are optional — leave blank if you don&apos;t know.
        </div>
      )}
      {changes.map((c, idx) => (
        <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
              Change #{idx + 1}
              {c.type && (
                <span className="ml-1 normal-case text-[var(--ink)]">
                  · {CHANGE_TYPE_LABEL[c.type]}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => removeChange(c.id)}
              className="text-[var(--ink-soft)] p-1 shrink-0"
              aria-label="Remove change"
            >
              <Trash2 size={11} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {CHANGE_TYPE_OPTIONS.map(({ v, l }) => {
              const on = c.type === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateChange(c.id, { type: on ? undefined : v })}
                  className={
                    on
                      ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2 py-0.5 text-[11px] font-medium text-white"
                      : "rounded-lg border border-dashed border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--ink-soft)]"
                  }
                >
                  {on ? "✓" : "+"} {l}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={c.drug ?? ""}
            onChange={(e) => updateChange(c.id, { drug: e.target.value })}
            placeholder="Drug or thing changed (e.g. Tazocin / IV antibiotic / blank if unknown)"
            className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
          />
          <input
            type="text"
            value={c.details ?? ""}
            onChange={(e) => updateChange(c.id, { details: e.target.value })}
            placeholder="Details (e.g. increased to 1g BD, switched to oral, course finished)"
            className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
      ))}
      {changes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-[var(--ink-soft)] mr-1 self-center">Quick-add:</span>
          {([
            { v: "med-added" as const, l: "+ Med added" },
            { v: "med-stopped" as const, l: "+ Med stopped" },
            { v: "dose-changed" as const, l: "+ Dose changed" },
          ]).map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => addChange(v)}
              className="rounded-lg border border-dashed border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--ink-soft)]"
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
