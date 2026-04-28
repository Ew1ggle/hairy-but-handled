"use client";
import AppShell from "@/components/AppShell";
import { BigButton, Card } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { AlertTriangle, Activity, HeartPulse, Droplet, FileText, Pill, CreditCard, Calendar, Building2, Home as HomeIcon, CircleDashed, FilePlus, Siren, Settings, ChevronRight, Boxes, Brush, Sparkles, ShieldAlert, ShoppingCart, X } from "lucide-react";
import { format, isToday, parseISO, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePatientName } from "@/lib/usePatientName";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";
import { DayColourCard } from "@/components/DayColourCard";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { ScheduledInfusionTile } from "@/components/ScheduledInfusionTile";
import { TrendsSummaryCard } from "@/components/TrendsSummaryCard";
import { getNextScheduledInfusion, useTreatmentProfile } from "@/lib/scheduledInfusion";
import { Plus } from "lucide-react";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { clearDraft as clearDraftRaw, listDrafts, onDraftsChanged, type DraftMeta } from "@/lib/drafts";
import { useGreetingName } from "@/lib/useUserProfile";
import { UserCircle2 } from "lucide-react";

type ProfileSnapshot = {
  name?: string;
  dob?: string;
  diagnosis?: string;
  hospital?: string;
  regimen?: string;
  gp?: string;
  gpNA?: boolean;
  hematologist?: string;
  hematologistNA?: boolean;
  supportPeople?: { id: string; name?: string }[];
};

function getProfileGaps(profile: ProfileSnapshot | null): string[] {
  if (!profile) return ["Profile not started yet"];
  const gaps: string[] = [];
  if (!profile.name) gaps.push("Patient name");
  if (!profile.dob) gaps.push("Date of birth");
  if (!profile.diagnosis) gaps.push("Diagnosis");
  if (!profile.hospital) gaps.push("Treating hospital");
  if (!profile.regimen) gaps.push("Treatment regimen");
  if (!profile.hematologist && !profile.hematologistNA) gaps.push("Hematologist");
  if (!profile.gp && !profile.gpNA) gaps.push("GP");
  if (!profile.supportPeople || profile.supportPeople.length === 0) gaps.push("At least one support person");
  return gaps;
}

export default function Home() {
  const { firstName, isSupport } = usePatientName();
  const { activePatientId } = useSession();
  const greetingName = useGreetingName();
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const daily = useEntries("daily");
  const signals = useEntries("signal");
  const infusion = useEntries("infusion");
  const flags = useEntries("flag");
  const bloods = useEntries("bloods");
  const appointments = useEntries("appointment");
  const admissions = useEntries("admission");

  /** Most recent admission with no dischargeDate yet (or dischargeDate
   *  in the future). Covers both ED visits that haven't been marked
   *  discharged AND multi-day admissions. */
  const activeStay = useMemo(() => {
    const todayIso = format(new Date(), "yyyy-MM-dd");
    return admissions
      .filter((a) => !a.dischargeDate || a.dischargeDate >= todayIso)
      .sort((a, b) => (b.admissionDate ?? b.createdAt ?? "").localeCompare(a.admissionDate ?? a.createdAt ?? ""))[0];
  }, [admissions]);

  /** Whether the active stay is an ED visit logged today (so the
   *  banner copy + tap target switch). edVisit flag is set on new
   *  rows; reason-prefix is the back-compat fallback for old data. */
  const activeStayIsEdToday = activeStay
    && isToday(parseISO(activeStay.createdAt))
    && (activeStay.edVisit || activeStay.reason?.toLowerCase().startsWith("ed "));

  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.date && isToday(parseISO(a.date))).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [appointments],
  );
  const upcomingAppts = useMemo(
    () => appointments
      .filter((a) => a.date && parseISO(a.date) > new Date() && !isToday(parseISO(a.date)))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [appointments],
  );
  const upcomingAppt = upcomingAppts[0];

  const todayLog = useMemo(() => daily.find((d) => isToday(parseISO(d.createdAt))), [daily]);
  const todayManuallyLogged = todayLog && (todayLog as unknown as { manuallyLogged?: boolean }).manuallyLogged === true;
  const todaysSignals = useMemo(() => signals.filter((s) => isToday(parseISO(s.createdAt))), [signals]);
  const todaysInfusion = useMemo(() => infusion.find((i) => isToday(parseISO(i.createdAt))), [infusion]);
  const todaysFlags = useMemo(() => flags.filter((f) => isToday(parseISO(f.createdAt))), [flags]);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        setProfile((data?.data as ProfileSnapshot | undefined) ?? null);
      });
    setDrafts(listDrafts(activePatientId));
  }, [activePatientId]);

  // Re-read drafts whenever:
  //  1. The drafts module fires its custom 'drafts-changed' event
  //     (Discard / save inside the same tab — this is the main path
  //     that fixes the 'Unfinished card stays after Discard' bug since
  //     SPA navs don't fire focus/visibility).
  //  2. localStorage is mutated by another tab (rare but covered).
  //  3. The tab regains focus or visibility (catches background syncs).
  useEffect(() => {
    if (!activePatientId) return;
    const refresh = () => setDrafts(listDrafts(activePatientId));
    refresh();
    const offCustom = onDraftsChanged(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      offCustom();
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [activePatientId]);

  const profileGaps = getProfileGaps(profile);
  const treatmentProfile = useTreatmentProfile();
  // Next scheduled treatment from the protocol (not from infusion log entries) —
  // so Coming-Up reflects the calendar even when nothing has been logged yet.
  const nextScheduled = useMemo(
    () => getNextScheduledInfusion({
      fromDate: format(new Date(), "yyyy-MM-dd"),
      startDate: treatmentProfile.startDate,
      regimen: treatmentProfile.regimen,
      customTreatmentDays: treatmentProfile.customDays,
      infusions: infusion,
    }),
    [treatmentProfile, infusion],
  );

  const signalSummary = todaysSignals.length === 0
    ? "No readings yet — tap to log temp, SpO₂, mood, pain"
    : `${todaysSignals.length} reading${todaysSignals.length === 1 ? "" : "s"} today · latest ${format(parseISO(todaysSignals[todaysSignals.length - 1].createdAt), "h:mm a")}`;

  const dailyTraceSummary = todayManuallyLogged
    ? `Saved at ${format(parseISO(todayLog!.createdAt), "h:mm a")} — tap to update`
    : todayLog
      ? "Auto-notes only — full daily check not done"
      : "Weight, night sweats, questions, notes";

  return (
    <AppShell>
      {/* 0. INSTALL — dismissable PWA install banner (auto-hides if already installed) */}
      <InstallPWAButton />

      {/* Support greeting — only when the logged-in user isn't the patient.
          Gives a clear "you're looking at someone else's record" cue and a
          direct path to their own profile. */}
      {isSupport && (
        <Link href="/my-profile" className="block mb-3">
          <div className="w-full rounded-2xl bg-[var(--pink)] text-[var(--pink-ink)] px-5 py-3 flex items-center gap-3 active:scale-[0.99] transition">
            <UserCircle2 size={22} />
            <div className="text-left flex-1 min-w-0">
              <div className="text-sm font-semibold">
                Welcome back{greetingName ? `, ${greetingName}` : ""}
              </div>
              <div className="text-xs opacity-85 truncate">
                You're viewing {firstName ? `${firstName}'s` : "the patient's"} record · tap for your profile
              </div>
            </div>
            <ChevronRight size={18} className="opacity-80" />
          </div>
        </Link>
      )}

      {/* 0.5. CURRENT STATE BANNER — when the patient is at ED today or
           currently admitted, surface that prominently above everything
           else. Single banner with copy that swaps based on whether
           it's a same-day ED visit or a multi-day admission. */}
      {activeStay && (
        <Link
          href={activeStayIsEdToday ? "/emergency" : "/admissions"}
          className="block mb-3"
        >
          <div className="w-full rounded-2xl bg-[var(--alert)] text-white px-5 py-3 flex items-center gap-3 active:scale-[0.99] transition">
            {activeStayIsEdToday ? <AlertTriangle size={22} /> : <Building2 size={22} />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold uppercase tracking-wide">
                {firstName
                  ? `${firstName} is ${activeStayIsEdToday ? "at Emergency" : "admitted"}`
                  : (activeStayIsEdToday ? "Currently at Emergency" : "Currently admitted")}
              </div>
              <div className="text-xs opacity-90 truncate">
                {activeStay.hospital || "Hospital"}
                {activeStayIsEdToday && activeStay.arrivalTime && ` · arrived ${activeStay.arrivalTime}`}
                {!activeStayIsEdToday && activeStay.admissionDate && ` · since ${activeStay.admissionDate}`}
                {activeStay.reason && ` · ${activeStay.reason.replace(/^ED presentation:\s*/i, "")}`}
              </div>
            </div>
            <ChevronRight size={18} className="opacity-80 shrink-0" />
          </div>
        </Link>
      )}

      {/* Discharge-prep prompt: only when the stay is more than a same-
           day ED visit (i.e. genuine admission) so we don't nag for
           routine ED trips that go home the same day. */}
      {activeStay && !activeStayIsEdToday && (
        <Link href="/home#zones" className="block mb-3">
          <div className="w-full rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition">
            <Sparkles size={20} className="text-[var(--accent)] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Deep clean Zone 1 + Zone 2 before discharge</div>
              <div className="text-xs text-[var(--ink-soft)] truncate">
                Tap to open zones — wipe, wash linen, restock, surfaces sterile before {firstName ? `${firstName} returns home` : "discharge"}.
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--ink-soft)] shrink-0" />
          </div>
        </Link>
      )}

      {/* 1. TRIPWIRES — primary alert surface. Big red when flags are live,
           outlined-red otherwise so it's still prominent but less panic-inducing. */}
      <Link href="/ed-triggers" className="block mb-3">
        {todaysFlags.length > 0 ? (
          <div
            className="w-full rounded-2xl text-white px-5 py-4 flex items-center gap-4 shadow-lg active:scale-[0.99] transition"
            style={{ backgroundColor: "#b91c1c" }}
          >
            <AlertTriangle size={30} />
            <div className="text-left flex-1 min-w-0">
              <div className="text-lg font-extrabold uppercase tracking-wide">
                Tripwires — {todaysFlags.length} red flag{todaysFlags.length === 1 ? "" : "s"} today
              </div>
              <div className="text-sm opacity-90">Tap to review and confirm with the care team</div>
            </div>
            <ChevronRight size={22} className="opacity-80" />
          </div>
        ) : (
          <div className="w-full rounded-2xl border-2 border-[var(--alert)] bg-[var(--surface)] px-5 py-4 flex items-center gap-4 active:scale-[0.99] transition">
            <AlertTriangle size={28} className="text-[var(--alert)]" />
            <div className="text-left flex-1 min-w-0">
              <div className="text-lg font-extrabold uppercase tracking-wide text-[var(--alert)]">
                Tripwires
              </div>
              <div className="text-sm text-[var(--ink-soft)]">
                Catch what can't wait — no red flags today
              </div>
            </div>
            <ChevronRight size={20} className="text-[var(--alert)]" />
          </div>
        )}
      </Link>

      {/* 2. I AM AT EMERGENCY — secondary, under Tripwires */}
      <a href="/emergency" className="block mb-3">
        <div className="w-full rounded-2xl border border-[var(--alert)] bg-[var(--alert-soft)] text-[var(--alert)] px-5 py-3 flex items-center gap-3 active:scale-[0.99] transition">
          <Siren size={22} />
          <div className="text-left flex-1 min-w-0">
            <div className="text-base font-bold">
              {isSupport ? `Is ${firstName} at Emergency` : "I am at Emergency"}
            </div>
            <div className="text-xs opacity-80">Tap to log an ED visit now</div>
          </div>
          <ChevronRight size={18} className="opacity-80" />
        </div>
      </a>

      <MedicalDisclaimerBanner />

      {/* How am I feeling overall? — day colour + strategies, near the affirmation */}
      <DayColourCard />

      {/* 3. TODAY — Signal Sweep primary, Daily Trace secondary */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-5 mb-2">Today</h2>

      <Link href="/signal-sweep" className="block mb-3">
        <div className="w-full rounded-2xl bg-[var(--primary)] text-[var(--primary-ink)] px-5 py-4 flex items-center gap-4 shadow-sm active:scale-[0.99] transition">
          <Activity size={30} />
          <div className="text-left flex-1 min-w-0">
            <div className="text-lg font-bold">Signal Sweep</div>
            <div className="text-sm opacity-85">{signalSummary}</div>
          </div>
          <ChevronRight size={20} className="opacity-70" />
        </div>
      </Link>

      <Link href="/log" className="block mb-3">
        <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 flex items-center gap-4 active:scale-[0.99] transition">
          <HeartPulse size={24} className="text-[var(--primary)]" />
          <div className="text-left flex-1 min-w-0">
            <div className="text-base font-semibold">Daily Trace</div>
            <div className="text-xs text-[var(--ink-soft)] truncate">{dailyTraceSummary}</div>
          </div>
          <ChevronRight size={18} className="text-[var(--ink-soft)]" />
        </div>
      </Link>

      {/* Treatment banner under Daily Trace — flagged when scheduled and incomplete. */}
      <ScheduledInfusionTile
        date={format(new Date(), "yyyy-MM-dd")}
        className="mb-3"
      />

      {/* Trends firing — sits directly under the scheduled infusion banner so
          the health patterns are visible in the Today context. */}
      <TrendsSummaryCard />

      {todayAppointments.length > 0 && (
        <Link href="/agenda" className="block mb-3">
          <div className="w-full rounded-2xl bg-[var(--pink)] text-[var(--pink-ink)] px-5 py-3.5 flex items-center gap-4 active:scale-[0.99] transition">
            <Calendar size={24} />
            <div className="text-left flex-1 min-w-0">
              <div className="text-base font-semibold">
                {todayAppointments.length === 1 ? "Appointment today" : `${todayAppointments.length} appointments today`}
              </div>
              <div className="text-xs opacity-85 truncate">
                {todayAppointments[0].time ? `${todayAppointments[0].time} · ` : ""}
                {todayAppointments[0].type ?? ""}
                {todayAppointments[0].provider ? ` · ${todayAppointments[0].provider}` : ""}
              </div>
            </div>
            <ChevronRight size={18} className="opacity-80" />
          </div>
        </Link>
      )}

      {/* 4. COMING UP — next scheduled treatment + next appointment (with Add). */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-5 mb-2">Coming up</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {/* Next scheduled treatment — from the protocol schedule */}
        <Link
          href={nextScheduled ? `/treatment/${nextScheduled.cycleDay}` : "/treatment"}
          className="rounded-xl bg-[var(--surface-soft)] px-3 py-3 border border-[var(--border)] block active:scale-[0.98] transition"
        >
          <div className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)] font-semibold">Next treatment</div>
          {nextScheduled ? (
            <>
              <div className="text-base font-semibold mt-0.5">
                Day {nextScheduled.cycleDay}
                <span className="text-[var(--ink-soft)] font-normal"> · {format(nextScheduled.date, "EEE d MMM")}</span>
              </div>
              <div className="text-xs text-[var(--ink-soft)] truncate">{nextScheduled.scheduled.drugs}</div>
            </>
          ) : (
            <div className="text-sm text-[var(--ink-soft)] mt-0.5">—</div>
          )}
        </Link>

        {/* Next appointment — rich details + inline Add button */}
        <div className="rounded-xl bg-[var(--surface-soft)] px-3 py-3 border border-[var(--border)]">
          <div className="flex items-center justify-between gap-2">
            <Link href="/appointments" className="flex-1 min-w-0 block active:scale-[0.98] transition">
              <div className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)] font-semibold">Next appointment</div>
              {upcomingAppt ? (
                <>
                  <div className="text-base font-semibold mt-0.5">
                    {format(parseISO(upcomingAppt.date), "EEE d MMM")}
                    {upcomingAppt.time && <span className="text-[var(--ink-soft)] font-normal"> · {upcomingAppt.time}</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] truncate">
                    {upcomingAppt.type ?? "Appointment"}
                    {upcomingAppt.provider ? ` · ${upcomingAppt.provider}` : ""}
                  </div>
                </>
              ) : (
                <div className="text-sm text-[var(--ink-soft)] mt-0.5">None scheduled</div>
              )}
            </Link>
          </div>
          <Link
            href="/appointments?new=1"
            className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-[var(--pink)] text-[var(--pink-ink)] px-3 py-1.5 text-xs font-semibold active:scale-[0.98] transition"
          >
            <Plus size={12} /> Add appointment
          </Link>
        </div>
      </div>

      {/* 5. URGENT / EMERGENCY — alert cards + tripwires side-by-side */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--alert)] font-bold mt-5 mb-2">Urgent / emergency</h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link
          href="/medical-alerts"
          className="rounded-2xl border-2 border-[var(--alert)] bg-[var(--surface)] px-3 py-3.5 flex flex-col items-center gap-1 active:scale-[0.98] transition"
        >
          <AlertTriangle size={22} className="text-[var(--alert)]" />
          <div className="text-sm font-semibold text-[var(--alert)] text-center leading-tight">Medical Alert Cards</div>
          <div className="text-[10px] text-[var(--ink-soft)] text-center leading-tight">Neutropenic + cytotoxic</div>
        </Link>
        <Link
          href="/ed-triggers"
          className="rounded-2xl border-2 border-[var(--alert)] bg-[var(--surface)] px-3 py-3.5 flex flex-col items-center gap-1 active:scale-[0.98] transition"
        >
          <AlertTriangle size={22} className="text-[var(--alert)]" />
          <div className="text-sm font-semibold text-[var(--alert)] text-center leading-tight">Tripwires</div>
          <div className="text-[10px] text-[var(--ink-soft)] text-center leading-tight">
            {todaysFlags.length > 0 ? `Red flags — ${todaysFlags.length} today` : "Red flags — none today"}
          </div>
        </Link>
      </div>

      {/* 6. FINISH WHEN YOU GET A MOMENT — conditional */}
      {(profileGaps.length > 0 || drafts.length > 0) && (
        <Card className="mb-4 border-[var(--accent)] bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2 mb-2">
            <CircleDashed size={18} className="text-[var(--accent)]" />
            <div className="font-semibold text-[var(--ink)]">Finish these when you get a moment</div>
          </div>
          {profileGaps.length > 0 && (
            <Link href="/profile" className="block mb-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2.5 active:scale-[0.99] transition">
              <div className="text-sm font-semibold">Profile is missing {profileGaps.length} {profileGaps.length === 1 ? "thing" : "things"}</div>
              <div className="text-xs text-[var(--ink-soft)] mt-0.5 leading-snug">{profileGaps.slice(0, 4).join(" · ")}{profileGaps.length > 4 ? ` · +${profileGaps.length - 4} more` : ""}</div>
            </Link>
          )}
          {drafts.map((d) => (
            <div
              key={d.key}
              className="mb-2 last:mb-0 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-stretch"
            >
              <Link
                href={`${d.href}${d.href.includes("?") ? "&" : "?"}continue=1`}
                className="flex-1 px-3 py-2.5 active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-2">
                  <FilePlus size={14} className="text-[var(--accent)] shrink-0" />
                  <div className="text-sm font-semibold flex-1">Unfinished: {d.title}</div>
                  <div className="text-[10px] text-[var(--ink-soft)] shrink-0">{formatDistanceToNow(parseISO(d.updatedAt), { addSuffix: true })}</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activePatientId) clearDraftRaw(d.key, activePatientId);
                }}
                aria-label={`Discard ${d.title} draft`}
                className="px-3 text-[var(--ink-soft)] active:text-[var(--alert)] border-l border-[var(--border)] flex items-center"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </Card>
      )}

      {/* 7. EVERYTHING ELSE — compact 2-col grid */}
      <h2 className="text-[10px] uppercase tracking-widest text-[var(--ink-soft)] font-bold mt-5 mb-2">Everything else</h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <IconTile href="/meds" icon={Pill} label="Medication" tone="purple" />
        <IconTile href="/appointments" icon={Calendar} label="Appointments" tone="pink" />
        <IconTile href="/cards" icon={CreditCard} label="Get out of jail free cards" tone="purple" />
        <IconTile href="/export" icon={FileText} label="Export summary" tone="blue" />
        <IconTile href="/admissions" icon={Building2} label="Admissions" tone="soft" />
      </div>

      {/* 8. HOME OPERATIONS — soft primary-teal container with teal tiles so
           it reads as part of the brand family but still as its own section. */}
      <div
        className="mt-5 mb-6 rounded-2xl px-3 pt-3 pb-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        <h2
          className="text-[10px] uppercase tracking-widest font-bold mb-2 px-1"
          style={{ color: "var(--primary)" }}
        >
          Home Operations
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <HomeOpsTile href="/home#zones" icon={HomeIcon} label="Zones" />
          <HomeOpsTile href="/home#inventory" icon={Boxes} label="Inventory" />
          <HomeOpsTile href="/home#shopping" icon={ShoppingCart} label="Shopping" />
          <HomeOpsTile href="/home#routines" icon={Sparkles} label="Routines" />
          <HomeOpsTile href="/home#protocols" icon={ShieldAlert} label="Protocols" />
        </div>
      </div>

      {/* 9. SETTINGS — very bottom */}
      <Link
        href="/settings"
        className="block mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition"
      >
        <Settings size={18} className="text-[var(--ink-soft)]" />
        <span className="text-sm font-medium">Settings</span>
      </Link>
    </AppShell>
  );
}

function HomeOpsTile({ href, icon: Icon, label }: { href: string; icon: typeof Pill; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-2 py-3 flex flex-col items-center gap-1 active:scale-[0.98] transition"
      style={{ backgroundColor: "var(--primary)", color: "var(--primary-ink)" }}
    >
      <Icon size={18} />
      <span className="text-[11px] font-semibold leading-tight text-center">{label}</span>
    </Link>
  );
}

function ComingUpTile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl bg-[var(--surface-soft)] px-3 py-2 border border-[var(--border)] block active:scale-[0.98] transition">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div className="font-semibold text-[var(--ink)]">{value}</div>
    </Link>
  );
}

function IconTile({
  href, icon: Icon, label, tone, compact,
}: {
  href: string;
  icon: typeof Pill;
  label: string;
  tone: "purple" | "blue" | "soft" | "pink";
  compact?: boolean;
}) {
  const toneBg =
    tone === "purple" ? "bg-[var(--purple)] text-[var(--purple-ink)]" :
    tone === "blue" ? "bg-[var(--blue)] text-[var(--blue-ink)]" :
    tone === "pink" ? "bg-[var(--pink)] text-[var(--pink-ink)]" :
    "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)]";
  if (compact) {
    return (
      <Link href={href} className={`rounded-2xl px-2 py-3 flex flex-col items-center gap-1 active:scale-[0.98] transition ${toneBg}`}>
        <Icon size={18} />
        <span className="text-[11px] font-semibold leading-tight text-center">{label}</span>
      </Link>
    );
  }
  return (
    <Link href={href} className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition ${toneBg}`}>
      <Icon size={22} />
      <span className="text-sm font-semibold leading-tight">{label}</span>
    </Link>
  );
}
