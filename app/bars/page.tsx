"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { AlertTriangle, Beer, ChevronDown, Clock, Star } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";
import {
  formatHoursForNow,
  hoursStatusForNow,
  isOpenNow,
} from "@/convex/lib/geo";
import { mapsPlaceUrl } from "@/lib/maps";
import { BAR_SORT_OPTIONS, type BarSortKey, sortBars } from "@/lib/barSort";

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
  const [sortKey, setSortKey] = useState<BarSortKey>("combo");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const bars = useQuery(api.bars.listActive, {
    guestToken: guestToken ?? undefined,
    now,
  });

  useEffect(() => {
    void ensureGuest();
  }, [ensureGuest]);

  const sortedBars = useMemo(() => {
    if (!bars) return undefined;
    const filtered = openNowOnly
      ? bars.filter((bar) => isOpenNow(bar.openingHours, now))
      : bars;
    return sortBars(filtered, sortKey);
  }, [bars, sortKey, openNowOnly, now]);

  return (
    <AppShell>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Utesteder
      </h1>
      <p className="mt-1 text-pretty text-sm text-[var(--muted)]">
        Utvalgte stopp i Trondheim — plukk og velg når du setter sammen ruten
        din. Trykk ikonet for mer info fra Google Maps.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <label
            htmlFor="bar-sort"
            className="shrink-0 text-xs text-[var(--muted)]"
          >
            Sorter
          </label>
          <div className="relative w-[7.25rem]">
            <select
              id="bar-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as BarSortKey)}
              className="w-full appearance-none rounded-md border border-white/10 bg-black/30 py-1.5 pr-7 pl-2 text-sm text-[var(--text)]"
            >
              {BAR_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            id="open-now-label"
            className="text-xs text-[var(--muted)]"
          >
            Åpent nå
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={openNowOnly}
            aria-labelledby="open-now-label"
            onClick={() => setOpenNowOnly((v) => !v)}
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
              openNowOnly ? "bg-[var(--brand)]" : "bg-white/15"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                openNowOnly ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
      {sortKey === "combo" && (
        <p className="mt-1.5 text-pretty text-xs text-[var(--muted)]">
          Kombo viser steder med god pris, høy rating og mange vurderinger.
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {sortedBars === undefined && (
          <li className="text-sm text-[var(--muted)]">Laster…</li>
        )}
        {sortedBars?.length === 0 && (
          <li className="text-sm text-[var(--muted)]">
            {openNowOnly
              ? "Ingen åpne utesteder akkurat nå — prøv uten filter."
              : "Ingen utesteder i katalogen ennå."}
          </li>
        )}
        {(sortedBars ?? []).map((bar) => {
          const hoursLabel = formatHoursForNow(bar.openingHours, now);
          const hoursStatus = hoursStatusForNow(bar.openingHours, now);
          const hoursClosed = hoursStatus === "closed";
          const hoursClosingSoon = hoursStatus === "closing_soon";
          const hoursAlert = hoursClosed || hoursClosingSoon;
          const hoursSr =
            hoursStatus === "closed"
              ? "Ikke åpent nå"
              : hoursStatus === "closing_soon"
                ? "Stenger snart"
                : undefined;
          return (
            <li
              key={bar._id}
              className="flex items-start gap-2 rounded-xl bg-[var(--surface)] px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-display)] text-lg leading-snug text-balance text-[var(--text)]">
                  {bar.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {bar.rating != null && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] leading-none text-[var(--muted)]/80">
                      <Star
                        className="size-2.5 fill-[#F5C518] text-[#F5C518]"
                        aria-hidden
                      />
                      <span className="tabular-nums">
                        {bar.rating.toFixed(1).replace(".", ",")}
                      </span>
                      {bar.ratingCount != null && (
                        <span className="tabular-nums text-[var(--muted)]/60">
                          ({bar.ratingCount})
                        </span>
                      )}
                    </span>
                  )}
                  {bar.beerPrice != null && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] leading-none text-[var(--muted)]/80">
                      <Beer className="size-2.5" aria-hidden />
                      <span className="tabular-nums">{bar.beerPrice} kr</span>
                    </span>
                  )}
                  {hoursLabel && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] leading-none ${
                        hoursClosed
                          ? "font-medium text-red-400"
                          : hoursClosingSoon
                            ? "font-medium text-[#F59E0B]"
                            : "text-[var(--muted)]/80"
                      }`}
                      title={hoursSr}
                    >
                      {hoursAlert ? (
                        <AlertTriangle
                          className="size-2.5 shrink-0"
                          aria-hidden
                        />
                      ) : (
                        <Clock className="size-2.5 shrink-0" aria-hidden />
                      )}
                      <span>{hoursLabel}</span>
                      {hoursSr && <span className="sr-only"> — {hoursSr}</span>}
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
