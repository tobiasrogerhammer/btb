import type { Metadata } from "next";

const title = "Logg inn";
const description =
  "Logg inn eller opprett konto for å lagre kveldene dine på nextround.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} — NextRound`, description },
  twitter: { title: `${title} — NextRound`, description },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
