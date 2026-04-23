"use client";
import { Download, Share2, Plus, X, Check } from "lucide-react";
import { useEffect, useState } from "react";

/** beforeinstallprompt is a non-standard Chrome-family event. Type it minimally. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/** Dismissable "Install Hairy but Handled on your phone" banner + install flow.
 *  - Android / desktop Chrome: fires the native install prompt via the stashed
 *    beforeinstallprompt event.
 *  - iOS Safari: no programmatic API — shows a modal walking the user through
 *    Share → Add to Home Screen.
 *  - When the app is already running as an installed PWA (display-mode: standalone)
 *    the banner hides. A one-session "not now" dismiss is stored in sessionStorage
 *    so it reappears next launch rather than persisting forever. */
export function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already running as an installed PWA?
    const mq = window.matchMedia("(display-mode: standalone)");
    const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (mq.matches || navStandalone) setIsStandalone(true);

    // iOS Safari detection (no beforeinstallprompt support)
    const ua = window.navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));

    // Session-scoped dismiss flag
    try {
      if (window.sessionStorage.getItem("hbh_install_dismissed") === "1") {
        setDismissed(true);
      }
    } catch { /* sessionStorage may be blocked */ }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setJustInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Don't show when already installed, already dismissed this session,
  // or when there's no install path available (non-Chrome desktop etc.)
  if (isStandalone || justInstalled) return null;
  if (dismissed) return null;
  if (!deferred && !isIos) return null;

  const onInstall = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    }
  };

  const onDismiss = () => {
    setDismissed(true);
    try { window.sessionStorage.setItem("hbh_install_dismissed", "1"); } catch {}
  };

  return (
    <>
      <div
        className="mb-3 rounded-2xl border-2 border-[var(--primary)] bg-[var(--surface)] px-4 py-3 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-[var(--primary-ink)] flex items-center justify-center shrink-0">
          <Download size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Install on your phone</div>
          <div className="text-xs text-[var(--ink-soft)]">
            Lock-screen access + notifications. One tap.
          </div>
        </div>
        <button
          type="button"
          onClick={onInstall}
          className="shrink-0 rounded-xl bg-[var(--primary)] text-[var(--primary-ink)] px-3 py-2 text-sm font-semibold"
        >
          Install
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-[var(--ink-soft)] p-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      {showIosModal && (
        <IosInstallModal onClose={() => setShowIosModal(false)} />
      )}
    </>
  );
}

/** iOS Safari has no programmatic install API, so we walk the user through
 *  the Add-to-Home-Screen steps manually. */
function IosInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="display text-xl text-[var(--ink)]">Add to Home Screen</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--ink-soft)] -mt-1 -mr-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-[var(--ink-soft)] mt-0.5 mb-4">
          iOS doesn't let apps install themselves from Safari — Apple requires you to do it. Takes 20 seconds.
        </p>

        <ol className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--primary-ink)] text-xs font-bold flex items-center justify-center">1</span>
            <div className="flex-1 text-sm">
              Tap the <b>Share</b> button at the bottom of Safari
              <span className="inline-flex items-center gap-1 ml-2 text-[var(--primary)]">
                <Share2 size={14} />
              </span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--primary-ink)] text-xs font-bold flex items-center justify-center">2</span>
            <div className="flex-1 text-sm">
              Scroll down and tap <b>Add to Home Screen</b>
              <span className="inline-flex items-center gap-1 ml-2 text-[var(--primary)]">
                <Plus size={14} />
              </span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--primary-ink)] text-xs font-bold flex items-center justify-center">3</span>
            <div className="flex-1 text-sm">
              Tap <b>Add</b> in the top-right
              <span className="inline-flex items-center gap-1 ml-2 text-[var(--primary)]">
                <Check size={14} />
              </span>
            </div>
          </li>
        </ol>

        <div className="mt-5 rounded-xl bg-[var(--surface-soft)] p-3 text-xs text-[var(--ink-soft)]">
          Once installed, HBH opens full-screen from your home screen and can receive push notifications on your lock screen.
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-[var(--primary)] text-[var(--primary-ink)] font-semibold py-3.5"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
