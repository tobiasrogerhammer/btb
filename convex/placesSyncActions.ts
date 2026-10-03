"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";

type PlacePeriod = {
  open?: { day?: number; hour?: number; minute?: number };
  close?: { day?: number; hour?: number; minute?: number };
};

type PlaceDetails = {
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  regularOpeningHours?: {
    periods?: PlacePeriod[];
  };
};

type SyncResult = {
  updated: number;
  skipped: number;
  errors: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function periodToSlots(
  periods: PlacePeriod[] | undefined,
): Array<{ day: number; open: string; close: string }> | undefined {
  if (!periods || periods.length === 0) return undefined;
  const slots: Array<{ day: number; open: string; close: string }> = [];
  for (const p of periods) {
    if (p.open?.day == null || p.open.hour == null) continue;
    const open = `${pad2(p.open.hour)}:${pad2(p.open.minute ?? 0)}`;
    const closeHour = p.close?.hour ?? 0;
    const closeMinute = p.close?.minute ?? 0;
    const close = `${pad2(closeHour)}:${pad2(closeMinute)}`;
    slots.push({ day: p.open.day, open, close });
  }
  return slots.length > 0 ? slots : undefined;
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetails> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "rating,userRatingCount,formattedAddress,regularOpeningHours",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as PlaceDetails;
}

type SearchPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
};

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(barName: string, placeName: string): boolean {
  const a = fold(barName);
  const b = fold(placeName);
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function streetHint(address: string | undefined): string | null {
  if (!address) return null;
  const street = address.split(",")[0]?.trim();
  if (!street) return null;
  const folded = fold(street);
  return folded.length >= 4 ? folded : null;
}

async function searchPlace(
  query: string,
  apiKey: string,
): Promise<SearchPlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "no",
      regionCode: "NO",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places search ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { places?: SearchPlace[] };
  return data.places ?? [];
}

const resolveReturns = v.object({
  linked: v.array(
    v.object({
      name: v.string(),
      googlePlaceId: v.string(),
      placeName: v.string(),
    }),
  ),
  review: v.array(
    v.object({
      name: v.string(),
      reason: v.string(),
      candidates: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          address: v.string(),
        }),
      ),
    }),
  ),
});

/**
 * One-time: text-search curated bars without googlePlaceId.
 * Links only a single name+address match. Ambiguous hits are returned, not written.
 */
export const resolvePlaceIds = action({
  args: {},
  returns: resolveReturns,
  handler: async (ctx) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_PLACES_API_KEY mangler. Sett med: npx convex env set GOOGLE_PLACES_API_KEY …",
      );
    }

    const bars = await ctx.runQuery(internal.placesSync.listMissingPlaceId, {});
    const linked: Array<{
      name: string;
      googlePlaceId: string;
      placeName: string;
    }> = [];
    const review: Array<{
      name: string;
      reason: string;
      candidates: Array<{ id: string; name: string; address: string }>;
    }> = [];

    for (const bar of bars) {
      const query = [bar.name, bar.address, "Trondheim"]
        .filter((part) => part != null && part.length > 0)
        .join(", ");
      try {
        const places = await searchPlace(query, apiKey);
        const candidates = places
          .filter((p) => p.id && p.displayName?.text)
          .map((p) => ({
            id: p.id!,
            name: p.displayName!.text!,
            address: p.formattedAddress ?? "",
          }));
        const named = candidates.filter((c) => namesMatch(bar.name, c.name));
        const hint = streetHint(bar.address);
        const addressed =
          hint == null
            ? named
            : named.filter((c) => fold(c.address).includes(hint));
        const pool = addressed.length > 0 ? addressed : named;
        if (pool.length === 1) {
          const match = pool[0]!;
          await ctx.runMutation(internal.placesSync.setPlaceId, {
            barId: bar._id,
            googlePlaceId: match.id,
          });
          linked.push({
            name: bar.name,
            googlePlaceId: match.id,
            placeName: match.name,
          });
        } else {
          review.push({
            name: bar.name,
            reason:
              pool.length === 0
                ? "Ingen entydig treff"
                : "Flere mulige treff",
            candidates: candidates.slice(0, 3),
          });
        }
      } catch (e) {
        review.push({
          name: bar.name,
          reason: e instanceof Error ? e.message : "Søk feilet",
          candidates: [],
        });
      }
    }

    return { linked, review };
  },
});

async function runPlacesSync(ctx: ActionCtx): Promise<SyncResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY mangler. Sett med: npx convex env set GOOGLE_PLACES_API_KEY …",
    );
  }

  const bars = await ctx.runQuery(internal.placesSync.listWithPlaceId, {});
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const bar of bars) {
    try {
      const details = await fetchPlaceDetails(bar.googlePlaceId, apiKey);
      const openingHours = periodToSlots(details.regularOpeningHours?.periods);
      if (
        details.rating == null &&
        details.userRatingCount == null &&
        details.formattedAddress == null &&
        openingHours == null
      ) {
        skipped++;
        continue;
      }
      await ctx.runMutation(internal.placesSync.applyPlaceUpdate, {
        barId: bar._id,
        rating: details.rating,
        ratingCount: details.userRatingCount,
        address: details.formattedAddress,
        openingHours,
      });
      updated++;
    } catch (e) {
      console.error("Places sync failed", bar.name, e);
      errors++;
    }
  }

  return { updated, skipped, errors };
}

const syncReturns = v.object({
  updated: v.number(),
  skipped: v.number(),
  errors: v.number(),
});

/**
 * Sync rating + opening hours from Google Places for curated bars with
 * `googlePlaceId`. Does not touch beerPrice. Cron calls this.
 */
export const syncAllInternal = internalAction({
  args: {},
  returns: syncReturns,
  handler: async (ctx): Promise<SyncResult> => {
    return await runPlacesSync(ctx);
  },
});

/** Manual CLI / dashboard: `npx convex run placesSyncActions:syncAll` */
export const syncAll = action({
  args: {},
  returns: syncReturns,
  handler: async (ctx): Promise<SyncResult> => {
    return await runPlacesSync(ctx);
  },
});
