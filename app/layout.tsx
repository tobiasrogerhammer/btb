import type { Metadata } from "next";
import { headers } from "next/headers";
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
const shareDescription =
  "Legger opp din rute for kvelden — finn ditt neste stopp her.";

/**
 * One og:image only — iMessage shows every og:image as a collage.
 * Snapbot gets the square asset; everyone else gets landscape.
 * Rename/version paths when assets change (platforms cache by URL).
 */
const shareImageLandscape = {
  url: "/og-share.png",
  width: 1200,
  height: 630,
  alt: "NextRound - Bar til bar",
  type: "image/png",
} as const;

const shareImageSquare = {
  url: "/og-share-square.png",
  width: 1024,
  height: 1024,
  alt: "NextRound - Klar for kaos?",
  type: "image/png",
} as const;

function isSnapPreviewBot(userAgent: string): boolean {
  return /Snap URL Preview Service|Snapchat/i.test(userAgent);
}

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") ?? "";
  const shareImage = isSnapPreviewBot(userAgent)
    ? shareImageSquare
    : shareImageLandscape;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "NextRound - Bar til bar",
      template: "%s — NextRound",
    },
    description: shareDescription,
    openGraph: {
      type: "website",
      locale: "nb_NO",
      url: siteUrl,
      siteName: "nextround",
      title: "NextRound - Bar til bar",
      description: shareDescription,
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: "NextRound - Bar til bar",
      description: shareDescription,
      images: [shareImageLandscape.url],
    },
  };
}

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
