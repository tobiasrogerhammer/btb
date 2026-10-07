"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
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
import {
  formatHoursForNow,
  hoursWarningForWindow,
  isOpenAtAnyDuringWindow,
  nextOsloYmdForWeekday,
  osloDayAndMinutes,
} from "@/convex/lib/geo";
import { mapsPlaceUrl } from "@/lib/maps";

function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes / 5) * 5);
  if (total < 60) return `ca. ${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `ca. ${hours} t`;
  return `ca. ${hours} t ${mins} min`;
}

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

const BEER_PRICE_MIN = 75;
const BEER_PRICE_MAX = 150;
const BEER_PRICE_STEP = 5;

/** Mandag → søndag for dropdown (value = 0=søn … 6=lør). */
const OUTING_WEEKDAY_OPTIONS: { value: number; label: string; short: string }[] =
  [
    { value: 1, label: "Mandag", short: "Man" },
    { value: 2, label: "Tirsdag", short: "Tir" },
    { value: 3, label: "Onsdag", short: "Ons" },
    { value: 4, label: "Torsdag", short: "Tor" },
    { value: 5, label: "Fredag", short: "Fre" },
    { value: 6, label: "Lørdag", short: "Lør" },
    { value: 0, label: "Søndag", short: "Søn" },
  ];

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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Default tidsvindu: nå (Oslo) → nå + 5 timer (overnight hvis over midnatt). */
function defaultTimeWindowHm(fromMs: number): { startHm: string; endHm: string } {
  const { mins } = osloDayAndMinutes(fromMs);
  const endMins = (mins + 5 * 60) % (24 * 60);
  const toHm = (total: number) =>
    `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
  return { startHm: toHm(mins), endHm: toHm(endMins) };
}

/** Window [start, end) as epoch ms; overnight if end ≤ start on outing Y-M-D. */
function windowFromHm(
  startHm: string,
  endHm: string,
  outing: { y: number; m: number; d: number },
): { windowStart: number; windowEnd: number } {
  const { y, m, d } = outing;
  const s = parseHm(startHm);
  const e = parseHm(endHm);
  const windowStart = osloWallTimeToUtc(y, m, d, s.hour, s.minute);
  const endDay =
    e.hour * 60 + e.minute <= s.hour * 60 + s.minute ? d + 1 : d;
  const windowEnd = osloWallTimeToUtc(y, m, endDay, e.hour, e.minute);
  return { windowStart, windowEnd };
}

/** Kuraterte favoritt-runder (matcher seed-navn). */
const POPULAR_ROUTES: { id: string; name: string; blurb: string; barNames: string[] }[] = [
  {
    id: "bakklandet",
    name: "Bakklandet",
    blurb: "Broer, brygger og god stemning",
    barNames: ["Den Gode Nabo", "Antikvariatet", "Bodegaen", "Café Løkka"],
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
    barNames: ["Kos", "Antikvariatet", "Bodegaen", "Studentersamfundet"],
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
  const [lastEstimateMinutes, setLastEstimateMinutes] = useState<number | null>(
    null,
  );
  const [showOptions, setShowOptions] = useState(false);
  const [maxBeerPrice, setMaxBeerPrice] = useState(BEER_PRICE_MAX);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [outingWeekday, setOutingWeekday] = useState(
    () => osloDayAndMinutes(Date.now()).day,
  );
  const [windowDefaults] = useState(() => defaultTimeWindowHm(Date.now()));
  const [windowStartHm, setWindowStartHm] = useState(windowDefaults.startHm);
  const [windowEndHm, setWindowEndHm] = useState(windowDefaults.endHm);
  const [pendingAdd, setPendingAdd] = useState<{
    id: Id<"bars">;
    name: string;
    reasons: string[];
  } | null>(null);

  const outingYmd = useMemo(
    () => nextOsloYmdForWeekday(now, outingWeekday),
    [now, outingWeekday],
  );

  const timeWindow = useMemo(
    () => windowFromHm(windowStartHm, windowEndHm, outingYmd),
    [windowStartHm, windowEndHm, outingYmd],
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

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (maxBeerPrice < BEER_PRICE_MAX) parts.push(`Maks ${maxBeerPrice} kr`);
    if (minRating != null) {
      parts.push(`${minRating.toFixed(1).replace(".", ",")}+`);
    }
    const fmt = (hm: string) => {
      const [h, m] = hm.split(":");
      return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
    };
    const dayShort =
      OUTING_WEEKDAY_OPTIONS.find((o) => o.value === outingWeekday)?.short ??
      "";
    parts.push(`${dayShort} ${fmt(windowStartHm)}–${fmt(windowEndHm)}`);
    return parts.join(" · ");
  }, [maxBeerPrice, minRating, outingWeekday, windowEndHm, windowStartHm]);

  const hasCustomFilters = useMemo(() => {
    const todayWeekday = osloDayAndMinutes(now).day;
    return (
      maxBeerPrice < BEER_PRICE_MAX ||
      minRating != null ||
      windowStartHm !== windowDefaults.startHm ||
      windowEndHm !== windowDefaults.endHm ||
      outingWeekday !== todayWeekday
    );
  }, [
    maxBeerPrice,
    minRating,
    now,
    outingWeekday,
    windowDefaults.endHm,
    windowDefaults.startHm,
    windowEndHm,
    windowStartHm,
  ]);

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

  /** Valgte stopp først (i rute-rekkefølge), deretter hele resten av katalogen. */
  const catalogBars = useMemo(() => {
    if (!bars) return [];
    const selectedSet = new Set(barIds);
    const selected = barIds
      .map((id) => bars.find((b) => b._id === id))
      .filter((b): b is (typeof bars)[number] => b != null);
    const rest = bars.filter((b) => !selectedSet.has(b._id));
    return [...selected, ...rest];
  }, [bars, barIds]);

  // Filters change → drop manual lock so suggest re-applies
  useEffect(() => {
    setManualEdit(false);
    setLastEstimateMinutes(null);
  }, [maxBeerPrice, minRating, timeWindow]);

  const selectedBars = (bars ?? []).filter((b) => barIds.includes(b._id));
  const ordered = barIds
    .map((id) => selectedBars.find((b) => b._id === id))
    .filter(Boolean) as NonNullable<(typeof selectedBars)[number]>[];

  function filterMismatchReasons(bar: {
    beerPrice?: number;
    rating?: number;
    openingHours?: Array<{ day: number; open: string; close: string }>;
  }): string[] {
    const reasons: string[] = [];
    if (bar.beerPrice != null && bar.beerPrice > maxBeerPrice) {
      reasons.push("ølpris");
    } else if (maxBeerPrice < BEER_PRICE_MAX && bar.beerPrice == null) {
      reasons.push("ølpris");
    }
    if (minRating != null && (bar.rating == null || bar.rating < minRating)) {
      reasons.push("rating");
    }
    if (
      !isOpenAtAnyDuringWindow(
        bar.openingHours,
        timeWindow.windowStart,
        timeWindow.windowEnd,
      )
    ) {
      reasons.push("åpningstid");
    }
    return reasons;
  }

  function hoursWarningForBar(bar: {
    openingHours?: Array<{ day: number; open: string; close: string }>;
  }): string | null {
    return hoursWarningForWindow(
      bar.openingHours,
      timeWindow.windowStart,
      timeWindow.windowEnd,
    );
  }

  function addBar(id: Id<"bars">) {
    if (barIds.includes(id)) return;
    const next = [...barIds, id];
    setBarIds(next);
    setStopCount(next.length);
    setManualEdit(true);
    setLastEstimateMinutes(null);
    setUsedSuggest(false);
  }

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

  function moveStop(index: number, delta: -1 | 1) {
    reorder(index, index + delta);
  }

  function toggleBar(id: Id<"bars">) {
    if (barIds.includes(id)) {
      const next = barIds.filter((x) => x !== id);
      setBarIds(next);
      setStopCount(next.length);
      setManualEdit(true);
      setLastEstimateMinutes(null);
      setUsedSuggest(false);
      return;
    }
    const bar = bars?.find((b) => b._id === id);
    if (!bar) return;
    const reasons = filterMismatchReasons(bar);
    if (reasons.length > 0) {
      setPendingAdd({ id, name: bar.name, reasons });
      return;
    }
    addBar(id);
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

        <div className="relative z-10 -mt-6 px-0.5 pt-2">
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
                showOptions || hasCustomFilters
                  ? "border-[var(--brand)]/50 text-[var(--brand)]"
                  : "border-white/10 text-[var(--text)] hover:border-[var(--brand)]/50"
              }`}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <p className="mb-2 text-xs text-[var(--muted)]">{filterSummary}</p>

        {showOptions && (
          <div
            id="route-options"
            className="mb-3 space-y-3 py-1"
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
                  style={
                    {
                      "--beer-price-pct": `${
                        ((maxBeerPrice - BEER_PRICE_MIN) /
                          (BEER_PRICE_MAX - BEER_PRICE_MIN)) *
                        100
                      }%`,
                    } as CSSProperties
                  }
                  className="beer-price-slider h-1.5 w-full"
                />
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--text)]">
                  {maxBeerPrice} kr
                </span>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs text-[var(--text)]">Tidsvindu</p>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="outing-weekday">
                  Når skal du ut?
                </label>
                <select
                  id="outing-weekday"
                  value={outingWeekday}
                  onChange={(e) => setOutingWeekday(Number(e.target.value))}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-[var(--text)]"
                >
                  {OUTING_WEEKDAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="window-start">
                  Fra
                </label>
                <input
                  id="window-start"
                  type="time"
                  value={windowStartHm}
                  onChange={(e) => setWindowStartHm(e.target.value)}
                  className="shrink-0 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-[var(--text)]"
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
                  className="shrink-0 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-[var(--text)]"
                />
              </div>
            </div>
          </div>
        )}

        {showOptions && (
          <div
            className="mb-3 border-t border-white/10"
            aria-hidden
          />
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
          <ul className="divide-y divide-white/10">
            {ordered.map((bar, index) => {
              const hoursWarning = hoursWarningForBar(bar);
              const showHoursWarning =
                hoursWarning != null &&
                hoursWarning !== "Ikke åpent i tidsvinduet";
              const hoursLabel = formatHoursForNow(
                bar.openingHours,
                timeWindow.windowStart,
              );
              return (
              <li key={bar._id} className="py-3 first:pt-1">
                <div className="flex items-center gap-2">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Flytt ${bar.name} opp`}
                    disabled={index === 0}
                    onClick={() => moveStop(index, -1)}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)] disabled:opacity-25"
                  >
                    <ChevronUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Flytt ${bar.name} ned`}
                    disabled={index === ordered.length - 1}
                    onClick={() => moveStop(index, 1)}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)] disabled:opacity-25"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium leading-tight tracking-tight text-[var(--text)]">
                    {bar.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] leading-none text-[var(--muted)]">
                    {bar.rating != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star
                          className="size-2.5 fill-[#F5C518] text-[#F5C518]"
                          aria-hidden
                        />
                        <span className="tabular-nums">
                          {bar.rating.toFixed(1).replace(".", ",")}
                        </span>
                        {bar.ratingCount != null && (
                          <span className="tabular-nums opacity-70">
                            ({bar.ratingCount})
                          </span>
                        )}
                      </span>
                    )}
                    {bar.beerPrice != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <Beer className="size-2.5" aria-hidden />
                        <span className="tabular-nums">{bar.beerPrice} kr</span>
                      </span>
                    )}
                    {hoursLabel && (
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          showHoursWarning
                            ? "font-medium text-[#F59E0B]"
                            : ""
                        }`}
                        title={
                          showHoursWarning ? (hoursWarning ?? undefined) : undefined
                        }
                      >
                        {showHoursWarning ? (
                          <AlertTriangle
                            className="size-2.5 shrink-0"
                            aria-hidden
                          />
                        ) : (
                          <Clock className="size-2.5 shrink-0" aria-hidden />
                        )}
                        <span>{hoursLabel}</span>
                        {showHoursWarning && (
                          <span className="sr-only"> ({hoursWarning})</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <a
                    href={mapsPlaceUrl(bar)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Vis ${bar.name} i Google Maps`}
                    className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--brand)]"
                  >
                    <MapsPlaceIcon className="size-5" />
                  </a>
                  <button
                    type="button"
                    aria-label="Fjern"
                    onClick={() => removeAt(index)}
                    className="inline-flex size-9 items-center justify-center rounded-md text-red-500/90 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2 flex items-end gap-2">
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                setShowPopular((v) => !v);
                setShowCatalog(false);
              }}
              aria-expanded={showPopular}
              aria-haspopup="menu"
              aria-controls="popular-routes"
              className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
                showPopular
                  ? "border-white/15 bg-[var(--brand)]/15 text-[var(--brand)]"
                  : "border-white/10 bg-white/[0.04] text-[var(--text)] hover:bg-white/[0.07]"
              }`}
            >
              Populære ruter
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${
                  showPopular ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
            {showPopular && (
              <>
                <button
                  type="button"
                  aria-label="Lukk meny"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setShowPopular(false)}
                />
                <div
                  id="popular-routes"
                  role="menu"
                  aria-label="Populære ruter"
                  className="absolute bottom-full left-0 z-40 mb-2 w-full overflow-hidden rounded-lg border border-white/10 bg-[var(--surface)] py-1 shadow-lg"
                >
                  {POPULAR_ROUTES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      role="menuitem"
                      onClick={() => applyPopular(preset)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition hover:bg-white/5"
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
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[11px] leading-none text-[var(--muted)]">
              Antall stopp
            </span>
            <div className="flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-1.5">
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
                  · {barIds.length} valgt av {bars.length}
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
            <ul id="bar-catalog" className="mt-1.5 space-y-2" role="list">
              {catalogBars.map((bar) => {
                const selected = barIds.includes(bar._id);
                const hoursWarning = hoursWarningForBar(bar);
                const hoursClosedOutside =
                  hoursWarning === "Ikke åpent i tidsvinduet";
                const hoursPartialWarning =
                  hoursWarning != null && !hoursClosedOutside;
                const hoursLabel = formatHoursForNow(
                  bar.openingHours,
                  timeWindow.windowStart,
                );
                const hoursAlert = hoursClosedOutside || hoursPartialWarning;
                return (
                  <li
                    key={bar._id}
                    className={`rounded-lg px-2 py-2 ${
                      selected ? "bg-[var(--brand)]/20" : "bg-black/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBar(bar._id)}
                        aria-label={
                          selected
                            ? `Fjern ${bar.name} fra ruten`
                            : `Legg til ${bar.name}`
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-base font-medium leading-tight tracking-tight text-[var(--text)]">
                          {bar.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
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
                              <span className="tabular-nums">
                                {bar.beerPrice} kr
                              </span>
                            </span>
                          )}
                          {hoursLabel && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[11px] leading-none ${
                                hoursClosedOutside
                                  ? "font-medium text-red-400"
                                  : hoursPartialWarning
                                    ? "font-medium text-[#F59E0B]"
                                    : "text-[var(--muted)]"
                              }`}
                              title={
                                hoursAlert
                                  ? (hoursWarning ?? undefined)
                                  : undefined
                              }
                            >
                              {hoursAlert ? (
                                <AlertTriangle
                                  className="size-2.5 shrink-0"
                                  aria-hidden
                                />
                              ) : (
                                <Clock
                                  className="size-2.5 shrink-0"
                                  aria-hidden
                                />
                              )}
                              <span>{hoursLabel}</span>
                              {hoursAlert && (
                                <span className="sr-only">
                                  {" "}
                                  ({hoursWarning})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </button>
                      <a
                        href={mapsPlaceUrl(bar)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Vis ${bar.name} i Google Maps`}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--brand)]"
                      >
                        <MapsPlaceIcon className="size-5" />
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
                    </div>
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

      {pendingAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => setPendingAdd(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="filter-mismatch-title"
            aria-describedby="filter-mismatch-desc"
            className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="filter-mismatch-title"
              className="font-[family-name:var(--font-display)] text-lg text-[var(--text)]"
            >
              Matcher ikke filtrene
            </h2>
            <p
              id="filter-mismatch-desc"
              className="mt-2 text-sm leading-snug text-[var(--muted)]"
            >
              {pendingAdd.name} matcher ikke valgte filter (
              {pendingAdd.reasons.join(", ")}). Vil du legge til likevel?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingAdd(null)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-[var(--text)] transition hover:bg-white/5"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  addBar(pendingAdd.id);
                  setPendingAdd(null);
                }}
                className="flex-1 rounded-lg bg-[var(--brand)] px-3 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                Legg til
              </button>
            </div>
          </div>
        </div>
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
