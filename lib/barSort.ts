/** Sorteringsvalg for utested-katalogen (`/bars`). */

export type BarSortKey = "price" | "ratingCount" | "rating" | "combo";

export type SortableBar = {
  beerPrice?: number | null;
  rating?: number | null;
  ratingCount?: number | null;
};

export const BAR_SORT_OPTIONS: { value: BarSortKey; label: string }[] = [
  { value: "combo", label: "Kombo" },
  { value: "price", label: "Pris" },
  { value: "rating", label: "Rating" },
  { value: "ratingCount", label: "Antall" },
];

function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/**
 * Pris: billigere = høyere score. Soft floor så dyreste ikke får 0
 * (da ville geometrisk snitt drept stedet uansett rating).
 * Mangler pris → 0 (kombo krever alle tre).
 */
function priceScore(
  price: number | null | undefined,
  minPrice: number,
  maxPrice: number,
): number {
  if (price == null || !Number.isFinite(price)) return 0;
  if (maxPrice <= minPrice) return 1;
  const normalized = clamp01(1 - (price - minPrice) / (maxPrice - minPrice));
  return 0.2 + 0.8 * normalized;
}

/** Rating-kvalitet 1–5 → 0–1. Mangler → 0. */
function ratingQualityScore(rating: number | null | undefined): number {
  if (rating == null || !Number.isFinite(rating)) return 0;
  return clamp01((rating - 1) / 4);
}

/**
 * Antall vurderinger, log-skalert mot datasettets maks.
 * Unngår at ekstremt høyt antall alene dominerer.
 */
function ratingQuantityScore(
  count: number | null | undefined,
  maxCount: number,
): number {
  if (count == null || !Number.isFinite(count) || count <= 0) return 0;
  if (maxCount <= 0) return 0;
  return clamp01(Math.log1p(count) / Math.log1p(maxCount));
}

/**
 * Kombo: geometrisk snitt av pris, rating-kvalitet og antall.
 * Én svak/manglende faktor trekker kraftig ned — ingen enkeltfaktor
 * kan alene holde et sted på toppen.
 */
export function comboScore(
  bar: SortableBar,
  minPrice: number,
  maxPrice: number,
  maxCount: number,
): number {
  const p = priceScore(bar.beerPrice, minPrice, maxPrice);
  const q = ratingQualityScore(bar.rating);
  const n = ratingQuantityScore(bar.ratingCount, maxCount);
  if (p <= 0 || q <= 0 || n <= 0) return 0;
  return Math.cbrt(p * q * n);
}

function compareMissingLast(
  a: number | null | undefined,
  b: number | null | undefined,
  ascending: boolean,
): number {
  const aMiss = a == null || !Number.isFinite(a);
  const bMiss = b == null || !Number.isFinite(b);
  if (aMiss && bMiss) return 0;
  if (aMiss) return 1;
  if (bMiss) return -1;
  return ascending ? a - b : b - a;
}

export function sortBars<T extends SortableBar>(
  bars: T[],
  sortKey: BarSortKey,
): T[] {
  if (bars.length === 0) return bars;

  const prices = bars
    .map((b) => b.beerPrice)
    .filter((p): p is number => p != null && Number.isFinite(p));
  const counts = bars
    .map((b) => b.ratingCount)
    .filter((c): c is number => c != null && Number.isFinite(c));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;

  const indexed = bars.map((bar, index) => ({ bar, index }));

  indexed.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "price":
        cmp = compareMissingLast(a.bar.beerPrice, b.bar.beerPrice, true);
        break;
      case "rating":
        cmp = compareMissingLast(a.bar.rating, b.bar.rating, false);
        break;
      case "ratingCount":
        cmp = compareMissingLast(a.bar.ratingCount, b.bar.ratingCount, false);
        break;
      case "combo": {
        const sa = comboScore(a.bar, minPrice, maxPrice, maxCount);
        const sb = comboScore(b.bar, minPrice, maxPrice, maxCount);
        cmp = sb - sa;
        break;
      }
    }
    if (cmp !== 0) return cmp;
    return a.index - b.index;
  });

  return indexed.map((x) => x.bar);
}
