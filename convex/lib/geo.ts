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

function osloDayAndMinutes(now: number): { day: number; mins: number } {
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

export function isOpenNow(
  openingHours:
    | Array<{ day: number; open: string; close: string }>
    | undefined,
  now: number,
): boolean {
  if (!openingHours || openingHours.length === 0) return true;
  const { day, mins } = osloDayAndMinutes(now);
  const slots = openingHours.filter((h) => h.day === day);
  if (slots.length === 0) return false;
  return slots.some((slot) => {
    const [oh, om] = slot.open.split(":").map(Number);
    const [ch, cm] = slot.close.split(":").map(Number);
    const openM = (oh ?? 0) * 60 + (om ?? 0);
    let closeM = (ch ?? 0) * 60 + (cm ?? 0);
    if (closeM <= openM) closeM += 24 * 60; // overnight
    const t = mins < openM && closeM > 24 * 60 ? mins + 24 * 60 : mins;
    return t >= openM && t < closeM;
  });
}

/**
 * True if the venue is open for the entire [windowStart, windowEnd) interval
 * (Europe/Oslo). Missing hours → assumed open. Samples every 30 min + endpoints.
 */
export function isOpenDuringWindow(
  openingHours:
    | Array<{ day: number; open: string; close: string }>
    | undefined,
  windowStart: number,
  windowEnd: number,
): boolean {
  if (!openingHours || openingHours.length === 0) return true;
  if (windowEnd <= windowStart) return false;
  const stepMs = 30 * 60 * 1000;
  for (let t = windowStart; t < windowEnd; t += stepMs) {
    if (!isOpenNow(openingHours, t)) return false;
  }
  // Ensure last moment before end is covered
  if (!isOpenNow(openingHours, windowEnd - 1)) return false;
  return true;
}
