import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { GuestProvider } from "@/components/GuestProvider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
});

const siteUrl = "https://nextround.no";

/**
 * Link preview images.
 * Rename/version these paths when assets change — platforms cache by URL.
 * Square listed first so Snapchat (1:1) picks it; landscape for FB/Twitter.
 */
const shareImageSquare = {
  url: "/og-share-square.png",
  width: 1024,
  height: 1024,
  alt: "NextRound - Klar for kaos?",
  type: "image/png",
} as const;

const shareImageLandscape = {
  url: "/og-share.png",
  width: 1200,
  height: 630,
  alt: "NextRound - Bar til bar",
  type: "image/png",
} as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NextRound - Bar til bar",
    template: "%s — NextRound",
  },
  description: "Legger opp din rute for kvelden — finn ditt neste stopp her.",
  openGraph: {
    type: "website",
    locale: "nb_NO",
    url: siteUrl,
    siteName: "nextround",
    title: "NextRound - Bar til bar",
    description: "Legger opp din rute for kvelden — finn ditt neste stopp her.",
    images: [shareImageSquare, shareImageLandscape],
  },
  twitter: {
    card: "summary_large_image",
    title: "NextRound - Bar til bar",
    description: "Legger opp din rute for kvelden — finn ditt neste stopp her.",
    images: [shareImageLandscape.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full antialiased">
        <GoogleAnalytics />
        <ConvexClientProvider>
          <GuestProvider>{children}</GuestProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
