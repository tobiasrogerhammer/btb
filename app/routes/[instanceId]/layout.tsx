import type { Metadata } from "next";

const title = "Kveld";
const description =
  "Følg ruten din bar til bar — sjekk inn, ta bilder og hold tempoet.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} — NextRound`, description },
  twitter: { title: `${title} — NextRound`, description },
};

export default function RouteInstanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
