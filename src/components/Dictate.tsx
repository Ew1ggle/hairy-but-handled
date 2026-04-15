"use client";
import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SpeechRecognitionEventLike = Event & { results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number } };
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event) => void) | null;
  start: () => void;
  stop: () => void;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
};

/**
 * Small mic button — appends dictated text to whatever's already in the value.
 * Uses the Web Speech API (works on iOS Safari, Chrome, Edge).
 */
export default function Dictate({ value, onAppend }: { value: string; onAppend: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const startTextRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as WindowWithSpeech;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const start = () => {
    const w = window as unknown as WindowWithSpeech;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-AU";
    rec.interimResults = true;
    rec.continuous = true;
    startTextRef.current = value;
    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const joined = [startTextRef.current, (finalText + interim).trim()].filter(Boolean).join(" ");
      onAppend(joined);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  if (supported === false) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm border ${listening ? "bg-[var(--alert)] text-white border-[var(--alert)]" : "border-[var(--border)]"}`}
      aria-label={listening ? "Stop dictation" : "Start dictation"}
    >
      {listening ? <><Square size={13} /> Stop</> : <><Mic size={13} /> Dictate</>}
    </button>
  );
}
