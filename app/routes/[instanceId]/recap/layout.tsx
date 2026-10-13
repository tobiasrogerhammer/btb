import type { Metadata } from "next";

const title = "Recap";
const description =
  "Se tilbake på kvelden — historie, bilder og «Vi overlevde».";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} — NextRound`, description },
  twitter: { title: `${title} — NextRound`, description },
};

export default function RecapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
