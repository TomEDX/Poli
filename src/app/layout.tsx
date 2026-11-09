import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { sidebarPreferenceScript } from "@/components/navigation/sidebar-preference";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poli.",
  description:
    "Comprendre les programmes de l'élection présidentielle et l'activité parlementaire, sans orienter son choix.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The script below sets the sidebar's state on this element before React hydrates it.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarPreferenceScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
