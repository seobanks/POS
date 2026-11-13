import type { Metadata, Viewport } from "next";
import { CaptainClientShell } from "./captain-client-shell";

export const metadata: Metadata = {
  title: "SERVIO Captain — Smart Restaurant Service",
  description:
    "SERVIO Smart Restaurant Service by Hanva POS — Waiter & Captain Tablet & Mobile Ordering App",
  manifest: "/captain/manifest.webmanifest?v=2",
  appleWebApp: {
    capable: true,
    title: "SERVIO Captain",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/captain-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/captain-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/captain-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/captain-apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CaptainClientShell>{children}</CaptainClientShell>;
}
