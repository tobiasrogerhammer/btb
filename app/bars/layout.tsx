import type { Metadata } from "next";

const title = "Utesteder";
const description =
  "Utforsk barer i Trondheim — åpningstid, ølpris og rating. Legg til egne stopp.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} — NextRound`, description },
  twitter: { title: `${title} — NextRound`, description },
};

export default function BarsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
