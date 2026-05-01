"use client";
import { DateInput } from "@/components/ui";
import { TreatmentPlanForm } from "@/components/TreatmentPlanForm";
import type { BloodCultureEntry, TreatmentCourse, TreatmentRow } from "@/lib/store";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

/** Common ED tests, imaging, and interventions for a hairy-cell-leukaemia
 *  patient. Imaging entries (CT, Xray, Ultrasound) are deliberately
 *  generic — the row's data-entry UI surfaces sub-pickers for areas
 *  and contrast, so we don't need a separate option per body site. The
 *  free-text "Add" path means anything not on this list can still be
 *  typed. Used by both /emergency and /admissions. */
/** Tests / investigations — bloods, imaging, swabs, results-only
 *  things. Distinct from medications because they generate a result
 *  rather than a dose, and visually separating them in the picker
 *  helps the carer see what's been ordered vs. what's been given. */
export const TEST_OPTIONS = [
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
];

/** Medications + non-test interventions — drugs given, fluids,
 *  blood products, supportive measures (oxygen, isolation), and
 *  one-off "Other" catch-all. */
export const MEDICATION_OPTIONS = [
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

/** Combined list — kept for the search typeahead which shouldn't
 *  care about the test/medication split. */
export const TREATMENT_OPTIONS = [...TEST_OPTIONS, ...MEDICATION_OPTIONS];

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
  // Stable "is this a custom-named row?" flag — set once when the
  // user picked "Other" from the chip row, persists even when they
  // rename it. Using row.treatment === "Other" alone breaks the
  // moment they type a single letter (the row would flip out of
  // custom mode and the name input disappears).
  const isCustom = !!row.isCustom || row.treatment.trim().toLowerCase() === "other";

  const [showPlan, setShowPlan] = useState(false);
  // Default to today-only on long course lists (a 5-day antibiotics
  // schedule is 20+ courses — showing them all turns the row into a
  // wall of inputs). User can flip to all when scrolling back to
  // backfill or fix an earlier course.
  const [showAllCourses, setShowAllCourses] = useState(false);

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

  /** Add a course that records "drug changed" — name field starts
   *  blank with the TBC placeholder, drugSwitched=true so the
   *  course gets the Switched badge immediately. Used when the
   *  team swaps the antibiotic mid-plan and the patient hasn't
   *  been told the new name yet. */
  const addSwitchedCourse = () => {
    const courses = row.courses ?? [];
    const nextNumber = courses.length + 1;
    onChange({
      courses: [
        ...courses,
        {
          id: crypto.randomUUID(),
          name: "",
          details: `Course ${nextNumber}`,
          drugSwitched: true,
        } as TreatmentCourse,
      ],
    });
  };

  const courseSummary = (() => {
    const courses = row.courses ?? [];
    if (courses.length === 0) return "";
    // Group consecutive courses by name. A drugSwitched course always
    // starts a new group even when the name is blank or matches the
    // previous one — so a "name TBC" switch shows up explicitly in the
    // arrow chain rather than blending in.
    const groups: { name: string; count: number; switched?: boolean }[] = [];
    for (const c of courses) {
      const displayName = c.name.trim() || "Drug name TBC";
      const last = groups[groups.length - 1];
      if (last && last.name === displayName && !c.drugSwitched) {
        last.count += 1;
      } else {
        groups.push({ name: displayName, count: 1, switched: c.drugSwitched });
      }
    }
    return groups
      .map((g) => `${g.count} × ${g.name}${g.switched ? " (switched)" : ""}`)
      .join(" → ");
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
          {isCustom && <span className="ml-1 text-[var(--ink-soft)] font-normal">(custom)</span>}
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

      {isCustom && (
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
        <CultureLog row={row} onChange={onChange} />
      )}

      {isCourseMed && (() => {
        const allCourses = row.courses ?? [];
        const todayIso = format(new Date(), "yyyy-MM-dd");
        // Show today's courses + any course without a date set yet
        // (those are usually the ones the user is mid-way through
        // filling in). Earlier days collapse behind the "Show all"
        // toggle.
        const isVisibleInToday = (c: TreatmentCourse) =>
          !c.date || c.date === todayIso;
        const visibleCourses = showAllCourses
          ? allCourses.map((c, idx) => ({ c, idx }))
          : allCourses.map((c, idx) => ({ c, idx })).filter(({ c }) => isVisibleInToday(c));
        const hiddenCount = allCourses.length - visibleCourses.length;
        return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-[var(--ink-soft)]">
              Courses ({allCourses.length})
              {!showAllCourses && hiddenCount > 0 && (
                <span> · {visibleCourses.length} today</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setShowPlan((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
              >
                {showPlan ? "Close plan" : "Add plan"}
              </button>
              <button
                type="button"
                onClick={addSwitchedCourse}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
                title="Use when the team changed the drug but you don't know the new name"
              >
                ↔ Drug switched
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
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllCourses((v) => !v)}
              className="w-full text-left text-[11px] text-[var(--primary)] font-semibold bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1"
            >
              {showAllCourses
                ? `Show today only (hide ${hiddenCount} from earlier)`
                : `Show all ${allCourses.length} courses (${hiddenCount} from earlier days hidden)`}
            </button>
          )}
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
          {visibleCourses.map(({ c, idx }) => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold shrink-0">
                  Course #{idx + 1}
                  {c.drugSwitched && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-[var(--accent)] text-white px-1.5 py-0.5 text-[9px] font-bold">
                      ↔ Switched
                    </span>
                  )}
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
                  placeholder={c.drugSwitched ? "Drug name TBC — leave blank if not told" : "e.g. Amoxicillin, Augmentin, Tazocin"}
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
                />
                {/* Drug switched toggle. Tap once when the team changes
                     the antibiotic mid-plan. The course gets a Switched
                     badge in the summary even if the new name isn't
                     known yet — useful when nurses bring in a new bag
                     without telling the patient what's in it. */}
                <button
                  type="button"
                  onClick={() => updateCourse(c.id, { drugSwitched: !c.drugSwitched })}
                  className={
                    c.drugSwitched
                      ? "mt-1 rounded-full border border-[var(--accent)] bg-[var(--accent)] text-white px-2 py-0.5 text-[10px] font-semibold"
                      : "mt-1 rounded-full border border-dashed border-[var(--border)] text-[var(--ink-soft)] px-2 py-0.5 text-[10px] font-semibold"
                  }
                >
                  {c.drugSwitched ? "✓ Drug switched at this course" : "+ Drug switched (dose unchanged)"}
                </button>
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
        );
      })()}

      <input
        type="text"
        value={row.details}
        onChange={(e) => onChange({ details: e.target.value })}
        placeholder={
          isImaging ? "Findings, indication, ordering doctor..."
            : isCulture ? "Notes across all cultures (overall plan, antibiotic cover...)"
              : "Details (dose, route, time...)"
        }
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
      />
      {!isCulture && (
        <textarea
          value={row.result ?? ""}
          onChange={(e) => onChange({ result: e.target.value })}
          placeholder="Result (leave blank if pending)"
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] resize-y"
        />
      )}
    </div>
  );
}

/** Running log of blood culture draws on a single treatment row. A
 *  patient with FN often has multiple sets across an admission —
 *  initial peripheral, repeat after 24h, line + peripheral if a CVC
 *  is in, follow-up draws after antibiotic switches. Each draw gets
 *  a card with timestamp, source chip, count, organism (with the
 *  common-pathogen typeahead), and result chip. Migrates legacy
 *  rows that only set the single-entry `count` / `organism` fields
 *  by surfacing them as a banner the user can tap to convert into
 *  a proper running-log entry. */
const CULTURE_SOURCES = ["Peripheral", "Central line", "Port", "Mixed peripheral + line", "PICC"];
const COMMON_CULTURE_COUNTS = [
  "1 set",
  "2 sets",
  "3 sets",
  "1 aerobic + 1 anaerobic",
  "2 peripheral + 1 line",
  "Repeat draw",
];
const CULTURE_RESULT_OPTIONS = ["Pending", "No growth", "Positive", "Contaminant"];

function CultureLog({
  row,
  onChange,
}: {
  row: TreatmentRow;
  onChange: (patch: Partial<TreatmentRow>) => void;
}) {
  const cultures = row.cultures ?? [];
  const addCulture = () => {
    const now = new Date();
    onChange({
      cultures: [
        ...cultures,
        {
          id: crypto.randomUUID(),
          date: format(now, "yyyy-MM-dd"),
          time: format(now, "HH:mm"),
          source: "",
          count: "",
          organism: "",
          result: "Pending",
        },
      ],
    });
  };
  const updateCulture = (id: string, patch: Partial<BloodCultureEntry>) => {
    onChange({
      cultures: cultures.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };
  const removeCulture = (id: string) => {
    onChange({ cultures: cultures.filter((c) => c.id !== id) });
  };
  // Migration prompt: if the row was created before the running-log
  // schema and only has the legacy single-entry fields filled in,
  // surface a one-tap action to convert them into the first culture
  // entry (so the data isn't orphaned and the user gets the new UI).
  const hasLegacy = (row.count?.trim() || row.organism?.trim()) && cultures.length === 0;
  const migrateLegacy = () => {
    onChange({
      cultures: [
        {
          id: crypto.randomUUID(),
          source: "",
          count: row.count?.trim() ?? "",
          organism: row.organism?.trim() ?? "",
          result: row.result?.trim() || (row.organism?.trim() ? "Positive" : "Pending"),
        },
      ],
      count: undefined,
      organism: undefined,
    });
  };
  const sortedView = cultures
    .map((c, idx) => ({ c, idx }))
    .sort((a, b) => {
      const aKey = `${a.c.date ?? ""}T${a.c.time ?? ""}`;
      const bKey = `${b.c.date ?? ""}T${b.c.time ?? ""}`;
      return bKey.localeCompare(aKey);
    });
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-[var(--ink-soft)]">
          Cultures ({cultures.length})
        </div>
        <button
          type="button"
          onClick={addCulture}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
        >
          <Plus size={12} /> Log culture
        </button>
      </div>
      {hasLegacy && (
        <button
          type="button"
          onClick={migrateLegacy}
          className="w-full text-left text-[11px] text-[var(--primary)] font-semibold bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5"
        >
          Convert previous single entry ({[row.count, row.organism].filter(Boolean).join(" · ") || "blank"}) into the running log
        </button>
      )}
      {cultures.length === 0 && !hasLegacy && (
        <div className="text-[11px] text-[var(--ink-soft)] bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-lg px-2 py-1.5">
          Log every culture set as it&apos;s drawn — peripheral, line,
          repeat. Each entry has its own time, source, organism, and
          result so positives and follow-up draws stay straight.
        </div>
      )}
      {sortedView.map(({ c, idx }) => (
        <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold shrink-0">
              Culture #{idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeCulture(c.id)}
              className="text-[var(--ink-soft)] p-1 shrink-0"
              aria-label={`Remove culture ${idx + 1}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <DateInput
              value={c.date ?? ""}
              onChange={(e) => updateCulture(c.id, { date: e.target.value })}
            />
            <input
              type="time"
              value={c.time ?? ""}
              onChange={(e) => updateCulture(c.id, { time: e.target.value })}
              className="rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
              Source
            </div>
            <CultureSuggestField
              value={c.source ?? ""}
              onChange={(source) => updateCulture(c.id, { source })}
              suggestions={CULTURE_SOURCES}
              placeholder="Where the blood was drawn from"
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
              Set count
            </div>
            <CultureSuggestField
              value={c.count ?? ""}
              onChange={(count) => updateCulture(c.id, { count })}
              suggestions={COMMON_CULTURE_COUNTS}
              placeholder="2 sets, 1 aerobic + 1 anaerobic..."
            />
          </div>
          <CultureOrganismField
            value={c.organism ?? ""}
            onChange={(organism) => updateCulture(c.id, { organism })}
          />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
              Result
            </div>
            <div className="flex flex-wrap gap-1">
              {CULTURE_RESULT_OPTIONS.map((r) => {
                const on = (c.result ?? "").trim().toLowerCase() === r.toLowerCase();
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateCulture(c.id, { result: on ? "" : r })}
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
          </div>
          <input
            type="text"
            value={c.notes ?? ""}
            onChange={(e) => updateCulture(c.id, { notes: e.target.value })}
            placeholder="Notes (gram stain, sensitivities pending...)"
            className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
      ))}
    </div>
  );
}

/** Self-completing text field for blood-culture sub-fields (source,
 *  count). Renders the suggestion list as a typeahead dropdown when
 *  the user starts typing AND as a chip strip above the input for
 *  quick-tap of the most common values. The chip → input handoff
 *  matches the rest of the app's "tap a suggestion or type your
 *  own" pattern. */
function CultureSuggestField({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? suggestions.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : [];
  const matchedSuggestion = suggestions.find((s) => value.trim().toLowerCase() === s.toLowerCase());
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {suggestions.map((s) => {
          const on = matchedSuggestion === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(on ? "" : s)}
              className={
                on
                  ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2 py-0.5 text-[11px] font-medium text-white"
                  : "rounded-lg border border-dashed border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--ink-soft)]"
              }
            >
              {on ? "✓" : "+"} {s}
            </button>
          );
        })}
      </div>
      <div className="relative">
        <input
          type="text"
          value={search || value}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
        />
        {search && filtered.length > 0 && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-40 overflow-auto">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setSearch("");
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-soft)] border-b border-[var(--border)] last:border-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Organism free-text + typeahead on COMMON_ORGANISMS, scoped to a
 *  single culture row so multiple cultures don't share the same
 *  search-results dropdown. */
function CultureOrganismField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? COMMON_ORGANISMS.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : [];
  return (
    <div className="relative">
      <input
        type="text"
        value={search || value}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Organism — search or type your own…"
        className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
      />
      {search && filtered.length > 0 && (
        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-40 overflow-auto">
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setSearch("");
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-soft)] border-b border-[var(--border)] last:border-0"
            >
              {o}
            </button>
          ))}
        </div>
      )}
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
