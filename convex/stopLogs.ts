import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ownsResource, requireOwner } from "./lib/auth";

export const listForInstance = query({
  args: {
    instanceId: v.id("routeInstances"),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("stopLogs"),
      barId: v.id("bars"),
      orderIndex: v.number(),
      completedChallengeIds: v.array(v.id("challenges")),
      photoStorageId: v.optional(v.id("_storage")),
      photoUrl: v.union(v.string(), v.null()),
      checkedInAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) return [];
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) {
      throw new Error("Ingen tilgang");
    }
    const logs = await ctx.db
      .query("stopLogs")
      .withIndex("by_instance", (q) => q.eq("instanceId", args.instanceId))
      .collect();

    const result = [];
    for (const log of logs) {
      let photoUrl: string | null = null;
      if (log.photoStorageId) {
        photoUrl = await ctx.storage.getUrl(log.photoStorageId);
      }
      result.push({
        _id: log._id,
        barId: log.barId,
        orderIndex: log.orderIndex,
        completedChallengeIds: log.completedChallengeIds,
        photoStorageId: log.photoStorageId,
        photoUrl,
        checkedInAt: log.checkedInAt,
      });
    }
    return result.sort((a, b) => a.orderIndex - b.orderIndex);
  },
});

export const checkIn = mutation({
  args: {
    instanceId: v.id("routeInstances"),
    barId: v.id("bars"),
    orderIndex: v.number(),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.id("stopLogs"),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance || instance.status !== "active") {
      throw new Error("Aktiv runde kreves");
    }
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) throw new Error("Ingen tilgang");

    const existing = await ctx.db
      .query("stopLogs")
      .withIndex("by_instance_and_bar", (q) =>
        q.eq("instanceId", args.instanceId).eq("barId", args.barId),
      )
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("stopLogs", {
      instanceId: args.instanceId,
      userId: owner.kind === "user" ? owner.userId : undefined,
      guestSessionId:
        owner.kind === "guest" ? owner.guestSessionId : undefined,
      barId: args.barId,
      orderIndex: args.orderIndex,
      completedChallengeIds: [],
      checkedInAt: args.now,
      updatedAt: args.now,
    });
  },
});

export const toggleChallenge = mutation({
  args: {
    stopLogId: v.id("stopLogs"),
    challengeId: v.id("challenges"),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.stopLogId);
    if (!log) throw new Error("Stopp-logg ikke funnet");
    const instance = await ctx.db.get(log.instanceId);
    if (!instance) throw new Error("Emne ikke funnet");
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) throw new Error("Ingen tilgang");

    const set = new Set(log.completedChallengeIds);
    if (set.has(args.challengeId)) set.delete(args.challengeId);
    else set.add(args.challengeId);

    await ctx.db.patch(args.stopLogId, {
      completedChallengeIds: [...set],
      updatedAt: args.now,
    });
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: {
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachPhoto = mutation({
  args: {
    stopLogId: v.id("stopLogs"),
    storageId: v.id("_storage"),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.stopLogId);
    if (!log) throw new Error("Stopp-logg ikke funnet");
    const instance = await ctx.db.get(log.instanceId);
    if (!instance) throw new Error("Emne ikke funnet");
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) throw new Error("Ingen tilgang");

    if (log.photoStorageId) {
      await ctx.storage.delete(log.photoStorageId);
    }
    await ctx.db.patch(args.stopLogId, {
      photoStorageId: args.storageId,
      updatedAt: args.now,
    });
    return null;
  },
});
