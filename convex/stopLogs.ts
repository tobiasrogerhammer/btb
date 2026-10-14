import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireOwner, requireResourceOwner } from "./lib/auth";
import {
  MAX_PHOTOS_PER_INSTANCE,
  MAX_PHOTOS_PER_STOP,
  logPhotoIds,
} from "./lib/photos";

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
      photos: v.array(
        v.object({
          storageId: v.id("_storage"),
          url: v.string(),
        }),
      ),
      checkedInAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) return [];
    await requireResourceOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
      resource: instance,
    });
    const logs = await ctx.db
      .query("stopLogs")
      .withIndex("by_instance", (q) => q.eq("instanceId", args.instanceId))
      .collect();

    const result = [];
    for (const log of logs) {
      const photos: { storageId: Id<"_storage">; url: string }[] = [];
      for (const storageId of logPhotoIds(log)) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) photos.push({ storageId, url });
      }
      result.push({
        _id: log._id,
        barId: log.barId,
        orderIndex: log.orderIndex,
        completedChallengeIds: log.completedChallengeIds,
        photos,
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
    const owner = await requireResourceOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
      resource: instance,
    });

    const existing = await ctx.db
      .query("stopLogs")
      .withIndex("by_instance_and_bar", (q) =>
        q.eq("instanceId", args.instanceId).eq("barId", args.barId),
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("stopLogs", {
      instanceId: args.instanceId,
      userId: owner.kind === "user" ? owner.userId : undefined,
      guestSessionId: owner.kind === "guest" ? owner.guestSessionId : undefined,
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
    await requireResourceOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
      resource: instance,
    });

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

/**
 * Legger til et bilde på stoppet. Maks 3 per stopp og 20 per kveld.
 * Returnerer `false` (og sletter den opplastede filen) hvis grensen er nådd.
 */
export const attachPhoto = mutation({
  args: {
    stopLogId: v.id("stopLogs"),
    storageId: v.id("_storage"),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.stopLogId);
    if (!log) throw new Error("Stopp-logg ikke funnet");
    const instance = await ctx.db.get(log.instanceId);
    if (!instance) throw new Error("Emne ikke funnet");
    await requireResourceOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
      resource: instance,
    });

    const existing = logPhotoIds(log);
    const allLogs = await ctx.db
      .query("stopLogs")
      .withIndex("by_instance", (q) => q.eq("instanceId", log.instanceId))
      .collect();
    const total = allLogs.reduce((n, l) => n + logPhotoIds(l).length, 0);

    if (
      existing.length >= MAX_PHOTOS_PER_STOP ||
      total >= MAX_PHOTOS_PER_INSTANCE
    ) {
      await ctx.storage.delete(args.storageId);
      return false;
    }

    await ctx.db.patch(args.stopLogId, {
      photoStorageIds: [...existing, args.storageId],
      photoStorageId: undefined,
      updatedAt: args.now,
    });
    return true;
  },
});

export const removePhoto = mutation({
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
    if (instance.status !== "active") {
      throw new Error("Bilder kan bare fjernes mens runden pågår");
    }
    await requireResourceOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
      resource: instance,
    });

    const existing = logPhotoIds(log);
    if (!existing.includes(args.storageId)) return null;
    await ctx.storage.delete(args.storageId);
    // `undefined` fjerner det utfasede feltet fra dokumentet.
    await ctx.db.patch(args.stopLogId, {
      photoStorageIds: existing.filter((id) => id !== args.storageId),
      photoStorageId: undefined,
      updatedAt: args.now,
    });
    return null;
  },
});
