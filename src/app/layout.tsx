import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: { default: "BandPilot", template: "%s · BandPilot" },
  description: "Organizace koncertů, sestav, dopravy a hlasování pro hudební kapely.",
  applicationName: "BandPilot",
  appleWebApp: { capable: true, title: "BandPilot", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="cs">
      <body>
        {user ? <AppShell user={user}>{children}</AppShell> : children}
        <ServiceWorker />
      </body>
    </html>
  );
}
