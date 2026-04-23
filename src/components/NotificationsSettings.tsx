"use client";
import { Bell, BellOff, MessageSquare, Mail, ExternalLink, Check, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getCurrentSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "busy";

/** Settings UI for push notifications — enable / disable per device.
 *  Also links out to Telegram + email alternatives for people who don't
 *  want to install the PWA. */
export function NotificationsSettings() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!isPushSupported()) {
        setState("unsupported");
        return;
      }
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const sub = await getCurrentSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  const enable = async () => {
    setError(null);
    setState("busy");
    try {
      await subscribeToPush();
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enable notifications");
      setState("off");
    }
  };

  const disable = async () => {
    setError(null);
    setState("busy");
    try {
      await unsubscribeFromPush();
      setState("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn off notifications");
      setState("on");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold flex items-center gap-1.5">
          <Bell size={16} /> Push notifications
        </h2>
        <p className="text-xs text-[var(--ink-soft)] mt-0.5 leading-relaxed">
          Get a lock-screen alert on this device when a tripwire is raised. Each
          person in your circle enables it on their own phone. Free, no SMS.
        </p>
      </div>

      {state === "loading" && (
        <div className="text-sm text-[var(--ink-soft)]">Checking device…</div>
      )}

      {state === "unsupported" && (
        <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-3 text-sm">
          <div className="font-medium mb-1">Not supported on this device</div>
          <div className="text-xs text-[var(--ink-soft)] leading-relaxed">
            Push needs a modern browser. On iPhone, install Hairy but Handled to your
            home screen first (Safari → Share → Add to Home Screen) then open it from the
            home-screen icon — push becomes available there.
          </div>
        </div>
      )}

      {state === "denied" && (
        <div className="rounded-xl bg-[var(--alert-soft)] border border-[var(--alert)] p-3 text-sm">
          <div className="font-medium text-[var(--alert)] mb-1 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Notifications are blocked
          </div>
          <div className="text-xs text-[var(--ink-soft)] leading-relaxed">
            You'll need to re-allow them in your browser settings before they can be turned
            on here. On iPhone: Settings → Notifications → find the app. On Chrome: the lock
            icon next to the URL → Site settings.
          </div>
        </div>
      )}

      {(state === "off" || state === "busy") && (
        <button
          type="button"
          onClick={enable}
          disabled={state === "busy"}
          className="w-full rounded-2xl bg-[var(--primary)] text-[var(--primary-ink)] font-semibold py-3.5 disabled:opacity-50"
        >
          {state === "busy" ? "Working…" : "Enable notifications on this device"}
        </button>
      )}

      {state === "on" && (
        <div className="space-y-2">
          <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--primary)] p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-[var(--primary)] mb-1">
              <Check size={14} /> Notifications on
            </div>
            <div className="text-xs text-[var(--ink-soft)]">
              This device will get a lock-screen alert when a tripwire fires.
            </div>
          </div>
          <button
            type="button"
            onClick={disable}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <BellOff size={14} /> Turn off on this device
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-[var(--alert)]">{error}</div>
      )}

      <AlternativeChannels />
    </div>
  );
}

function AlternativeChannels() {
  return (
    <div className="border-t border-[var(--border)] pt-4 space-y-3">
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold">
          Other ways to get alerted
        </div>
        <p className="text-xs text-[var(--ink-soft)] mt-1">
          If Push isn't right for someone, they can still get alerted through one of these.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] p-3 space-y-1.5">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <Mail size={14} className="text-[var(--primary)]" /> Email fallback
        </div>
        <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
          Support people who haven't enabled push on any device will automatically receive an
          email when a tripwire is raised. Nothing to set up — their invite email already
          verifies the address.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare size={14} className="text-[var(--primary)]" /> Telegram bot
        </div>
        <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
          If someone already uses Telegram, a bot can deliver alerts like a text. Free, reliable,
          keeps working even if the app is closed.
        </p>
        <div className="text-xs text-[var(--ink-soft)] leading-relaxed space-y-1">
          <div>
            <b>Setup (one-off, ~10 min):</b>
          </div>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>
              Open Telegram on your phone and message{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--primary)] font-medium inline-flex items-center gap-0.5"
              >
                @BotFather
                <ExternalLink size={10} />
              </a>
            </li>
            <li>Send <b>/newbot</b>, follow the prompts to name it, copy the <b>HTTP API token</b></li>
            <li>
              Tell me the token (or paste it into a new <code>TELEGRAM_BOT_TOKEN</code> env var) and I'll wire it as a second alert channel.
            </li>
          </ol>
          <p className="mt-1">
            Supporting guide:{" "}
            <a
              href="https://core.telegram.org/bots/tutorial"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--primary)] font-medium inline-flex items-center gap-0.5"
            >
              Telegram bot tutorial
              <ExternalLink size={10} />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
