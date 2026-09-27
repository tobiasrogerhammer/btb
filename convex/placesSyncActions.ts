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
