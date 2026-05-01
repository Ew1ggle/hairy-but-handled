"use client";
import { DateInput } from "@/components/ui";
import { TreatmentPlanForm } from "@/components/TreatmentPlanForm";
import type { TreatmentCourse, TreatmentRow } from "@/lib/store";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

/** Common ED tests, imaging, and interventions for a hairy-cell-leukaemia
 *  patient. Imaging entries (CT, Xray, Ultrasound) are deliberately
 *  generic — the row's data-entry UI surfaces sub-pickers for areas
 *  and contrast, so we don't need a separate option per body site. The
 *  free-text "Add" path means anything not on this list can still be
 *  typed. Used by both /emergency and /admissions. */
export const TREATMENT_OPTIONS = [
  "Blood Cultures",
  "Complete Blood Count",
  "Kidney and Liver Tests",
  "Coagulation (INR/APTT)",
  "Group and Hold / Crossmatch",
  "Lactate",
  "Blood Gas (VBG/ABG)",
  "CRP",
  "Procalcitonin",
  "Urine Testing",
  "Urine MCS",
  "Sputum Culture",
  "Wound Swab",
  "Throat Swab",
  "Nasopharyngeal Swab (COVID/Flu/RSV)",
  "ECG",
  "CT",
  "Xray",
  "Ultrasound",
  "Echocardiogram",
  "IV Fluids",
  "Oral Panadol",
  "IV Paracetamol",
  "IV Anti-emetic",
  "IV Steroids",
  "Antibiotics (Oral)",
  "Antibiotics (IV)",
  "Antiviral / Antifungal",
  "Red Blood Cell Transfusion",
  "Platelet Transfusion",
  "FFP / Cryoprecipitate",
  "IV Immunoglobulin (IVIG)",
  "Neutrophil-stimulating injection (G-CSF)",
  "Oxygen Therapy",
  "Reverse Isolation Room",
  "Splenectomy Review",
  "Other",
];

/** Body areas common in ED imaging — drives the multi-select that
 *  appears on CT / Xray / Ultrasound treatment rows so a single row
 *  captures e.g. "Chest + Abdomen + Pelvis" without needing three. */
export const IMAGING_AREAS = [
  "Head", "Neck", "Chest", "Abdomen", "Pelvis", "Spine", "Limb", "Spleen", "Other",
];

/** Common bloodstream pathogens — feeds the "select organism" search on
 *  Blood Culture rows once a positive result is reported. Free text is
 *  always allowed via the input itself. */
export const COMMON_ORGANISMS = [
  "E. coli",
  "Staphylococcus aureus (MSSA)",
  "Staphylococcus aureus (MRSA)",
  "Coagulase-negative Staphylococcus",
  "Streptococcus pneumoniae",
  "Streptococcus pyogenes",
  "Enterococcus faecalis",
  "Enterococcus faecium (VRE)",
  "Klebsiella pneumoniae",
  "Pseudomonas aeruginosa",
  "Enterobacter cloacae",
  "Candida albicans",
  "Candida glabrata",
  "Listeria monocytogenes",
  "No growth (negative)",
  "Contaminant (skin flora)",
];

export const isImagingTreatment = (name: string) =>
  /^(ct|x[\s-]?ray|ultrasound)\b/i.test(name.trim());
export const isCtTreatment = (name: string) => /^ct\b/i.test(name.trim());
export const isCultureTreatment = (name: string) => /blood\s*culture/i.test(name);
export const isCourseTreatment = (name: string) =>
  /antibiotic|antiviral|antifungal|panadol|paracetamol|anti[\s-]?emetic|steroid/i.test(name);

/** Editor for a single treatment row. The shape of the data-entry UI
 *  shifts based on the treatment name:
 *   - Imaging (CT/Xray/Ultrasound): area multi-select + contrast toggle
 *     (CT only). Areas pile into details if needed but live structurally
 *     on row.areas / row.contrast.
 *   - Blood cultures: count description + organism search.
 *   - Medication-style (antibiotics, panadol, anti-emetic, steroid):
 *     per-course log so a single row covers multiple administrations.
 *     Plus an "Add plan" path that auto-generates courses from a
 *     frequency × duration spec.
 *   - Anything else: just details + result.
 *  Result textarea is always visible because every treatment can come
 *  back with a result (negative bloods, "no acute findings", etc.). */
export function TreatmentRowEditor({
  row,
  onChange,
  onRemove,
}: {
  row: TreatmentRow;
  onChange: (patch: Partial<TreatmentRow>) => void;
  onRemove: () => void;
}) {
  const isImaging = isImagingTreatment(row.treatment);
  const isCt = isCtTreatment(row.treatment);
  const isCulture = isCultureTreatment(row.treatment);
  const isCourseMed = isCourseTreatment(row.treatment);
  const isOther = row.treatment.trim().toLowerCase() === "other";

  const [organismSearch, setOrganismSearch] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const filteredOrganisms = organismSearch
    ? COMMON_ORGANISMS.filter((o) => o.toLowerCase().includes(organismSearch.toLowerCase()))
    : COMMON_ORGANISMS;

  const toggleArea = (area: string) => {
    const cur = row.areas ?? [];
    onChange({ areas: cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area] });
  };

  const addCourse = () => {
    const courses = row.courses ?? [];
    const nextNumber = courses.length + 1;
    // Inherit from the LAST course's name when one exists (so a drug
    // switch carries through subsequent courses). For the FIRST
    // course leave the name blank — pre-filling with the parent
    // category ("Antibiotics (IV)") tags rows by category rather
    // than the actual drug given.
    const lastName = courses.length > 0 ? courses[courses.length - 1].name : "";
    onChange({
      courses: [
        ...courses,
        {
          id: crypto.randomUUID(),
          name: lastName,
          // Time blank by default — most administrations get logged
          // after the fact. CourseTimingFields surfaces a "Time
          // known" checkbox that reveals the picker when needed.
          details: `Course ${nextNumber}`,
        } as TreatmentCourse,
      ],
    });
  };

  const courseSummary = (() => {
    const courses = row.courses ?? [];
    if (courses.length === 0) return "";
    const groups: { name: string; count: number }[] = [];
    for (const c of courses) {
      const last = groups[groups.length - 1];
      if (last && last.name === c.name) last.count += 1;
      else groups.push({ name: c.name, count: 1 });
    }
    return groups.map((g) => `${g.count} × ${g.name}`).join(" → ");
  })();
  const updateCourse = (id: string, patch: Partial<TreatmentCourse>) => {
    onChange({
      courses: (row.courses ?? []).map((c) => c.id === id ? { ...c, ...patch } : c),
    });
  };
  const removeCourse = (id: string) => {
    onChange({ courses: (row.courses ?? []).filter((c) => c.id !== id) });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          {row.treatment}
          {isOther && <span className="ml-1 text-[var(--ink-soft)] font-normal">(custom)</span>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[var(--ink-soft)] p-1 shrink-0"
          aria-label={`Remove ${row.treatment}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {isOther && (
        <input
          type="text"
          value={row.treatment === "Other" ? "" : row.treatment}
          onChange={(e) => onChange({ treatment: e.target.value || "Other" })}
          placeholder="Name this treatment (e.g. Lumbar puncture)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
        />
      )}

      {isImaging && (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-[var(--ink-soft)] mb-1">Areas scanned</div>
            <div className="flex flex-wrap gap-1.5">
              {IMAGING_AREAS.map((a) => {
                const on = (row.areas ?? []).includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleArea(a)}
                    className={
                      on
                        ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                    }
                  >
                    {on ? "✓" : "+"} {a}
                  </button>
                );
              })}
            </div>
          </div>
          {isCt && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!row.contrast}
                onChange={(e) => onChange({ contrast: e.target.checked })}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span>Contrast administered</span>
            </label>
          )}
        </div>
      )}

      {isCulture && (
        <div className="space-y-2">
          <input
            type="text"
            value={row.count ?? ""}
            onChange={(e) => onChange({ count: e.target.value })}
            placeholder="Count description (e.g. 6 sets, 2 peripheral + 1 line)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          <div>
            <div className="text-xs text-[var(--ink-soft)] mb-1">
              Organism / result {row.organism && <span className="text-[var(--primary)] font-semibold">— {row.organism}</span>}
            </div>
            <div className="relative">
              <input
                type="text"
                value={organismSearch || row.organism || ""}
                onChange={(e) => {
                  setOrganismSearch(e.target.value);
                  // Free-text fallback: persist whatever the user typed
                  // so the field isn't blanked when they don't pick
                  // from the list.
                  onChange({ organism: e.target.value });
                }}
                placeholder="Search organisms or type your own…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              {organismSearch && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredOrganisms.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        onChange({ organism: o });
                        setOrganismSearch("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-soft)] border-b border-[var(--border)] last:border-0"
                    >
                      {o}
                    </button>
                  ))}
                  {filteredOrganisms.length === 0 && (
                    <div className="px-3 py-2 text-sm text-[var(--ink-soft)]">No matches — your typed value will be saved as-is.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCourseMed && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-[var(--ink-soft)]">
              Courses ({(row.courses ?? []).length})
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPlan((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
              >
                {showPlan ? "Close plan" : "Add plan"}
              </button>
              <button
                type="button"
                onClick={addCourse}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
              >
                <Plus size={12} /> Add course
              </button>
            </div>
          </div>
          {showPlan && (
            <TreatmentPlanForm
              defaultDrugName={
                (row.courses ?? []).length > 0
                  ? row.courses![row.courses!.length - 1].name
                  : ""
              }
              defaultDose={row.details}
              onGenerate={(generated, replaceExisting) => {
                onChange({
                  courses: replaceExisting
                    ? generated
                    : [...(row.courses ?? []), ...generated],
                });
                setShowPlan(false);
              }}
              onCancel={() => setShowPlan(false)}
            />
          )}
          {(row.courses ?? []).length === 0 && !showPlan && (
            <div className="text-[11px] text-[var(--ink-soft)] bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5">
              Each course is one administration. Type the drug name on
              the first one — subsequent courses inherit it. Or tap{" "}
              <b>Add plan</b> to generate a whole schedule (e.g. Tazocin
              q6h × 5 days = 20 courses) in one go.
            </div>
          )}
          {courseSummary && (
            <div className="text-[11px] text-[var(--ink)] bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 font-medium">
              {courseSummary}
              <span className="text-[var(--ink-soft)] font-normal">
                {" "}— change a course&apos;s drug name to record a switch; new courses inherit the previous name.
              </span>
            </div>
          )}
          {(row.courses ?? []).map((c, idx) => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold shrink-0">
                  Course #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCourse(c.id)}
                  className="text-[var(--ink-soft)] p-1 shrink-0"
                  aria-label={`Remove course ${idx + 1}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
                  Drug name
                </label>
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => updateCourse(c.id, { name: e.target.value })}
                  placeholder="e.g. Amoxicillin, Augmentin, Tazocin"
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <CourseTimingFields course={c} onChange={(patch) => updateCourse(c.id, patch)} />
              <input
                type="text"
                value={c.details ?? ""}
                onChange={(e) => updateCourse(c.id, { details: e.target.value })}
                placeholder="Dose / route / notes"
                className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={row.details}
        onChange={(e) => onChange({ details: e.target.value })}
        placeholder={
          isImaging ? "Findings, indication, ordering doctor..."
            : isCulture ? "Site / time / additional context..."
              : "Details (dose, route, time...)"
        }
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
      />
      <textarea
        value={row.result ?? ""}
        onChange={(e) => onChange({ result: e.target.value })}
        placeholder="Result (leave blank if pending)"
        rows={2}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] resize-y"
      />
    </div>
  );
}

/** Date + optional time fields for a treatment course. The time input
 *  is hidden behind a "Time known" checkbox because most courses get
 *  logged after the fact and the user often doesn't know the exact
 *  time. Ticking the box reveals the picker (defaults to now);
 *  un-ticking clears it. */
export function CourseTimingFields({
  course,
  onChange,
}: {
  course: TreatmentCourse;
  onChange: (patch: Partial<TreatmentCourse>) => void;
}) {
  const [timeKnown, setTimeKnown] = useState<boolean>(!!course.time);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <DateInput
          value={course.date ?? ""}
          onChange={(e) => onChange({ date: e.target.value })}
        />
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={timeKnown}
            onChange={(e) => {
              setTimeKnown(e.target.checked);
              if (!e.target.checked) onChange({ time: undefined });
              else if (!course.time) onChange({ time: format(new Date(), "HH:mm") });
            }}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          <span>Time known</span>
        </label>
      </div>
      {timeKnown && (
        <input
          type="time"
          value={course.time ?? ""}
          onChange={(e) => onChange({ time: e.target.value })}
          className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
        />
      )}
    </div>
  );
}
