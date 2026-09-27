import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwner, ownsResource } from "./lib/auth";

export const listForBars = query({
  args: {
    barIds: v.array(v.id("bars")),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("challenges"),
      text: v.string(),
      barId: v.optional(v.id("bars")),
      source: v.union(v.literal("builtin"), v.literal("user")),
    }),
  ),
  handler: async (ctx, args) => {
    const builtins = await ctx.db
      .query("challenges")
      .withIndex("by_source", (q) => q.eq("source", "builtin"))
      .collect();

    const relevant = builtins.filter(
      (c) =>
        c.isActive &&
        (c.barId === undefined || args.barIds.includes(c.barId)),
    );

    try {
      const owner = await requireOwner(ctx, {
        guestToken: args.guestToken,
        now: args.now,
      });
      const userChallenges =
        owner.kind === "user"
          ? await ctx.db
              .query("challenges")
              .withIndex("by_creator", (q) =>
                q.eq("createdByUserId", owner.userId),
              )
              .collect()
          : await ctx.db
              .query("challenges")
              .withIndex("by_guest_session", (q) =>
                q.eq("guestSessionId", owner.guestSessionId),
              )
              .collect();
      for (const c of userChallenges) {
        if (
          c.isActive &&
          (c.barId === undefined || args.barIds.includes(c.barId))
        ) {
          relevant.push(c);
        }
      }
    } catch {
      // curated builtins only
    }

    return relevant.map((c) => ({
      _id: c._id,
      text: c.text,
      barId: c.barId,
      source: c.source,
    }));
  },
});

export const create = mutation({
  args: {
    text: v.string(),
    barId: v.optional(v.id("bars")),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.id("challenges"),
  handler: async (ctx, args) => {
    if (args.text.trim().length < 1) {
      throw new Error("Tekst er påkrevd");
    }
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    return await ctx.db.insert("challenges", {
      text: args.text.trim(),
      barId: args.barId,
      source: "user",
      createdByUserId: owner.kind === "user" ? owner.userId : undefined,
      guestSessionId:
        owner.kind === "guest" ? owner.guestSessionId : undefined,
      isActive: true,
      createdAt: args.now,
    });
  },
});

/** Opprett egen utfordring for et stopp og fest den på aktiv runde. */
export const createForInstance = mutation({
  args: {
    instanceId: v.id("routeInstances"),
    barId: v.id("bars"),
    text: v.string(),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.id("challenges"),
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    if (trimmed.length < 1) {
      throw new Error("Tekst er påkrevd");
    }
    if (trimmed.length > 160) {
      throw new Error("Utfordringen er for lang");
    }
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) throw new Error("Emne ikke funnet");
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) {
      throw new Error("Ingen tilgang");
    }
    if (!instance.barIds.includes(args.barId)) {
      throw new Error("Stoppet er ikke på denne runden");
    }

    const challengeId = await ctx.db.insert("challenges", {
      text: trimmed,
      barId: args.barId,
      source: "user",
      createdByUserId: owner.kind === "user" ? owner.userId : undefined,
      guestSessionId:
        owner.kind === "guest" ? owner.guestSessionId : undefined,
      isActive: true,
      createdAt: args.now,
    });

    if (!instance.challengeIds.includes(challengeId)) {
      await ctx.db.patch(args.instanceId, {
        challengeIds: [...instance.challengeIds, challengeId],
      });
    }
    return challengeId;
  },
});
