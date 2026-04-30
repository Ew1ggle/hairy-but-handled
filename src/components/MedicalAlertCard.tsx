"use client";
import { Copy, Share2, Radio, Check } from "lucide-react";
import { useState } from "react";

export type MedicalKind = "neutropenic" | "cytotoxic" | "transfusion";

export const MEDICAL_SHARE_TEXT: Record<MedicalKind, (name: string) => string> = {
  neutropenic: (name) =>
`NEUTROPENIC ALERT — I could be neutropenic.

If my temperature is 37.8°C or higher, THIS IS A MEDICAL EMERGENCY.

I must have the following done immediately:
• Medical review and consultant notified
• Septic screen (observations, chest X-ray, MSU)
• FBC, ELFTs, blood cultures
• Intravenous antibiotics

${name ? `Bearer: ${name}` : ""}`,
  cytotoxic: (name) =>
`CYTOTOXIC ALERT — I have been treated with CHEMOTHERAPY.

Cytotoxic agents may be present in all my body fluids (urine, vomit, blood, faeces).

Cytotoxic safe handling precautions are required when handling all my body fluids for 7 days after treatment.

${name ? `Bearer: ${name}` : ""}`,
  transfusion: (name) =>
`TRANSFUSION REQUIREMENT — IRRADIATED, LEUKODEPLETED, CMV-SAFE BLOOD PRODUCTS FOR LIFE.

I have been treated with a purine analogue (cladribine / fludarabine).

ALL cellular blood products (RBCs, platelets, granulocytes) must be:
• Gamma-irradiated (≥25 Gy) — to prevent transfusion-associated GVHD
• Leukocyte-depleted
• CMV-seronegative or filtered (CMV-safe)

This requirement is LIFELONG. Apply even in emergency / massive transfusion scenarios.

${name ? `Bearer: ${name}` : ""}`,
};

export function MedicalAlertCard({ kind, name }: { kind: MedicalKind; name: string }) {
  const [shareState, setShareState] = useState<"" | "copied" | "nfc-ready" | "nfc-writing" | "nfc-done" | "nfc-unsupported" | "error">("");
  const shareText = MEDICAL_SHARE_TEXT[kind](name).trim();

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareState("copied");
      setTimeout(() => setShareState(""), 1800);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState(""), 2000);
    }
  };

  const shareViaText = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: kind === "neutropenic"
            ? "Neutropenic alert"
            : kind === "cytotoxic"
              ? "Cytotoxic alert"
              : "Transfusion requirements",
          text: shareText,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await copyText();
  };

  const shareViaNfc = async () => {
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setShareState("nfc-unsupported");
      setTimeout(() => setShareState(""), 2800);
      return;
    }
    try {
      setShareState("nfc-writing");
      // @ts-expect-error Web NFC is not yet in default TS DOM lib
      const reader = new window.NDEFReader();
      await reader.write({ records: [{ recordType: "text", data: shareText }] });
      setShareState("nfc-done");
      setTimeout(() => setShareState(""), 2800);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState(""), 2800);
    }
  };

  const colours = kind === "neutropenic"
    ? { banner: "#c6262c", bannerLabel: "Neutropenic Alert", heading: "#c6262c" }
    : kind === "cytotoxic"
      ? { banner: "#5b2a86", bannerLabel: "Cytotoxic Alert", heading: "#5b2a86" }
      : { banner: "#0d3b66", bannerLabel: "Transfusion Alert", heading: "#0d3b66" };

  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-[var(--border)] bg-white text-[#111]">
      <div className="flex" style={{ aspectRatio: "1.6 / 1" }}>
        <div className="flex items-center justify-center" style={{ width: "14%", backgroundColor: colours.banner }}>
          <div
            className="text-white font-black tracking-[0.3em] uppercase text-[13px] sm:text-[15px]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {colours.bannerLabel}
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          {kind === "neutropenic" ? (
            <>
              <div style={{ color: colours.heading }} className="text-xl sm:text-2xl font-bold leading-tight">I could be NEUTROPENIC</div>
              <div className="text-xs sm:text-sm text-[#333] mt-1">If my temperature is 37.8°C or higher</div>
              <div className="mt-2 font-bold text-sm sm:text-base">THIS IS A MEDICAL EMERGENCY</div>
              <div className="text-xs sm:text-sm mt-2">I must have the following done immediately:</div>
              <ul className="text-xs sm:text-sm mt-1 space-y-0.5 list-disc list-inside">
                <li>Medical Review and Consultant Notified</li>
                <li>Septic Screen (Obs, Chest X-Ray, MSU)</li>
                <li>FBC, ELFTs, Blood Cultures</li>
                <li>Intravenous Antibiotics</li>
              </ul>
            </>
          ) : kind === "cytotoxic" ? (
            <>
              <div style={{ color: colours.heading }} className="text-lg sm:text-xl font-bold leading-tight">I have been treated with</div>
              <div style={{ color: colours.heading }} className="text-2xl sm:text-3xl font-black leading-tight">CHEMOTHERAPY</div>
              <div className="text-xs sm:text-sm mt-2">
                Cytotoxic agents may be present in all my body fluids (urine, vomit, blood, faeces).
              </div>
              <div className="text-xs sm:text-sm mt-2 font-semibold">
                Cytotoxic safe handling precautions are required when handling all my body fluids for 7 days after treatment.
              </div>
            </>
          ) : (
            <>
              <div style={{ color: colours.heading }} className="text-lg sm:text-xl font-bold leading-tight">All blood products must be</div>
              <div style={{ color: colours.heading }} className="text-xl sm:text-2xl font-black leading-tight">IRRADIATED · LEUKODEPLETED · CMV-SAFE</div>
              <div className="text-xs sm:text-sm mt-2">
                I have had a purine-analogue treatment (cladribine / fludarabine).
              </div>
              <ul className="text-xs sm:text-sm mt-2 space-y-0.5 list-disc list-inside">
                <li>Gamma-irradiated ≥25 Gy</li>
                <li>Leukocyte-depleted</li>
                <li>CMV-seronegative or filtered</li>
              </ul>
              <div className="mt-2 font-bold text-sm sm:text-base" style={{ color: colours.heading }}>
                LIFELONG — applies in emergency/massive transfusion.
              </div>
            </>
          )}
          {name && (
            <div className="mt-auto pt-2 text-[11px] sm:text-xs text-[#555] border-t border-[#eee]">
              Bearer: <span className="font-semibold text-[#111]">{name}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 p-3 border-t border-[var(--border)] bg-[var(--surface-soft)]">
        <button
          onClick={shareViaText}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] text-[var(--primary-ink)] px-3 py-2 text-sm font-medium"
        >
          <Share2 size={14} /> Share as text
        </button>
        <button
          onClick={shareViaNfc}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium"
          title="Write to an NFC tag (Chrome on Android)"
        >
          <Radio size={14} /> Write to NFC
        </button>
        <button
          onClick={copyText}
          aria-label="Copy text"
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          {shareState === "copied" ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {shareState && shareState !== "copied" && (
        <div className="px-3 pb-3 text-xs text-[var(--ink-soft)]">
          {shareState === "nfc-writing" && "Hold an NFC tag against the back of your phone…"}
          {shareState === "nfc-done" && "Alert written to tag ✓"}
          {shareState === "nfc-unsupported" && "NFC write isn't supported on this browser — try Chrome on Android."}
          {shareState === "error" && "Something went wrong. Try again or use 'Share as text'."}
        </div>
      )}
    </div>
  );
}
