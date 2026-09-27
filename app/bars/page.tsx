"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";

export default function BarsPage() {
  const { ensureGuest, guestToken } = useGuest();
  const now = useMemo(() => Date.now(), []);
  const bars = useQuery(api.bars.listActive, {
    guestToken: guestToken ?? undefined,
    now,
  });

  useEffect(() => {
    void ensureGuest();
  }, [ensureGuest]);

  return (
    <AppShell>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Utesteder
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Kuraterte stopp i Trondheim — plukk dem når du setter sammen ruten.
      </p>

      <ul className="mt-6 space-y-2">
        {bars === undefined && (
          <li className="text-sm text-[var(--muted)]">Laster…</li>
        )}
        {bars?.length === 0 && (
          <li className="text-sm text-[var(--muted)]">
            Ingen utesteder i katalogen ennå.
          </li>
        )}
        {(bars ?? []).map((bar) => (
          <li
            key={bar._id}
            className="rounded-xl bg-[var(--surface)] px-3 py-3"
          >
            <p className="text-sm text-[var(--text)]">{bar.name}</p>
            {bar.address && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">{bar.address}</p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Link href="/routes/new">
          <PrimaryButton type="button">Start kvelden</PrimaryButton>
        </Link>
      </div>
    </AppShell>
  );
}
