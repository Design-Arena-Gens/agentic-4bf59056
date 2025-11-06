import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Anon Wave",
  description: "Drop anonymous notes into a shared real-time channel.",
  metadataBase: new URL("https://agentic-4bf59056.vercel.app"),
  icons: {
    icon: "/favicon.svg"
  },
  openGraph: {
    title: "Anon Wave",
    description: "Drop anonymous notes into a shared real-time channel.",
    url: "https://agentic-4bf59056.vercel.app",
    siteName: "Anon Wave",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Anon Wave",
    description: "Drop anonymous notes into a shared real-time channel."
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
