import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import AuthGate from "@/components/AuthGate";
import ThemeAuto from "@/components/ThemeAuto";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Hairy but Handled",
  description: "Notice the Shifts. Act on the Flags.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Hairy but Handled",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#00c9bd",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh">
        <ThemeAuto />
        <SessionProvider>
          <AuthGate>{children}</AuthGate>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
