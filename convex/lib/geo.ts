export const DEFAULT_DWELL_MINUTES = 30;
export const WALK_SPEED_M_PER_MIN = 5000 / 60; // 5 km/h
export const TRONDHEIM_CENTER = { lat: 63.4305, lng: 10.3951 };

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type BarForEstimate = {
  lat?: number;
  lng?: number;
};

export function estimateRoute(bars: BarForEstimate[]): {
  estimatedDistanceMeters: number;
  estimatedWalkMinutes: number;
  estimatedDwellMinutes: number;
  estimatedTotalMinutes: number;
  stopDwellMinutes: number[];
  partial: boolean;
} {
  let distance = 0;
  let partial = false;
  for (let i = 0; i < bars.length - 1; i++) {
    const from = bars[i];
    const to = bars[i + 1];
    if (
      from?.lat == null ||
      from.lng == null ||
      to?.lat == null ||
      to.lng == null
    ) {
      partial = true;
      continue;
    }
    distance += haversineMeters(
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    );
  }
  const walkMinutes = Math.round(distance / WALK_SPEED_M_PER_MIN);
  const stopDwellMinutes = bars.map(() => DEFAULT_DWELL_MINUTES);
  const dwellMinutes = stopDwellMinutes.reduce((a, b) => a + b, 0);
  return {
    estimatedDistanceMeters: Math.round(distance),
    estimatedWalkMinutes: walkMinutes,
    estimatedDwellMinutes: dwellMinutes,
    estimatedTotalMinutes: walkMinutes + dwellMinutes,
    stopDwellMinutes,
    partial,
  };
}

/** End of next calendar day in Europe/Oslo, as epoch ms. */
export function endOfNextOsloDay(fromMs: number): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(fromMs));
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  // Approximate: next day 23:59:59 Oslo ≈ use UTC noon + 1 day then set to end
  // Better: construct date string and parse with offset guess (+02/+01)
  const next = new Date(Date.UTC(y, m - 1, d + 1, 21, 59, 59)); // ~23:59 CEST
  const max36h = fromMs + 36 * 60 * 60 * 1000;
  return Math.min(next.getTime(), max36h);
}

export type OpeningSlot = { day: number; open: string; close: string };

function parseHmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Ukedag 0=søn … 6=lør og minutter siden midnatt i Europe/Oslo. */
export function osloDayAndMinutes(now: number): { day: number; mins: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { day: dayMap[weekday] ?? 0, mins: hour * 60 + minute };
}

/** True if close ≤ open (nattåpent over midnatt), inkl. close "00:00" etter åpning samme kveld. */
export function isOvernightSlot(slot: OpeningSlot): boolean {
  return parseHmToMinutes(slot.close) <= parseHmToMinutes(slot.open);
}

/**
 * Does a slot tagged with opening-day `slot.day` cover Oslo wall-time
 * (`day`, `mins` since midnight)? Overnight slots extend into the next day.
 */
export function slotCoversOsloInstant(
  slot: OpeningSlot,
  day: number,
  mins: number,
): boolean {
  const openM = parseHmToMinutes(slot.open);
  const closeM = parseHmToMinutes(slot.close);

  if (slot.day === day) {
    if (isOvernightSlot(slot)) {
      // Opening day: open → midnight (close is next calendar day)
      return mins >= openM;
    }
    return mins >= openM && mins < closeM;
  }

  // Next calendar day after opening day (overnight tail)
  const nextDay = (slot.day + 1) % 7;
  if (nextDay === day && isOvernightSlot(slot)) {
    return mins < closeM;
  }
  return false;
}

/**
 * True if venue is open at `now` (Europe/Oslo).
 * Missing hours → assumed open.
 * Checks today's slots and previous day's overnight continuation.
 */
export function isOpenNow(
  openingHours: Array<OpeningSlot> | undefined,
  now: number,
): boolean {
  if (!openingHours || openingHours.length === 0) return true;
  const { day, mins } = osloDayAndMinutes(now);
  return openingHours.some((slot) => slotCoversOsloInstant(slot, day, mins));
}

const WINDOW_SAMPLE_MS = 15 * 60 * 1000;

/**
 * True if the venue is open for the entire [windowStart, windowEnd) interval
 * (Europe/Oslo). Missing hours → assumed open. Samples every 30 min + endpoints.
 */
export function isOpenDuringWindow(
  openingHours: Array<OpeningSlot> | undefined,
  windowStart: number,
  windowEnd: number,
): boolean {
  if (!openingHours || openingHours.length === 0) return true;
  if (windowEnd <= windowStart) return false;
  const stepMs = 30 * 60 * 1000;
  for (let t = windowStart; t < windowEnd; t += stepMs) {
    if (!isOpenNow(openingHours, t)) return false;
  }
  if (!isOpenNow(openingHours, windowEnd - 1)) return false;
  return true;
}

/**
 * True if open at any instant in [windowStart, windowEnd). Missing hours → open.
 */
export function isOpenAtAnyDuringWindow(
  openingHours: Array<OpeningSlot> | undefined,
  windowStart: number,
  windowEnd: number,
): boolean {
  if (!openingHours || openingHours.length === 0) return true;
  if (windowEnd <= windowStart) return false;
  for (let t = windowStart; t < windowEnd; t += WINDOW_SAMPLE_MS) {
    if (isOpenNow(openingHours, t)) return true;
  }
  if (isOpenNow(openingHours, windowEnd - 1)) return true;
  return false;
}

/**
 * First and last open instants within [windowStart, windowEnd).
 * Missing hours → full window. Null if never open in window.
 */
export function openSpanInWindow(
  openingHours: Array<OpeningSlot> | undefined,
  windowStart: number,
  windowEnd: number,
): { from: number; until: number } | null {
  if (!openingHours || openingHours.length === 0) {
    return { from: windowStart, until: windowEnd };
  }
  if (windowEnd <= windowStart) return null;
  let from: number | null = null;
  let until: number | null = null;
  for (let t = windowStart; t < windowEnd; t += WINDOW_SAMPLE_MS) {
    if (isOpenNow(openingHours, t)) {
      if (from == null) from = t;
      until = t + WINDOW_SAMPLE_MS;
    }
  }
  if (isOpenNow(openingHours, windowEnd - 1)) {
    if (from == null) from = windowEnd - 1;
    until = windowEnd;
  }
  if (from == null || until == null) return null;
  return { from, until: Math.min(until, windowEnd) };
}

type RouteBar = {
  lat?: number;
  lng?: number;
  openingHours?: Array<OpeningSlot>;
};

/**
 * Reorder stops so visits fit opening hours: early closing / already-open
 * venues earlier; late openers later. Greedy by earliest feasible arrival,
 * then nearest. Always runs when ≥2 stops (not only on partial coverage).
 */
export function orderRouteByOpeningHours<T extends RouteBar>(
  bars: T[],
  windowStart: number,
  windowEnd: number,
  startPos: { lat: number; lng: number },
): T[] {
  if (bars.length <= 1) return bars;

  const remaining = [...bars];
  const ordered: T[] = [];
  let t = windowStart;
  let pos = startPos;
  const dwellMs = DEFAULT_DWELL_MINUTES * 60 * 1000;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;
    let bestArrive = t;

    for (let i = 0; i < remaining.length; i++) {
      const b = remaining[i]!;
      const span = openSpanInWindow(b.openingHours, windowStart, windowEnd);
      const openFrom = span?.from ?? windowStart;
      const openUntil = span?.until ?? windowEnd;
      const hasCoords = b.lat != null && b.lng != null;
      const walkMs =
        ordered.length > 0 && hasCoords
          ? (haversineMeters(pos, { lat: b.lat!, lng: b.lng! }) /
              WALK_SPEED_M_PER_MIN) *
            60 *
            1000
          : 0;
      let arrive = ordered.length === 0 ? t : t + walkMs;
      if (arrive < openFrom) arrive = openFrom;
      const dist = hasCoords
        ? haversineMeters(pos, { lat: b.lat!, lng: b.lng! })
        : 50_000;
      // Prefer feasible visits; heavy penalty if already closed on arrival
      let score = arrive + dist;
      if (arrive >= openUntil) score += 7 * 24 * 60 * 60 * 1000;
      // Slight preference for earlier closing (visit while still open)
      score += (windowEnd - openUntil) * 0.01;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
        bestArrive = arrive;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    t = bestArrive + dwellMs;
    if (next.lat != null && next.lng != null) {
      pos = { lat: next.lat, lng: next.lng };
    }
  }

  return ordered;
}

/**
 * Varseltekst når stedet er åpent deler av vinduet, men ikke hele.
 * Null = dekker hele vinduet (eller ukjente timer → ingen varsel).
 */
export function hoursWarningForWindow(
  openingHours: Array<OpeningSlot> | undefined,
  windowStart: number,
  windowEnd: number,
): string | null {
  if (!openingHours || openingHours.length === 0) return null;
  if (isOpenDuringWindow(openingHours, windowStart, windowEnd)) return null;
  if (!isOpenAtAnyDuringWindow(openingHours, windowStart, windowEnd)) {
    return "Ikke åpent i tidsvinduet";
  }

  // Åpner etter vindusstart → «Åpner snart»; ellers stenger før vinduets slutt
  if (!isOpenNow(openingHours, windowStart)) {
    return "Åpner snart";
  }
  if (!isOpenNow(openingHours, windowEnd - 1)) {
    return "Stenger snart";
  }

  return "Stenger snart";
}

/** @deprecated Use hoursWarningForWindow */
export function closesAtInWindow(
  openingHours: Array<OpeningSlot> | undefined,
  windowStart: number,
  windowEnd: number,
): string | null {
  const msg = hoursWarningForWindow(openingHours, windowStart, windowEnd);
  if (msg === "Stenger snart") return "snart";
  return null;
}

/** Local calendar Y-M-D in Europe/Oslo for a given instant. */
export function osloYmd(fromMs: number): { y: number; m: number; d: number } {
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
export function osloWallTimeToUtc(
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
    const getPart = (t: string) =>
      Number(parts.find((p) => p.type === t)?.value ?? 0);
    const asUtc = Date.UTC(
      getPart("year"),
      getPart("month") - 1,
      getPart("day"),
      getPart("hour"),
      getPart("minute"),
    );
    guess += Date.UTC(y, m - 1, d, hour, minute) - asUtc;
  }
  return guess;
}

/**
 * Next calendar date ≥ today (Oslo) whose weekday matches `weekday` (0=søn…6=lør).
 * Includes today when it matches.
 */
export function nextOsloYmdForWeekday(
  fromMs: number,
  weekday: number,
): { y: number; m: number; d: number } {
  const today = osloYmd(fromMs);
  const { day: todayWeekday } = osloDayAndMinutes(fromMs);
  const delta = (weekday - todayWeekday + 7) % 7;
  // Advance civil date by delta days via UTC noon trick
  const base = Date.UTC(today.y, today.m - 1, today.d, 12, 0, 0);
  const target = new Date(base + delta * 24 * 60 * 60 * 1000);
  return {
    y: target.getUTCFullYear(),
    m: target.getUTCMonth() + 1,
    d: target.getUTCDate(),
  };
}

/** Slots that cover «nå» for display (today + overnight from yesterday). */
export function slotsCoveringNow(
  openingHours: Array<OpeningSlot> | undefined,
  now: number,
): OpeningSlot[] {
  if (!openingHours || openingHours.length === 0) return [];
  const { day, mins } = osloDayAndMinutes(now);
  return openingHours.filter((slot) => slotCoversOsloInstant(slot, day, mins));
}

/** Format opening hours line for aktiv runde; null if unknown. */
export function formatHoursForNow(
  openingHours: Array<OpeningSlot> | undefined,
  now: number,
): string | null {
  if (!openingHours || openingHours.length === 0) return null;
  const covering = slotsCoveringNow(openingHours, now);
  if (covering.length > 0) {
    return covering.map((s) => `${s.open}–${s.close}`).join(", ");
  }
  const { day } = osloDayAndMinutes(now);
  const todays = openingHours.filter((h) => h.day === day);
  if (todays.length === 0) return "Stengt nå";
  return todays.map((s) => `${s.open}–${s.close}`).join(", ");
}
