/** Client-side Web Push helpers — subscribe, unsubscribe, persist the
 *  subscription to Supabase. Writes go directly via the client SDK; RLS
 *  ensures a user can only read/write their own subscriptions. */
import { supabase } from "./supabase";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** VAPID public key needs to be a Uint8Array for PushManager.subscribe. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.warn("sw register failed", e);
    return null;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await registerServiceWorker();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

/** Subscribe this device to push. Returns the subscription or throws if
 *  permission was denied. Persists to Supabase push_subscriptions table. */
export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) throw new Error("Push not supported on this device");
  if (!VAPID_PUBLIC) throw new Error("VAPID public key not configured");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notification permission denied");

  const reg = await registerServiceWorker();
  if (!reg) throw new Error("Service worker registration failed");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // TS's lib.dom.d.ts doesn't accept a plain Uint8Array for
      // applicationServerKey on all versions; cast to BufferSource.
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
    });
  }

  await persistSubscription(sub);
  return sub;
}

/** Unsubscribe this device from push and remove the row from Supabase. */
export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch {}
  const sb = supabase();
  if (sb) {
    await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}

async function persistSubscription(sub: PushSubscription): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Must be signed in to enable notifications");

  const json = sub.toJSON();
  const keys = json.keys ?? {};
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;

  const { error } = await sb.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: (keys as { p256dh?: string }).p256dh ?? "",
      auth: (keys as { auth?: string }).auth ?? "",
      user_agent: ua,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}
