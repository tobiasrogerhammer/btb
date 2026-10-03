"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { Beer, Star } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";
import { formatHoursForNow } from "@/convex/lib/geo";
import { mapsPlaceUrl } from "@/lib/maps";

/** Google Maps–stil sted-ikon (skrå firkant med svingpil). */
function MapsPlaceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M21.71 11.29 12.71 2.29a.996.996 0 0 0-1.41 0l-9 9a.996.996 0 0 0 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 0 0 0-1.41M14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5L17.5 11z" />
    </svg>
  );
}

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
        {(bars ?? []).map((bar) => {
          const hoursLabel = formatHoursForNow(bar.openingHours, now);
          return (
            <li
              key={bar._id}
              className="flex items-start gap-2 rounded-xl bg-[var(--surface)] px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text)]">{bar.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {bar.rating != null && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] leading-none text-[var(--muted)]">
                      <Star
                        className="size-2.5 fill-[#F5C518] text-[#F5C518]"
                        aria-hidden
                      />
                      <span className="tabular-nums">
                        {bar.rating.toFixed(1).replace(".", ",")}
                      </span>
                      {bar.ratingCount != null && (
                        <span className="tabular-nums text-[var(--muted)]/70">
                          ({bar.ratingCount})
                        </span>
                      )}
                    </span>
                  )}
                  {bar.beerPrice != null && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] leading-none text-[var(--muted)]">
                      <Beer className="size-2.5" aria-hidden />
                      <span className="tabular-nums">{bar.beerPrice} kr</span>
                    </span>
                  )}
                  {hoursLabel && (
                    <span className="text-[11px] leading-none text-[var(--muted)]">
                      {hoursLabel}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={mapsPlaceUrl(bar)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Vis ${bar.name} i Google Maps`}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--brand)]"
              >
                <MapsPlaceIcon className="size-5" />
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <Link href="/routes/new">
          <PrimaryButton type="button">Start kvelden</PrimaryButton>
        </Link>
      </div>
    </AppShell>
  );
}
