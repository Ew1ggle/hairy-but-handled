"use client";
import AppShell from "@/components/AppShell";
import { Card as UICard, PageTitle } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Copy, Share2, Printer, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

type CardDef = {
  id: string;
  title: string;
  front: { label: string; value: string | "NAME" }[];
  backIntro?: string;
  backBullets: string[];
  backOutro?: string[];
  tagline: string;
};

const CARDS: CardDef[] = [
  {
    id: "exemption",
    title: "Official Exemption From Absolutely All Bullshit",
    front: [
      { label: "Issued to", value: "NAME" },
      { label: "Valid from", value: "Immediately" },
      { label: "Expires", value: "When she says so" },
    ],
    backIntro: "The bearer of this card is formally excused from:",
    backBullets: [
      "pointless obligations",
      "unsolicited advice",
      "awkward small talk",
      "guilt-based invitations",
      "emotional admin",
      "all forms of avoidable nonsense",
    ],
    backOutro: [
      "This exemption may be used at any time, without explanation, apology, or follow-up discussion.",
      "Non-transferable. Universally enforceable.",
      "If challenged, please refer to the phrase: No.",
    ],
    tagline: "No expiry. No appeals. No guilt.",
  },
  {
    id: "nonsense",
    title: "Medically Excused From Nonsense",
    front: [
      { label: "Certified status", value: "Entirely over it" },
      { label: "Patient name", value: "NAME" },
      { label: "Approved level of tolerance", value: "Critically low" },
    ],
    backIntro: "This card confirms that the bearer is currently exempt from:",
    backBullets: [
      "draining conversations",
      "performative positivity",
      "unnecessary errands",
      "forced politeness",
      "any request beginning with \u201Cit\u2019ll only take a minute\u201D",
    ],
    backOutro: [
      "Medical recommendation: reduce exposure to fools, pressure, chaos, and all non-essential carry-on.",
      "Best treatment plan: rest, comfort, snacks, silence, and people who know when to leave.",
    ],
    tagline: "Clinically approved for immediate refusal.",
  },
  {
    id: "override",
    title: "Oncology Override Pass",
    front: [
      { label: "Clearance level", value: "Maximum" },
      { label: "Holder", value: "NAME" },
      { label: "Current setting", value: "Override engaged" },
    ],
    backIntro: "This pass grants the bearer immediate authority to override:",
    backBullets: [
      "social obligations",
      "family expectations",
      "admin requests",
      "phone calls",
      "bra requirements",
      "plans made by other people",
    ],
    backOutro: [
      "Use of this pass requires no justification.",
      "Symptoms may include fatigue, rage, radical honesty, and a complete unwillingness to entertain bullshit.",
      "Please step aside and let the patient through.",
    ],
    tagline: "Valid in all states of fatigue, rage, and chemo.",
  },
  {
    id: "decline",
    title: "Authority to Decline Literally Anything",
    front: [
      { label: "Granted to", value: "NAME" },
      { label: "Reason", value: "Entirely valid" },
      { label: "Further detail", value: "Not required" },
    ],
    backIntro: "By presentation of this card, the bearer may decline:",
    backBullets: [
      "invitations",
      "requests",
      "expectations",
      "favours",
      "updates",
      "group chats",
      "pants",
      "explanations",
    ],
    backOutro: [
      "Accepted responses include: \u201CNo.\u201D  \u201CAbsolutely not.\u201D  \u201CNot today.\u201D  \u201CI do not have the range.\u201D",
      "All decisions are final and not subject to review, appeal, debate, or guilt.",
    ],
    tagline: "Use as needed. Repeated use encouraged.",
  },
  {
    id: "optout",
    title: "Universal Opt-Out Token",
    front: [
      { label: "Bearer", value: "NAME" },
      { label: "Status", value: "Activated" },
      { label: "Coverage", value: "Broad and immediate" },
    ],
    backIntro: "This token permits the bearer to opt out of:",
    backBullets: [
      "events",
      "obligations",
      "emotional labour",
      "decision-making",
      "cheerful participation",
      "any situation that feels even slightly bullshit",
    ],
    backOutro: [
      "No substitute attendance required.",
      "No makeup session available.",
      "No one is entitled to a detailed explanation.",
      "Present this token, withdraw gracefully, and return to blanket-based operations.",
    ],
    tagline: "For emergency use in the presence of bullshit.",
  },
];

export default function CardsPage() {
  const { activePatientId } = useSession();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const n = (data?.data as { name?: string })?.name;
        if (n) setName(n);
      });
  }, [activePatientId]);

  return (
    <AppShell>
      <PageTitle sub="Present in person, text, or send to whoever needs to read between the lines. Tap a card to flip it.">
        Wallet cards
      </PageTitle>

      <div className="space-y-8">
        {CARDS.map((c) => <CardItem key={c.id} def={c} name={name} />)}
      </div>
    </AppShell>
  );
}

function CardItem({ def, name }: { def: CardDef; name: string }) {
  const [flipped, setFlipped] = useState(false);

  const shareText = buildShareText(def, name);

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareText); } catch {}
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: def.title, text: shareText }); } catch {}
    } else {
      await copy();
    }
  };
  const printCard = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${def.title}</title>
      <style>
        @page { size: A6 landscape; margin: 0; }
        body { margin: 0; padding: 0; background: white; font-family: ui-sans-serif, system-ui, sans-serif; }
        .card { width: 85.6mm; height: 53.98mm; background: black; color: white; padding: 6mm; box-sizing: border-box; border-radius: 3mm; margin: 6mm auto; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; }
        .title { font-size: 9pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.15; }
        .fields { font-size: 7pt; line-height: 1.35; }
        .label { opacity: 0.6; font-size: 5.5pt; text-transform: uppercase; letter-spacing: 0.08em; }
        .value { font-weight: 600; }
        .tagline { font-size: 6pt; font-style: italic; opacity: 0.75; }
        .back { font-size: 7pt; line-height: 1.35; }
        .back p { margin: 0 0 1mm 0; }
        .back ul { margin: 1mm 0 1.5mm 4mm; padding: 0; }
        .back li { margin: 0; }
      </style></head><body>${cardFrontHtml(def, name)}${cardBackHtml(def, name)}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 200);
  };

  return (
    <div>
      <button onClick={() => setFlipped(!flipped)} className="block w-full" aria-label="Flip card">
        <div className="relative mx-auto" style={{ perspective: "1200px", maxWidth: "360px" }}>
          <div className="relative w-full" style={{ aspectRatio: "1.586 / 1", transformStyle: "preserve-3d", transition: "transform 0.6s", transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}>
            <CardFace def={def} name={name} side="front" />
            <CardFace def={def} name={name} side="back" />
          </div>
        </div>
      </button>
      <div className="mt-3 flex gap-2 justify-center">
        <button onClick={() => setFlipped(!flipped)} className="flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs">
          <RotateCw size={12} /> Flip
        </button>
        <button onClick={share} className="flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs">
          <Share2 size={12} /> Share
        </button>
        <button onClick={copy} className="flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs">
          <Copy size={12} /> Copy
        </button>
        <button onClick={printCard} className="flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs">
          <Printer size={12} /> Print
        </button>
      </div>
    </div>
  );
}

function CardFace({ def, name, side }: { def: CardDef; name: string; side: "front" | "back" }) {
  const base = "absolute inset-0 rounded-xl bg-black text-white shadow-xl overflow-hidden";
  const hidden = side === "back" ? { transform: "rotateY(180deg)", backfaceVisibility: "hidden" as const } : { backfaceVisibility: "hidden" as const };
  if (side === "front") {
    return (
      <div className={base} style={hidden}>
        <div className="h-full w-full flex flex-col justify-between p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] opacity-60">Hairy but Handled</div>
            <div className="mt-1.5 text-[13px] font-extrabold uppercase tracking-wide leading-tight">
              {def.title}
            </div>
          </div>
          <div className="space-y-1 text-[11px]">
            {def.front.map((row, i) => (
              <div key={i}>
                <div className="uppercase tracking-[0.12em] text-[8px] opacity-55">{row.label}</div>
                <div className="font-semibold leading-tight">{row.value === "NAME" ? (name || "_______________") : row.value}</div>
              </div>
            ))}
          </div>
          <div className="text-[9px] italic opacity-70">{def.tagline}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={base} style={hidden}>
      <div className="h-full w-full flex flex-col justify-between p-3.5 overflow-hidden">
        <div className="text-[9px] leading-snug">
          {def.backIntro && <p className="mb-1.5">{def.backIntro}</p>}
          <ul className="list-disc pl-4 space-y-[1px] mb-1.5">
            {def.backBullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
          {def.backOutro?.map((p, i) => <p key={i} className="mt-1 opacity-80">{p}</p>)}
        </div>
        <div className="text-[9px] italic opacity-70">{def.tagline}</div>
      </div>
    </div>
  );
}

function buildShareText(def: CardDef, name: string) {
  const fillName = (v: string | "NAME") => v === "NAME" ? (name || "_______________") : v;
  const front = def.front.map((r) => `${r.label}: ${fillName(r.value)}`).join("\n");
  const bullets = def.backBullets.map((b) => `• ${b}`).join("\n");
  const outro = (def.backOutro ?? []).join("\n\n");
  return `${def.title.toUpperCase()}\n\n${front}\n\n${def.backIntro ?? ""}\n${bullets}\n\n${outro}\n\n— ${def.tagline}`;
}

function cardFrontHtml(def: CardDef, name: string) {
  const fillName = (v: string | "NAME") => v === "NAME" ? (name || "________________") : v;
  const rows = def.front.map((r) => `<div><div class="label">${r.label}</div><div class="value">${escapeHtml(fillName(r.value))}</div></div>`).join("");
  return `<div class="card"><div><div style="font-size:6pt;opacity:0.55;text-transform:uppercase;letter-spacing:0.15em">Hairy but Handled</div><div class="title" style="margin-top:2mm">${escapeHtml(def.title)}</div></div><div class="fields">${rows}</div><div class="tagline">${escapeHtml(def.tagline)}</div></div>`;
}
function cardBackHtml(def: CardDef, _name?: string) {
  void _name;
  const bullets = def.backBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  const outro = (def.backOutro ?? []).map((p) => `<p style="opacity:0.8">${escapeHtml(p)}</p>`).join("");
  return `<div class="card back"><div>${def.backIntro ? `<p>${escapeHtml(def.backIntro)}</p>` : ""}<ul>${bullets}</ul>${outro}</div><div class="tagline">${escapeHtml(def.tagline)}</div></div>`;
}
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!)); }
