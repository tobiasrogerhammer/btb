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

const siteUrl = "https://btb.tobiashammer.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BtB — Bar til bar",
  description: "Legger opp din rute for kvelden — finn ditt neste stopp her.",
  openGraph: {
    type: "website",
    locale: "nb_NO",
    url: siteUrl,
    siteName: "BtB",
    title: "BtB — Bar til bar",
    description: "Legger opp din rute for kvelden — finn ditt neste stopp her.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BtB — Bar til bar",
    description: "Legger opp din rute for kvelden — finn ditt neste stopp her.",
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
