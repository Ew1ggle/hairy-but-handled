"use client";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { isToday, parseISO, differenceInHours } from "date-fns";
import { AlertCircle, Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePatientName } from "@/lib/usePatientName";

/**
 * Surface a reminder when the patient's daily log hasn't been done yet today.
 * Visible to everyone in the care circle — most useful for support people / carers.
 * Also requests browser notification permission and sends a notification.
 */
export default function MissedLogBanner() {
  const { role, memberships } = useSession();
  const daily = useEntries("daily");
  const todayLog = daily.find((d) => isToday(parseISO(d.createdAt)));
  const today = todayLog && (todayLog as unknown as { manuallyLogged?: boolean }).manuallyLogged === true ? todayLog : null;
  const notifiedRef = useRef(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  // Check notification support
  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
    } else {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Send browser notification for missed log
  useEffect(() => {
    if (today || !role || notifiedRef.current) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    notifiedRef.current = true;

    const latest = daily[0];
    const hoursSince = latest ? differenceInHours(new Date(), parseISO(latest.createdAt)) : null;

    new Notification("Hairy but Handled", {
      body: role === "patient"
        ? `You haven't logged today yet${hoursSince ? ` (last entry was ${hoursSince}h ago)` : ""}. Tap to log now.`
        : `Today's log hasn't been done yet${hoursSince ? ` (last entry was ${hoursSince}h ago)` : ""}.`,
      icon: "/favicon.ico",
      tag: "missed-log",
    });
  }, [today, role, daily]);

  const { firstName, isSupport } = usePatientName();

  if (!role) return null;
  if (today) return null;
  const latest = daily[0];
  const hoursSince = latest ? differenceInHours(new Date(), parseISO(latest.createdAt)) : null;

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  return (
    <div className="no-print mb-3 space-y-2">
      <div className="rounded-xl bg-[var(--alert-soft)] border border-[var(--alert)] px-3 py-2.5 text-sm flex items-start gap-2">
        <AlertCircle size={16} className="text-[var(--alert)] shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-[var(--alert)]">
            {isSupport ? `${firstName || "The patient"} hasn't been logged today yet` : "You haven't logged today yet"}
          </div>
          {hoursSince != null && (
            <div className="text-xs text-[var(--ink-soft)]">Last entry was {hoursSince}h ago.</div>
          )}
        </div>
        <Link href="/log" className="shrink-0 text-xs font-medium text-[var(--primary)] underline underline-offset-2">Log now</Link>
      </div>

      {notifPermission === "default" && (
        <button
          onClick={requestNotifPermission}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs flex items-center justify-center gap-2 text-[var(--ink-soft)]"
        >
          <Bell size={14} /> Enable notifications so you never miss a log
        </button>
      )}
    </div>
  );
}
