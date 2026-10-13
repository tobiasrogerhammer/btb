import type { Metadata } from "next";

const title = "Min profil";
const description =
  "Se kveldene dine, åpne recap og administrer kontoen din på nextround.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} — NextRound`, description },
  twitter: { title: `${title} — NextRound`, description },
};

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
