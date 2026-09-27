"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  GripVertical,
  Info,
  Minus,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Star,
  Beer,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell, PrimaryButton } from "@/components/ui";
import { TrondheimMap } from "@/components/TrondheimMap";
import { useGuest } from "@/components/GuestProvider";
import {
  minRatingToThreshold,
  RatingFilter,
  thresholdToMinRating,
} from "@/components/RatingFilter";
import { isOpenDuringWindow } from "@/convex/lib/geo";

function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes / 5) * 5);
  if (total < 60) return `ca. ${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `ca. ${hours} t`;
  return `ca. ${hours} t ${mins} min`;
}

/** Google Maps–stil veibeskrivelse (skrå firkant med svingpil). */
function MapsDirectionsIcon({ className }: { className?: string }) {
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

function mapsDirectionsUrl(bar: {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}): string {
  if (bar.lat != null && bar.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${bar.lat},${bar.lng}`;
  }
  const q = bar.address?.trim() || `${bar.name} Trondheim`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

const BEER_PRICE_MIN = 75;
const BEER_PRICE_MAX = 150;
const BEER_PRICE_STEP = 5;

/** Local calendar Y-M-D in Europe/Oslo for a given instant. */
function osloYmd(fromMs: number): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(fromMs));
  return {
    y: Number(parts.find((p) => p.type === "year")?.value),
    m: Number(parts.find((p) => p.type === "month")?.value),
    d: Number(parts.find((p) => p.type === "day")?.value),
  };
}

/** Epoch ms for Y-M-D HH:mm interpreted in Europe/Oslo. */
function osloWallTimeToUtc(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
): number {
  let guess = Date.UTC(y, m - 1, d, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Oslo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const get = (t: string) =>
      Number(parts.find((p) => p.type === t)?.value ?? 0);
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
    );
    guess += Date.UTC(y, m - 1, d, hour, minute) - asUtc;
  }
  return guess;
}

function parseHm(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(":").map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

/** Window [start, end) as epoch ms from HH:mm; overnight if end ≤ start. */
function windowFromHm(
  startHm: string,
  endHm: string,
  fromMs: number,
): { windowStart: number; windowEnd: number } {
  const { y, m, d } = osloYmd(fromMs);
  const s = parseHm(startHm);
  const e = parseHm(endHm);
  const windowStart = osloWallTimeToUtc(y, m, d, s.hour, s.minute);
  const endDay = e.hour * 60 + e.minute <= s.hour * 60 + s.minute ? d + 1 : d;
  const windowEnd = osloWallTimeToUtc(y, m, endDay, e.hour, e.minute);
  return { windowStart, windowEnd };
}

/** Kuraterte favoritt-runder (matcher seed-navn). */
const POPULAR_ROUTES: { id: string; name: string; blurb: string; barNames: string[] }[] = [
  {
    id: "bakklandet",
    name: "Bakklandet",
    blurb: "Broer, brygger og god stemning",
    barNames: ["Den Gode Nabo", "Antikvariatet", "Bodegaen", "Smulen"],
  },
  {
    id: "solsiden",
    name: "Solsiden",
    blurb: "Havna og litt mer tempo",
    barNames: ["Work-Work", "Ramp Pub", "Café 3B", "Bar Circus"],
  },
  {
    id: "sentrum",
    name: "Sentrum-sløyfe",
    blurb: "Kort mellom stoppene",
    barNames: ["Kos", "Smulen", "Bodegaen", "Studentersamfundet"],
  },
];

export default function NewRoutePage() {
  const router = useRouter();
  const { ensureGuest, guestToken } = useGuest();
  const now = useMemo(() => Date.now(), []);
  const [stopCount, setStopCount] = useState(4);
  const [seed, setSeed] = useState(() => Date.now());
  const [barIds, setBarIds] = useState<Id<"bars">[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [routeNotice, setRouteNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usedSuggest, setUsedSuggest] = useState(true);
  const [manualEdit, setManualEdit] = useState(false);
  const [showPopular, setShowPopular] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [lastEstimateMinutes, setLastEstimateMinutes] = useState<number | null>(
    null,
  );
  const [showOptions, setShowOptions] = useState(false);
  const [maxBeerPrice, setMaxBeerPrice] = useState(BEER_PRICE_MAX);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [windowStartHm, setWindowStartHm] = useState("20:00");
  const [windowEndHm, setWindowEndHm] = useState("02:00");

  const timeWindow = useMemo(
    () => windowFromHm(windowStartHm, windowEndHm, now),
    [windowStartHm, windowEndHm, now],
  );

  const suggestArgs = useMemo(
    () => ({
      mode: "stops" as const,
      stopCount: Math.max(stopCount, 2),
      seed,
      now,
      maxBeerPrice,
      ...(minRating != null ? { minRating } : {}),
      windowStart: timeWindow.windowStart,
      windowEnd: timeWindow.windowEnd,
    }),
    [stopCount, seed, now, maxBeerPrice, minRating, timeWindow],
  );

  const bars = useQuery(api.bars.listActive, {
    guestToken: guestToken ?? undefined,
    now,
  });

  const suggestion = useQuery(api.routes.suggest, suggestArgs);

  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (maxBeerPrice < BEER_PRICE_MAX) parts.push(`≤ ${maxBeerPrice} kr`);
    const fmt = (hm: string) => {
      const [h, m] = hm.split(":");
      return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
    };
    if (windowStartHm !== "20:00" || windowEndHm !== "02:00") {
      parts.push(`${fmt(windowStartHm)}–${fmt(windowEndHm)}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [maxBeerPrice, windowStartHm, windowEndHm]);

  useEffect(() => {
    void ensureGuest();
  }, [ensureGuest]);

  useEffect(() => {
    if (!suggestion || manualEdit) return;
    if (suggestion.message && suggestion.barIds.length > 0) {
      setRouteNotice(suggestion.message);
      setError(null);
    } else if (suggestion.message && suggestion.barIds.length === 0) {
      setRouteNotice(null);
      setError(suggestion.message);
    } else {
      setRouteNotice(null);
      setError(null);
    }
    if (suggestion.barIds.length > 0) {
      setBarIds(suggestion.barIds);
      setStopCount(suggestion.barIds.length);
      setUsedSuggest(true);
      setLastEstimateMinutes(suggestion.estimatedTotalMinutes);
    }
  }, [suggestion, manualEdit]);

  const createAndStart = useMutation(api.routes.createTemplateAndStart);

  const loadingRoute = suggestion === undefined && !manualEdit;

  /** Valgte stopp først (i rute-rekkefølge), resten etterpå — filtert. */
  const catalogBars = useMemo(() => {
    if (!bars) return [];
    const selectedSet = new Set(barIds);
    const selected = barIds
      .map((id) => bars.find((b) => b._id === id))
      .filter((b): b is (typeof bars)[number] => b != null);
    const rest = bars.filter((b) => {
      if (selectedSet.has(b._id)) return false;
      if (b.beerPrice == null || b.beerPrice > maxBeerPrice) return false;
      if (minRating != null) {
        if (b.rating == null || b.rating < minRating) return false;
      }
      if (
        !isOpenDuringWindow(
          b.openingHours,
          timeWindow.windowStart,
          timeWindow.windowEnd,
        )
      ) {
        return false;
      }
      return true;
    });
    return [...selected, ...rest];
  }, [bars, barIds, maxBeerPrice, minRating, timeWindow]);

  // Filters change → drop manual lock so suggest re-applies
  useEffect(() => {
    setManualEdit(false);
    setLastEstimateMinutes(null);
  }, [maxBeerPrice, minRating, timeWindow]);

  const selectedBars = (bars ?? []).filter((b) => barIds.includes(b._id));
  const ordered = barIds
    .map((id) => selectedBars.find((b) => b._id === id))
    .filter(Boolean) as NonNullable<(typeof selectedBars)[number]>[];

  function adjustStops(delta: number) {
    const next = Math.min(12, Math.max(2, barIds.length + delta));
    setManualEdit(false);
    setStopCount(next);
    setSeed(Date.now());
    setLastEstimateMinutes(null);
  }

  function reshuffle() {
    setError(null);
    setRouteNotice(null);
    setManualEdit(false);
    setStopCount(Math.max(2, barIds.length || stopCount));
    setSeed(Date.now());
    setLastEstimateMinutes(null);
  }

  function removeAt(index: number) {
    const next = barIds.filter((_, i) => i !== index);
    setBarIds(next);
    setStopCount(next.length);
    setManualEdit(true);
    setRouteNotice(null);
    setLastEstimateMinutes(null);
    setUsedSuggest(false);
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= barIds.length || to >= barIds.length) {
      return;
    }
    const next = [...barIds];
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    setBarIds(next);
    setManualEdit(true);
    setUsedSuggest(false);
    setLastEstimateMinutes(null);
  }

  function toggleBar(id: Id<"bars">) {
    const next = barIds.includes(id)
      ? barIds.filter((x) => x !== id)
      : [...barIds, id];
    setBarIds(next);
    setStopCount(next.length);
    setManualEdit(true);
    setLastEstimateMinutes(null);
    setUsedSuggest(false);
  }

  function applyPopular(preset: (typeof POPULAR_ROUTES)[number]) {
    if (!bars || bars.length === 0) {
      setError("Katalogen er ikke klar ennå");
      return;
    }
    const byName = new Map(bars.map((b) => [b.name, b._id]));
    const ids = preset.barNames
      .map((name) => byName.get(name))
      .filter((id): id is Id<"bars"> => id !== undefined);
    if (ids.length < 2) {
      setError("Fant for få stopp for denne runden");
      return;
    }
    setError(null);
    setBarIds(ids);
    setStopCount(ids.length);
    setManualEdit(true);
    setUsedSuggest(true);
    setLastEstimateMinutes(null);
    setShowPopular(false);
  }

  async function onStart() {
    setError(null);
    if (barIds.length < 2) {
      setError("Minst to stopp");
      return;
    }
    setBusy(true);
    try {
      const token = await ensureGuest();
      const instanceId = await createAndStart({
        barIds,
        source: usedSuggest ? "generated" : "manual",
        guestToken: token,
        now: Date.now(),
      });
      router.push(`/routes/${instanceId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="relative mt-2">
        <TrondheimMap fadeIntoSurface />

        <div className="relative z-10 -mt-12 rounded-xl bg-[var(--surface)] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--text)]">
            Din rute
            {lastEstimateMinutes != null && (
              <span className="ml-1.5 text-sm font-normal text-[var(--muted)]">
                · {formatDuration(lastEstimateMinutes)}
              </span>
            )}
          </h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={reshuffle}
              disabled={loadingRoute}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--text)] transition hover:border-[var(--brand)]/50 disabled:opacity-40"
            >
              <Shuffle className="size-3.5" />
              Ny rute
            </button>
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              aria-expanded={showOptions}
              aria-controls="route-options"
              aria-label="Options"
              className={`inline-flex size-8 items-center justify-center rounded-lg border transition ${
                showOptions || activeFilterLabel
                  ? "border-[var(--brand)]/50 text-[var(--brand)]"
                  : "border-white/10 text-[var(--text)] hover:border-[var(--brand)]/50"
              }`}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        {activeFilterLabel && (
          <p className="mb-2 text-xs text-[var(--muted)]">{activeFilterLabel}</p>
        )}

        {showOptions && (
          <div
            id="route-options"
            className="mb-3 space-y-3 rounded-lg border border-white/10 bg-black/25 px-3 py-3"
          >
            <div>
              <p className="mb-1.5 text-xs text-[var(--text)]">Min. rating</p>
              <RatingFilter
                value={minRatingToThreshold(minRating)}
                onChange={(threshold) =>
                  setMinRating(thresholdToMinRating(threshold))
                }
              />
            </div>

            <div>
              <label
                htmlFor="max-beer-price"
                className="mb-1.5 block text-xs text-[var(--text)]"
              >
                Maks ølpris
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="max-beer-price"
                  type="range"
                  min={BEER_PRICE_MIN}
                  max={BEER_PRICE_MAX}
                  step={BEER_PRICE_STEP}
                  value={maxBeerPrice}
                  onChange={(e) => setMaxBeerPrice(Number(e.target.value))}
                  className="h-1.5 w-full accent-[var(--brand)]"
                />
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--text)]">
                  {maxBeerPrice} kr
                </span>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs text-[var(--text)]">Tidsvindu</p>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="window-start">
                  Fra
                </label>
                <input
                  id="window-start"
                  type="time"
                  value={windowStartHm}
                  onChange={(e) => setWindowStartHm(e.target.value)}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-[var(--text)]"
                />
                <span className="text-xs text-[var(--muted)]">–</span>
                <label className="sr-only" htmlFor="window-end">
                  Til
                </label>
                <input
                  id="window-end"
                  type="time"
                  value={windowEndHm}
                  onChange={(e) => setWindowEndHm(e.target.value)}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-[var(--text)]"
                />
              </div>
            </div>
          </div>
        )}

        {routeNotice && (
          <div
            role="status"
            className="mb-3 flex items-start gap-2.5 rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/12 px-3 py-2.5"
          >
            <Info
              className="mt-0.5 size-4 shrink-0 text-[var(--brand)]"
              aria-hidden
            />
            <p className="text-sm leading-snug text-[var(--text)]">
              {routeNotice}
            </p>
          </div>
        )}

        {loadingRoute && ordered.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">
            Finner rute…
          </p>
        ) : ordered.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">
            Ingen stopp ennå. Prøv «Ny rute» eller plukk fra katalogen.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((bar, index) => (
              <li
                key={bar._id}
                className="flex items-center gap-2 rounded-lg bg-black/30 px-2 py-2"
              >
                <button
                  type="button"
                  draggable
                  aria-label={`Dra for å flytte ${bar.name}`}
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-[var(--muted)] active:cursor-grabbing"
                >
                  <GripVertical className="size-4" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <p className="truncate text-sm leading-none text-[var(--text)]">
                    {bar.name}
                  </p>
                  {bar.rating != null && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none text-[var(--muted)]">
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
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none text-[var(--muted)]">
                      <Beer className="size-2.5" aria-hidden />
                      <span className="tabular-nums">{bar.beerPrice} kr</span>
                    </span>
                  )}
                </div>
                <a
                  href={mapsDirectionsUrl(bar)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Veibeskrivelse til ${bar.name}`}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--brand)]"
                >
                  <MapsDirectionsIcon className="size-5" />
                </a>
                <button
                  type="button"
                  aria-label="Fjern"
                  onClick={() => removeAt(index)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md p-1 text-red-500 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <X className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setShowPopular((v) => !v);
              setShowCatalog(false);
            }}
            aria-expanded={showPopular}
            aria-controls="popular-routes"
            className={`inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg border px-3 text-sm font-medium transition ${
              showPopular
                ? "border-white/15 bg-[var(--brand)]/15 text-[var(--brand)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-white/10 bg-white/[0.04] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.07]"
            }`}
          >
            Populære ruter
          </button>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[11px] leading-none text-[var(--muted)]">
              Antall stopp
            </span>
            <div className="flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <button
                type="button"
                aria-label="Færre stopp"
                disabled={barIds.length <= 2}
                onClick={() => adjustStops(-1)}
                className="flex size-8 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)] disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span
                className="min-w-8 text-center font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums leading-none"
                aria-live="polite"
              >
                {barIds.length}
              </span>
              <button
                type="button"
                aria-label="Flere stopp"
                disabled={barIds.length >= 12}
                onClick={() => adjustStops(1)}
                className="flex size-8 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)] disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {showPopular && (
          <ul
            id="popular-routes"
            className="mt-2 space-y-1"
            role="list"
          >
            {POPULAR_ROUTES.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => applyPopular(preset)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg bg-black/20 px-3 py-2.5 text-left transition hover:bg-black/35"
                >
                  <span className="text-sm text-[var(--text)]">
                    {preset.name}
                    <span className="text-[var(--muted)]">
                      {" "}
                      · {preset.barNames.length} stopp
                    </span>
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {preset.blurb}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => {
              setShowCatalog((v) => !v);
              setShowPopular(false);
            }}
            aria-expanded={showCatalog}
            aria-controls="bar-catalog"
            className="flex w-full items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-left text-sm transition hover:bg-black/40"
          >
            <span className="min-w-0 flex-1 text-[var(--text)]">
              Alle stopp
              {bars != null && (
                <span className="text-[var(--muted)]">
                  {" "}
                  · {barIds.length} valgt
                  {activeFilterLabel
                    ? ` · ${catalogBars.length} treff`
                    : ` av ${bars.length}`}
                </span>
              )}
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${
                showCatalog ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          {showCatalog && (
            <ul id="bar-catalog" className="mt-1.5 space-y-1" role="list">
              {catalogBars.map((bar) => {
                const selected = barIds.includes(bar._id);
                return (
                  <li
                    key={bar._id}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                      selected
                        ? "bg-[var(--brand)]/20 text-[var(--text)]"
                        : "bg-black/20 text-[var(--muted)]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleBar(bar._id)}
                      aria-label={
                        selected
                          ? `Fjern ${bar.name} fra ruten`
                          : `Legg til ${bar.name}`
                      }
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      <span className="truncate text-sm leading-none text-[var(--text)]">
                        {bar.name}
                      </span>
                      {bar.rating != null && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none text-[var(--muted)]">
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
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] leading-none text-[var(--muted)]">
                          <Beer className="size-2.5" aria-hidden />
                          <span className="tabular-nums">{bar.beerPrice} kr</span>
                        </span>
                      )}
                    </button>
                    <a
                      href={mapsDirectionsUrl(bar)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Veibeskrivelse til ${bar.name}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--brand)]"
                    >
                      <MapsDirectionsIcon className="size-5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleBar(bar._id)}
                      aria-label={
                        selected
                          ? `Fjern ${bar.name} fra ruten`
                          : `Legg til ${bar.name}`
                      }
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)]"
                    >
                      {selected ? (
                        <Minus className="size-4" aria-hidden />
                      ) : (
                        <Plus className="size-4" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      </div>

      {error && (
        <p className="mt-4 mb-24 text-sm text-red-400">{error}</p>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto mx-auto max-w-md bg-gradient-to-t from-[var(--bg)] from-40% via-[var(--bg)]/90 via-65% to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10">
          <PrimaryButton
            disabled={busy || barIds.length < 2}
            onClick={() => void onStart()}
          >
            {busy ? "Starter…" : "Start kvelden"}
          </PrimaryButton>
        </div>
      </div>
      {/* Spacer so last content isn't hidden behind fixed CTA */}
      <div className="h-28" aria-hidden />
    </AppShell>
  );
}
