"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/ui";

/** Alias: Mine kvelder bor på Min profil. */
export default function RoutesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/me#kvelder");
  }, [router]);

  return (
    <AppShell>
      <p className="text-[var(--muted)]">Sender deg til Min profil…</p>
    </AppShell>
  );
}
