import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUserId, requireUserId } from "./lib/auth";

const nightValidator = v.object({
  _id: v.id("routeInstances"),
  name: v.string(),
  status: v.union(
    v.literal("planned"),
    v.literal("active"),
    v.literal("completed"),
  ),
  startedAt: v.union(v.number(), v.null()),
  completedAt: v.union(v.number(), v.null()),
  estimatedTotalMinutes: v.number(),
  estimatedDistanceMeters: v.number(),
  stopCount: v.number(),
  photoThumbUrl: v.union(v.string(), v.null()),
});

export const getProfile = query({
  args: {
    now: v.number(),
  },
  returns: v.union(
    v.null(),
    v.object({
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      stats: v.object({
        completedNights: v.number(),
        stopCount: v.number(),
        distanceKm: v.number(),
      }),
      nights: v.array(nightValidator),
    }),
  ),
  handler: async (ctx, args) => {
    void args.now;
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const instances = await ctx.db
      .query("routeInstances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let completedNights = 0;
    let stopCount = 0;
    let distanceMeters = 0;

    const nights = [];
    for (const inst of instances) {
      const template = await ctx.db.get(inst.templateId);
      if (inst.status === "completed") {
        completedNights += 1;
        distanceMeters += inst.estimatedDistanceMeters;
      }

      const logs = await ctx.db
        .query("stopLogs")
        .withIndex("by_user_and_instance", (q) =>
          q.eq("userId", userId).eq("instanceId", inst._id),
        )
        .collect();
      stopCount += logs.length;

      let photoThumbUrl: string | null = null;
      for (const log of logs) {
        if (log.photoStorageId) {
          photoThumbUrl = await ctx.storage.getUrl(log.photoStorageId);
          if (photoThumbUrl) break;
        }
      }

      nights.push({
        _id: inst._id,
        name: template?.name ?? "Min kveld",
        status: inst.status,
        // null — ikke undefined (ugyldig Convex-verdi i returns)
        startedAt: inst.startedAt ?? null,
        completedAt: inst.completedAt ?? null,
        estimatedTotalMinutes: inst.estimatedTotalMinutes,
        estimatedDistanceMeters: inst.estimatedDistanceMeters,
        stopCount: inst.barIds.length,
        photoThumbUrl,
      });
    }

    nights.sort(
      (a, b) =>
        (b.completedAt ?? b.startedAt ?? 0) -
        (a.completedAt ?? a.startedAt ?? 0),
    );

    return {
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      stats: {
        completedNights,
        stopCount,
        distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
      },
      nights,
    };
  },
});

async function deleteUserOwnedData(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const instances = await ctx.db
    .query("routeInstances")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const inst of instances) {
    const logs = await ctx.db
      .query("stopLogs")
      .withIndex("by_instance", (q) => q.eq("instanceId", inst._id))
      .collect();
    for (const log of logs) {
      if (log.photoStorageId) {
        await ctx.storage.delete(log.photoStorageId);
      }
      await ctx.db.delete(log._id);
    }
    await ctx.db.delete(inst._id);
  }

  const templates = await ctx.db
    .query("routeTemplates")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const t of templates) {
    await ctx.db.delete(t._id);
  }

  const bars = await ctx.db
    .query("bars")
    .withIndex("by_creator", (q) => q.eq("createdByUserId", userId))
    .collect();
  for (const bar of bars) {
    if (bar.source === "user") {
      await ctx.db.delete(bar._id);
    }
  }

  const challenges = await ctx.db
    .query("challenges")
    .withIndex("by_creator", (q) => q.eq("createdByUserId", userId))
    .collect();
  for (const c of challenges) {
    if (c.source === "user") {
      await ctx.db.delete(c._id);
    }
  }

  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of refreshTokens) {
      await ctx.db.delete(token._id);
    }
    await ctx.db.delete(session._id);
  }

  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();
  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .collect();
    for (const code of codes) {
      await ctx.db.delete(code._id);
    }
    await ctx.db.delete(account._id);
  }

  await ctx.db.delete(userId);
}

export const deleteAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await deleteUserOwnedData(ctx, userId);
    return null;
  },
});
