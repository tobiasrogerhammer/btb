import type { Metadata } from "next";

const title = "Ny rute";
const description =
  "Bygg eller få foreslått en bar-til-bar-rute for kvelden i Trondheim.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title: `${title} — NextRound`, description },
  twitter: { title: `${title} — NextRound`, description },
};

export default function NewRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
