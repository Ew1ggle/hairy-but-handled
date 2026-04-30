"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { getNadirContext, NADIR_LABEL } from "@/lib/nadirWindow";
import { format, parseISO, subHours } from "date-fns";
import { AlertTriangle, Copy, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isMedEffectivelyStopped } from "@/lib/meds";

/** /handover — the "2am ED registrar in 60 seconds" card.
 *  Pure read-model, no new entry kinds. Pulls weight, allergies,
 *  regimen, last infusion date + nadir-day, last FBC, current
 *  prophylaxis with start dates, last 24h vitals, last febrile
 *  episode + paracetamol timing, central-line type, treating team.
 *  Renders an SBAR-style block formatted for SMS / print / read-out.
 *
 *  Backed entirely by existing entries. No mutations. */
export default function HandoverPage() {
  const { activePatientId } = useSession();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => setProfile((data?.data as Record<string, unknown> | null) ?? null));
  }, [activePatientId]);

  const signals = useEntries("signal");
  const bloods = useEntries("bloods");
  const flags = useEntries("flag");
  const infusions = useEntries("infusion");
  const meds = useEntries("med");
  const doses = useEntries("dose");
  const admissions = useEntries("admission");

  const ctx = useMemo(() => getNadirContext(infusions), [infusions]);

  const last24hCutoff = subHours(new Date(), 24).toISOString();
  const recentSignals = useMemo(
    () => signals.filter((s) => s.createdAt >= last24hCutoff).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [signals, last24hCutoff],
  );
  const lastByType = useMemo(() => {
    const map = new Map<string, typeof recentSignals[number]>();
    for (const s of recentSignals) {
      if (!map.has(s.signalType)) map.set(s.signalType, s);
    }
    return map;
  }, [recentSignals]);

  // Last febrile episode: most recent temp signal >= 38°C in any
  // window. Helps the registrar decide if the rigor was 4 hours ago
  // or 4 days ago.
  const lastFebrile = useMemo(() => {
    return signals
      .filter((s) => s.signalType === "temp" && typeof s.value === "number" && (s.value as number) >= 38)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }, [signals]);

  // Last paracetamol — pulled from doses where medName matches
  // /panadol|paracetamol/i. The 4-6h window is what matters when
  // assessing whether a fever has been masked.
  const lastParacetamol = useMemo(() => {
    return doses
      .filter((d) => /panadol|paracetamol/i.test(d.medName ?? ""))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }, [doses]);

  const latestBloods = useMemo(() => bloods.slice().sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""))[0], [bloods]);

  const activeMeds = useMemo(() => meds.filter((m) => !isMedEffectivelyStopped(m)), [meds]);
  const prophylaxis = useMemo(
    () => activeMeds.filter((m) => /bactrim|trimethoprim|sulfamethoxazole|aciclovir|valaciclovir|valacyclovir|posaconazole|fluconazole|entecavir|tenofovir/i.test(m.name)),
    [activeMeds],
  );
  const currentAntibiotics = useMemo(
    () => activeMeds.filter((m) => /antibiotic|cilin|cycline|mycin|cef|tazocin|piperacillin|meropenem|vancomycin|ciprofloxacin|metronidazole|clindamycin/i.test(m.name)),
    [activeMeds],
  );

  const activeStay = useMemo(
    () => admissions.filter((a) => !a.dischargeDate).sort((a, b) => (b.admissionDate ?? "").localeCompare(a.admissionDate ?? ""))[0],
    [admissions],
  );

  const recentFlags = useMemo(
    () => flags.filter((f) => f.createdAt >= subHours(new Date(), 72).toISOString()).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [flags],
  );

  const name = (profile?.name as string) ?? (profile?.preferredName as string) ?? "Patient";
  const dob = (profile?.dob as string) ?? "";
  const weight = (profile?.weight as string) ?? "";
  const diagnosis = profile?.diagnosis === "Other" ? (profile?.diagnosisOther as string) ?? "" : (profile?.diagnosis as string) ?? "";
  const regimen = profile?.regimen === "Other" ? (profile?.regimenOther as string) ?? "" : (profile?.regimen as string) ?? "";
  const startDate = (profile?.startDate as string) ?? "";
  const allergies = (profile?.allergies as { name?: string }[] | undefined) ?? [];
  const centralLine = (profile?.centralLine as string) ?? (profile?.lineType as string) ?? "";
  const treatingTeam = (profile?.consultant as string) ?? (profile?.haemTeam as string) ?? "";
  const afterHours = (profile?.afterHoursPhone as string) ?? "";

  const sbar = useMemo(() => {
    const lines: string[] = [];
    lines.push(`SITUATION: ${name}${dob ? `, DOB ${dob}` : ""}${weight ? `, ${weight}kg` : ""}`);
    if (diagnosis) lines.push(`Diagnosis: ${diagnosis}`);
    if (regimen) lines.push(`Regimen: ${regimen}${startDate ? ` (started ${startDate})` : ""}`);
    if (ctx.lastInfusion) {
      lines.push(`Last infusion: ${format(parseISO(ctx.lastInfusion.createdAt), "d MMM yyyy")} — Day ${ctx.daysSinceInfusion} post (${NADIR_LABEL[ctx.state]})`);
      lines.push(`Fever threshold for this window: ≥${ctx.feverThreshold.toFixed(1)}°C`);
    }
    if (allergies.length > 0) lines.push(`Allergies: ${allergies.map((a) => a.name).filter(Boolean).join(", ")}`);
    if (centralLine) lines.push(`Central line: ${centralLine}`);
    lines.push("");
    lines.push("BACKGROUND:");
    if (latestBloods) {
      const parts = [
        latestBloods.hb != null ? `Hb ${latestBloods.hb}` : "",
        latestBloods.wcc != null ? `WCC ${latestBloods.wcc}` : "",
        latestBloods.neutrophils != null ? `Neuts ${latestBloods.neutrophils}` : "",
        latestBloods.platelets != null ? `Plts ${latestBloods.platelets}` : "",
        latestBloods.crp != null ? `CRP ${latestBloods.crp}` : "",
      ].filter(Boolean).join(", ");
      lines.push(`Latest FBC (${latestBloods.takenAt ? format(parseISO(latestBloods.takenAt), "d MMM HH:mm") : "date unknown"}): ${parts || "no values"}`);
    } else {
      lines.push("No bloods on record.");
    }
    if (lastFebrile) {
      lines.push(`Last febrile: ${format(parseISO(lastFebrile.createdAt), "d MMM HH:mm")} — ${lastFebrile.value}°C`);
    }
    if (lastParacetamol) {
      const taken = lastParacetamol.timeTaken ?? format(parseISO(lastParacetamol.createdAt), "HH:mm");
      lines.push(`Last paracetamol/panadol: ${format(parseISO(lastParacetamol.createdAt), "d MMM")} ${taken}${lastParacetamol.doseTaken ? ` — ${lastParacetamol.doseTaken}` : ""}`);
    }
    if (currentAntibiotics.length > 0) {
      const list = currentAntibiotics.map((m) => `${m.name}${m.startDate ? ` (since ${m.startDate})` : ""}`).join(", ");
      lines.push(`On antibiotics: ${list}`);
    }
    if (prophylaxis.length > 0) {
      const list = prophylaxis.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}`).join(", ");
      lines.push(`Prophylaxis: ${list}`);
    }
    if (activeStay) {
      lines.push(`Currently ${activeStay.outcome === "admitted" ? "admitted" : "at"} ${activeStay.hospital ?? "hospital"}${activeStay.ward ? ` · ${activeStay.ward}` : ""}${activeStay.bedNumber ? ` Bed ${activeStay.bedNumber}` : ""}`);
    }
    lines.push("");
    lines.push("ASSESSMENT (last 24h):");
    const orderedTypes = ["temp", "pulse", "spo2", "bp", "pain", "fatigue", "nausea"];
    for (const t of orderedTypes) {
      const s = lastByType.get(t);
      if (!s) continue;
      const value = s.value != null ? `${s.value}${s.unit ?? ""}` : s.score != null ? `${s.score}/10` : s.choice ?? "";
      lines.push(`  ${t}: ${value} @ ${format(parseISO(s.createdAt), "HH:mm")}`);
    }
    if (recentFlags.length > 0) {
      lines.push("");
      lines.push("FLAGS (last 72h):");
      for (const f of recentFlags.slice(0, 5)) {
        lines.push(`  · ${format(parseISO(f.createdAt), "d MMM HH:mm")} — ${f.triggerLabel}`);
      }
    }
    if (treatingTeam || afterHours) {
      lines.push("");
      lines.push("TEAM:");
      if (treatingTeam) lines.push(`Treating: ${treatingTeam}`);
      if (afterHours) lines.push(`After hours: ${afterHours}`);
    }
    return lines.join("\n");
  }, [name, dob, weight, diagnosis, regimen, startDate, ctx, allergies, centralLine, latestBloods, lastFebrile, lastParacetamol, currentAntibiotics, prophylaxis, activeStay, lastByType, recentFlags, treatingTeam, afterHours]);

  const [shareState, setShareState] = useState<"" | "copied" | "error">("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sbar);
      setShareState("copied");
      setTimeout(() => setShareState(""), 1800);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState(""), 1800);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} — handover`, text: sbar });
        return;
      } catch { /* cancelled or unsupported, fall through */ }
    }
    await copy();
  };

  return (
    <AppShell>
      <PageTitle sub="The 60-second SBAR for the 2am registrar.">
        Handover
      </PageTitle>

      <div className="rounded-2xl border-2 border-[var(--alert)] bg-[var(--alert-soft)] px-4 py-3 mb-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-[var(--alert)] shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--alert)]">
          <div className="font-bold uppercase tracking-wide">Read aloud or share by SMS</div>
          <div className="mt-0.5">
            Pulled from your records. Date stamps + last-bloods times surface so the on-call team can decide what's stale and what's live.
          </div>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={share}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold"
          >
            <Share2 size={14} /> Share by SMS / email
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium"
          >
            <Copy size={14} /> {shareState === "copied" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="text-xs leading-snug whitespace-pre-wrap font-mono bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl p-3 overflow-x-auto">
{sbar}
        </pre>
        <p className="text-[11px] text-[var(--ink-soft)]">
          Empty sections mean nothing was logged for that line — not that the patient doesn&apos;t have one. The registrar should still ask.
        </p>
      </Card>
    </AppShell>
  );
}
