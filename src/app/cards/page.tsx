"use client";
import AppShell from "@/components/AppShell";
import { PageTitle } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Copy, Share2, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { TonePreference } from "@/lib/affirmations";

type CardDef = {
  id: string;
  title: string;
  frontImage: string;
  backImage: string;
  tone: "spicy" | "positive";
  /** Text for copy/share fallback */
  shareText: string;
};

const CARDS: CardDef[] = [
  {
    id: "nonsense",
    title: "Medically Excused From Nonsense",
    frontImage: "/cards/1-front.png",
    backImage: "/cards/1-back.png",
    tone: "spicy",
    shareText: `MEDICALLY EXCUSED FROM NONSENSE\n\nCertified Status: Entirely Over It\nLevel of Tolerance: Critically Low\n\nThe bearer of this card is formally excused from:\nPointless obligations, Unsolicited advice, Awkward small talk, Guilt-based invitations, Emotional admin, All forms of avoidable nonsense.\n\nThis exemption may be used at any time, without explanation, apology, or follow-up discussion.\n\nNon-transferable. Universally enforceable.`,
  },
  {
    id: "exemption",
    title: "Official Exemption From Absolutely All Bullshit",
    frontImage: "/cards/2-front.png",
    backImage: "/cards/2-back.png",
    tone: "spicy",
    shareText: `OFFICIAL EXEMPTION FROM ABSOLUTELY ALL BULLSHIT\n\nValid From: Immediately\nExpires: When I Say So\n\nThe bearer of this card is formally excused from:\nPointless obligations, Unsolicited advice, Awkward small talk, Guilt-based invitations, Emotional admin, All forms of avoidable nonsense.\n\nThis exemption may be used at any time, without explanation, apology, or follow-up discussion.\n\nNon-transferable. Universally enforceable.`,
  },
  {
    id: "override",
    title: "Oncology Override Pass",
    frontImage: "/cards/3-front.png",
    backImage: "/cards/3-back.png",
    tone: "spicy",
    shareText: `ONCOLOGY OVERRIDE PASS\n\nClearance Level: Maximum\nCurrent Setting: Override Engaged\n\nThis pass grants the bearer immediate authority to override:\nSocial obligations, Family expectations, Admin requests, Phone calls, Outside clothes requirements, Plans made by other people.\n\nUse of this pass requires no justification.\nSymptoms may include fatigue, rage, radical honesty, and a complete unwillingness to entertain bullshit.\n\nPlease step aside and let the patient through.`,
  },
  {
    id: "decline",
    title: "Authority to Decline Literally Anything",
    frontImage: "/cards/4-front.png",
    backImage: "/cards/4-back.png",
    tone: "spicy",
    shareText: `AUTHORITY TO DECLINE LITERALLY ANYTHING\n\nReason: Hairy Cell Leukemia\nFurther Detail: I Have Cancer\n\nBy presentation of this card, the bearer may decline:\nInvitations, Requests, Expectations, Favours, Updates, Group Chats.\n\nAccepted responses include:\nNo. Absolutely Not. Not Today.\n\nAll decisions are final and not subject to review, appeal, debate, or guilt.`,
  },
  {
    id: "optout",
    title: "Universal Opt-Out Token",
    frontImage: "/cards/5-front.png",
    backImage: "/cards/5-back.png",
    tone: "spicy",
    shareText: `UNIVERSAL OPT-OUT TOKEN\n\nStatus: Activated\nCoverage: Broad and Immediate\n\nThis token permits the bearer to opt out of:\nEvents, Obligations, Emotional labour, Decision-making, Cheerful participation, Any situation that feels even slightly bullshit.\n\nNo substitute attendance required.\nNo makeup session available.\nNo detailed explanation provided.`,
  },
  {
    id: "cunt",
    title: "Cancer Is A Cunt",
    frontImage: "/cards/6-front.png",
    backImage: "/cards/6-back.png",
    tone: "spicy",
    shareText: `CANCER IS A CUNT\n\nStatus: Can and will be used for anything.\nNo explanation will be provided.\nRequests will be met with an eye roll, a sigh and the finger.\n\nProvocation is likely to result in the bearer choosing violence.\nFor your own safety and the bearer's sanity, resist the urge to test.`,
  },
];

export default function CardsPage() {
  const { activePatientId } = useSession();
  const [name, setName] = useState<string>("");
  const [tonePref, setTonePref] = useState<TonePreference>("both");

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as { name?: string; tonePreference?: TonePreference } | undefined;
        if (p?.name) setName(p.name);
        if (p?.tonePreference) setTonePref(p.tonePreference);
      });
  }, [activePatientId]);

  // Filter cards: positive-only users don't see spicy cards
  const filteredCards = tonePref === "positive"
    ? CARDS.filter((c) => c.tone === "positive")
    : CARDS; // spicy and both see all cards

  return (
    <AppShell>
      <PageTitle sub="Medical alert cards plus cards for getting out of things. Show in person, text, or share as an image.">
        Get out of jail free cards
      </PageTitle>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">Medical alert cards</div>
        <p className="text-sm text-[var(--ink-soft)] mb-3">
          Show these to emergency staff, triage nurses, or anyone handling body fluids. Digital, non-hospital-specific.
        </p>
        <div className="space-y-4">
          <NeutropenicAlertCard name={name} />
          <CytotoxicAlertCard name={name} />
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">Wallet cards</div>
        <p className="text-sm text-[var(--ink-soft)] mb-3">
          Present in person, text, or send to whoever needs to read between the lines. Tap to flip.
        </p>
        <div className="space-y-6">
          {filteredCards.map((c) => <CardItem key={c.id} def={c} name={name} />)}
        </div>
      </div>
    </AppShell>
  );
}

function NeutropenicAlertCard({ name }: { name: string }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-[var(--border)] bg-white text-[#111]">
      <div className="flex" style={{ aspectRatio: "1.6 / 1" }}>
        <div
          className="flex items-center justify-center"
          style={{ width: "14%", backgroundColor: "#c6262c" }}
        >
          <div
            className="text-white font-black tracking-[0.3em] uppercase text-[13px] sm:text-[15px]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Neutropenic Alert
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          <div className="text-[#c6262c] text-xl sm:text-2xl font-bold leading-tight">I could be NEUTROPENIC</div>
          <div className="text-xs sm:text-sm text-[#333] mt-1">If my temperature is 38°C or higher</div>
          <div className="mt-2 font-bold text-sm sm:text-base">THIS IS A MEDICAL EMERGENCY</div>
          <div className="text-xs sm:text-sm mt-2">I must have the following done immediately:</div>
          <ul className="text-xs sm:text-sm mt-1 space-y-0.5 list-disc list-inside">
            <li>Medical Review and Consultant Notified</li>
            <li>Septic Screen (Obs, Chest X-Ray, MSU)</li>
            <li>FBC, ELFTs, Blood Cultures</li>
            <li>Intravenous Antibiotics</li>
          </ul>
          {name && (
            <div className="mt-auto pt-2 text-[11px] sm:text-xs text-[#555] border-t border-[#eee]">
              Bearer: <span className="font-semibold text-[#111]">{name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CytotoxicAlertCard({ name }: { name: string }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-[var(--border)] bg-white text-[#111]">
      <div className="flex" style={{ aspectRatio: "1.6 / 1" }}>
        <div
          className="flex items-center justify-center"
          style={{ width: "14%", backgroundColor: "#5b2a86" }}
        >
          <div
            className="text-white font-black tracking-[0.3em] uppercase text-[13px] sm:text-[15px]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Cytotoxic Alert
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          <div className="text-[#5b2a86] text-lg sm:text-xl font-bold leading-tight">I have been treated with</div>
          <div className="text-[#5b2a86] text-2xl sm:text-3xl font-black leading-tight">CHEMOTHERAPY</div>
          <div className="text-xs sm:text-sm mt-2">
            Cytotoxic agents may be present in all my body fluids (urine, vomit, blood, faeces).
          </div>
          <div className="text-xs sm:text-sm mt-2 font-semibold">
            Cytotoxic safe handling precautions are required when handling all my body fluids for 7 days after treatment.
          </div>
          {name && (
            <div className="mt-auto pt-2 text-[11px] sm:text-xs text-[#555] border-t border-[#eee]">
              Bearer: <span className="font-semibold text-[#111]">{name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function CardItem({ def, name }: { def: CardDef; name: string }) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const textWithName = `${def.shareText}\n\n— Issued to: ${name || "(name not set)"}`;

  const buildShareImage = useCallback(async (): Promise<Blob> => {
    const [frontImg, backImg] = await Promise.all([
      loadImage(def.frontImage),
      loadImage(def.backImage),
    ]);

    const W = frontImg.naturalWidth;
    const H = frontImg.naturalHeight;
    const GAP = 30;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H * 2 + GAP;
    const ctx = canvas.getContext("2d")!;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw front
    ctx.drawImage(frontImg, 0, 0, W, H);

    // Draw patient name on front — above the line, right panel
    if (name) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px 'Montserrat', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      const nameX = W * 0.73; // centre of right panel
      const nameY = H * 0.57; // above the line
      ctx.fillText(name.toUpperCase(), nameX, nameY);
      ctx.shadowColor = "transparent";
    }

    // Draw back
    ctx.drawImage(backImg, 0, H + GAP, W, H);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  }, [def, name]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(textWithName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const share = async () => {
    try {
      const blob = await buildShareImage();
      const file = new File([blob], `${def.id}-card.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: def.title, files: [file] });
        return;
      }
    } catch {}
    // Fallback: share as text
    if (navigator.share) {
      try { await navigator.share({ title: def.title, text: textWithName }); return; } catch {}
    }
    await copy();
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <button onClick={() => setFlipped(!flipped)} className="block w-full" aria-label="Flip card">
        <div className="relative mx-auto" style={{ perspective: "1200px", maxWidth: "480px" }}>
          <div className="relative w-full" style={{ aspectRatio: "1024 / 599", transformStyle: "preserve-3d", transition: "transform 0.6s", transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}>
            {/* FRONT */}
            <div className="absolute inset-0 rounded-2xl shadow-xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
              <img src={def.frontImage} alt={def.title} className="absolute inset-0 w-full h-full object-cover" />
              {/* Patient name overlay — positioned above the line, right panel */}
              <div className="absolute brand-font" style={{ right: "4%", bottom: "41%", left: "46%", textAlign: "center" }}>
                <div className="text-white font-bold uppercase tracking-[0.1em]" style={{ fontSize: "clamp(10px, 2.5vw, 16px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  {name || ""}
                </div>
              </div>
            </div>
            {/* BACK */}
            <div className="absolute inset-0 rounded-2xl shadow-xl overflow-hidden" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
              <img src={def.backImage} alt={`${def.title} — back`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </button>
      <div className="mt-4 flex gap-2 justify-center">
        <button onClick={() => setFlipped(!flipped)} className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium">
          <RotateCw size={14} /> Flip
        </button>
        <button onClick={share} className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-ink)] px-4 py-2 text-sm font-medium">
          <Share2 size={14} /> Share
        </button>
        <button onClick={copy} className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-soft)] px-4 py-2 text-sm font-medium">
          <Copy size={14} /> {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
