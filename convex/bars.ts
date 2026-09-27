import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./lib/auth";

const openingHoursReturn = v.optional(
  v.array(
    v.object({
      day: v.number(),
      open: v.string(),
      close: v.string(),
    }),
  ),
);

const barReturn = v.object({
  _id: v.id("bars"),
  name: v.string(),
  address: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  priceLevel: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
  beerPrice: v.optional(v.number()),
  rating: v.optional(v.number()),
  ratingCount: v.optional(v.number()),
  openingHours: openingHoursReturn,
  source: v.union(v.literal("curated"), v.literal("user")),
  isActive: v.boolean(),
});

export const listActive = query({
  args: {
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.array(barReturn),
  handler: async (ctx, args) => {
    const curated = await ctx.db
      .query("bars")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const visible = curated.filter((b) => b.source === "curated");

    try {
      const owner = await requireOwner(ctx, {
        guestToken: args.guestToken,
        now: args.now,
      });
      const mine =
        owner.kind === "user"
          ? curated.filter((b) => b.createdByUserId === owner.userId)
          : curated.filter((b) => b.guestSessionId === owner.guestSessionId);
      const ids = new Set(visible.map((b) => b._id));
      for (const b of mine) {
        if (!ids.has(b._id)) visible.push(b);
      }
    } catch {
      // not signed in / no guest — curated only
    }

    return visible.map((b) => ({
      _id: b._id,
      name: b.name,
      address: b.address,
      lat: b.lat,
      lng: b.lng,
      priceLevel: b.priceLevel,
      beerPrice: b.beerPrice,
      rating: b.rating,
      ratingCount: b.ratingCount,
      openingHours: b.openingHours,
      source: b.source,
      isActive: b.isActive,
    }));
  },
});

export const createUserBar = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    priceLevel: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.id("bars"),
  handler: async (ctx, args) => {
    if (args.name.trim().length < 1) {
      throw new Error("Navn er påkrevd");
    }
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    return await ctx.db.insert("bars", {
      name: args.name.trim(),
      address: args.address,
      lat: args.lat,
      lng: args.lng,
      priceLevel: args.priceLevel,
      source: "user",
      createdByUserId: owner.kind === "user" ? owner.userId : undefined,
      guestSessionId:
        owner.kind === "guest" ? owner.guestSessionId : undefined,
      isActive: true,
    });
  },
});
