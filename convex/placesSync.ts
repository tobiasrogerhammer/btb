import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

const openingHoursValidator = v.array(
  v.object({
    day: v.number(),
    open: v.string(),
    close: v.string(),
  }),
);

/** Bars with a Google place id (for Places sync). */
export const listWithPlaceId = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("bars"),
      name: v.string(),
      googlePlaceId: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const curated = await ctx.db
      .query("bars")
      .withIndex("by_source", (q) => q.eq("source", "curated"))
      .collect();
    return curated
      .filter((b) => b.isActive && b.googlePlaceId != null)
      .map((b) => ({
        _id: b._id,
        name: b.name,
        googlePlaceId: b.googlePlaceId!,
      }));
  },
});

/** Apply Places Details — never overwrites beerPrice. */
export const applyPlaceUpdate = internalMutation({
  args: {
    barId: v.id("bars"),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    address: v.optional(v.string()),
    openingHours: v.optional(openingHoursValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bar = await ctx.db.get(args.barId);
    if (!bar || bar.source !== "curated") return null;
    const patch: {
      rating?: number;
      ratingCount?: number;
      address?: string;
      openingHours?: Array<{ day: number; open: string; close: string }>;
    } = {};
    if (args.rating != null) patch.rating = args.rating;
    if (args.ratingCount != null) patch.ratingCount = args.ratingCount;
    if (args.address != null) patch.address = args.address;
    if (args.openingHours != null) patch.openingHours = args.openingHours;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.barId, patch);
    }
    return null;
  },
});

/** Attach a Google place id to a curated bar (by name). For setup / seed follow-up. */
export const setGooglePlaceId = mutation({
  args: {
    name: v.string(),
    googlePlaceId: v.string(),
  },
  returns: v.union(v.id("bars"), v.null()),
  handler: async (ctx, args) => {
    const curated = await ctx.db
      .query("bars")
      .withIndex("by_source", (q) => q.eq("source", "curated"))
      .collect();
    const bar = curated.find((b) => b.name === args.name);
    if (!bar) return null;
    await ctx.db.patch(bar._id, { googlePlaceId: args.googlePlaceId });
    return bar._id;
  },
});
