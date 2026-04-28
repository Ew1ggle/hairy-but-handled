import type { Metadata } from "next";

/** Per-route manifest override. iOS Safari's "Add to Home Screen" reads
 *  start_url from whichever manifest is linked on the current page —
 *  serving a manifest with start_url: "/signal-sweep" here means a pinned
 *  icon launches straight into Signal Sweep instead of falling back to "/".
 *  Apple-Web-App title is also overridden so the new icon labels
 *  "Sweep" rather than "Hairy but Handled". */
export const metadata: Metadata = {
  title: "Signal Sweep — Hairy but Handled",
  manifest: "/signal-sweep.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sweep",
    statusBarStyle: "default",
  },
};

export default function SignalSweepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
