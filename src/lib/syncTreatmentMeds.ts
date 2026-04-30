import type { Admission, DoseEntry, MedEntry, TreatmentCourse, TreatmentRow } from "./store";

const COURSE_REGEX = /antibiotic|antiviral|antifungal|panadol|paracetamol|anti[\s-]?emetic|steroid|cilin|cycline|mycin|cef|tazocin|piperacillin|meropenem|vancomycin|ciprofloxacin|metronidazole|clindamycin|aciclovir|fluconazole|posaconazole|ondansetron|hydrocortisone|dexamethasone/i;

/** Decide whether a treatment row is course-style — drives the sync.
 *  Same regex as /emergency + /admissions isCourseTreatment so the
 *  trigger here matches what the form's UI already shows. */
export function isCourseStyleTreatment(name: string): boolean {
  return COURSE_REGEX.test(name);
}

/** Group consecutive courses by drug name. A treatment row that
 *  switches drug mid-stay (Amoxicillin × 3 → Augmentin × 4) becomes
 *  two MedEntry rows so the medication tab shows what was actually
 *  given, not just the category. */
type DrugGroup = { drugName: string; courses: TreatmentCourse[]; firstDate?: string; lastDate?: string };

export function groupCoursesByDrug(courses: readonly TreatmentCourse[]): DrugGroup[] {
  const groups: DrugGroup[] = [];
  for (const c of courses) {
    const name = (c.name ?? "").trim();
    if (!name) continue;
    const last = groups[groups.length - 1];
    if (last && last.drugName.toLowerCase() === name.toLowerCase()) {
      last.courses.push(c);
      if (c.date && (!last.lastDate || c.date > last.lastDate)) last.lastDate = c.date;
    } else {
      groups.push({
        drugName: name,
        courses: [c],
        firstDate: c.date,
        lastDate: c.date,
      });
    }
  }
  return groups;
}

/** What the sync wants to apply against the database. */
export type SyncPlan = {
  medsToCreate: Omit<MedEntry, "id" | "createdAt">[];
  medsToUpdate: { id: string; patch: Partial<MedEntry> }[];
  dosesToCreate: Omit<DoseEntry, "id" | "createdAt">[];
  dosesToUpdate: { id: string; patch: Partial<DoseEntry> }[];
};

/** Build the desired meds + doses for an admission's course-style
 *  treatments, diff against existing rows, and return a plan. The
 *  caller (/emergency saveAsAdmission, /admissions save) is
 *  responsible for applying the plan via addEntry / updateEntry.
 *
 *  Sync logic:
 *   - For every course-style treatment with non-empty courses,
 *     group consecutive courses by drug name (so Amoxi × 3 → Augm
 *     × 4 = two distinct meds).
 *   - For each drug group, ensure a MedEntry exists tagged with
 *     linkedAdmissionId + matching name. If one exists, update its
 *     fields (dose, dates, prescriber). Otherwise create.
 *   - For each course, ensure a DoseEntry exists with
 *     linkedCourseId === course.id. Update if present, create
 *     otherwise.
 *   - Don't auto-delete: if the user removes a course or treatment
 *     row, the orphaned med/dose stays. They can be cleaned up
 *     manually. Avoiding destructive sync prevents data loss when
 *     the admission row is being edited mid-stay. */
export function planTreatmentMedSync(opts: {
  admission: Admission;
  existingMeds: readonly MedEntry[];
  existingDoses: readonly DoseEntry[];
}): SyncPlan {
  const { admission, existingMeds, existingDoses } = opts;
  const plan: SyncPlan = {
    medsToCreate: [],
    medsToUpdate: [],
    dosesToCreate: [],
    dosesToUpdate: [],
  };

  if (!admission.id) return plan; // need an id to link against
  const treatments = (admission.treatments ?? []) as TreatmentRow[];
  const courseRows = treatments.filter((t) => isCourseStyleTreatment(t.treatment));
  if (courseRows.length === 0) return plan;

  const linkedMeds = existingMeds.filter((m) => m.linkedAdmissionId === admission.id);
  const linkedDoses = existingDoses.filter((d) => d.linkedAdmissionId === admission.id);

  for (const row of courseRows) {
    const groups = groupCoursesByDrug(row.courses ?? []);
    for (const g of groups) {
      // MedEntry sync — match by linkedAdmissionId + case-insensitive name.
      const existing = linkedMeds.find(
        (m) => m.name.toLowerCase() === g.drugName.toLowerCase(),
      );
      const desired: Partial<MedEntry> = {
        name: g.drugName,
        dose: row.details || undefined,
        reason: row.treatment, // category as the reason
        startDate: g.firstDate ?? admission.admissionDate,
        stopDate: admission.dischargeDate ?? undefined,
        status: admission.dischargeDate ? "stopped" : "active",
        prescriber: admission.admittingTeam || undefined,
        linkedAdmissionId: admission.id,
        purpose: "treatment",
        importantNotes: `Auto-created from admission ${admission.admissionDate ?? ""} treatment row "${row.treatment}". Edit on the admission, not directly here.`.trim(),
      };
      if (existing) {
        plan.medsToUpdate.push({ id: existing.id, patch: desired });
      } else {
        plan.medsToCreate.push({
          kind: "med" as const,
          ...(desired as Omit<MedEntry, "id" | "createdAt" | "kind">),
        } as Omit<MedEntry, "id" | "createdAt">);
      }
    }
  }

  // DoseEntry sync — one per course. We use linkedCourseId rather
  // than course array index because course ids are stable across
  // edits (the user can delete course #2 without renumbering).
  for (const row of courseRows) {
    for (const c of row.courses ?? []) {
      // Find or create a med name for this course (look up which
      // group it belongs to — courses inside the same group share
      // the same drug name).
      const drugName = (c.name ?? "").trim();
      if (!drugName) continue;
      const linkedMed = linkedMeds.find((m) => m.name.toLowerCase() === drugName.toLowerCase());
      // Resolve med id: existing med, or skip — for new meds we
      // can't know the id at plan-time. The caller has to apply
      // creates first, then re-resolve and apply doses. Simpler:
      // skip linking medId for new-med doses; the dose still
      // saves with medName.
      const medId = linkedMed?.id;

      const courseDateIso = c.date && c.time
        ? new Date(`${c.date}T${c.time}`).toISOString()
        : c.date
          ? new Date(`${c.date}T00:00:00`).toISOString()
          : undefined;

      const existingDose = linkedDoses.find((d) => d.linkedCourseId === c.id);
      const desired: Partial<DoseEntry> = {
        medId,
        medName: drugName,
        doseTaken: row.details || undefined,
        timeTaken: c.time,
        status: "taken",
        notes: c.details && c.details !== drugName ? c.details : undefined,
        linkedAdmissionId: admission.id,
        linkedCourseId: c.id,
      };
      if (existingDose) {
        plan.dosesToUpdate.push({
          id: existingDose.id,
          patch: { ...desired, ...(courseDateIso ? { createdAt: courseDateIso } as Partial<DoseEntry> & { createdAt?: string } : {}) },
        });
      } else {
        plan.dosesToCreate.push({
          kind: "dose" as const,
          ...(desired as Omit<DoseEntry, "id" | "createdAt" | "kind">),
          ...(courseDateIso ? { createdAt: courseDateIso } as Omit<DoseEntry, "id" | "createdAt"> & { createdAt?: string } : {}),
        } as unknown as Omit<DoseEntry, "id" | "createdAt">);
      }
    }
  }

  return plan;
}
