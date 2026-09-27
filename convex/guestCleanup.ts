import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const cleanupExpiredGuests = internalMutation({
  args: {
    now: v.number(),
  },
  returns: v.object({ deletedSessions: v.number() }),
  handler: async (ctx, args) => {
    const expired = await ctx.db
      .query("guestSessions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", args.now))
      .collect();

    let deletedSessions = 0;
    for (const session of expired) {
      if (session.claimedByUserId) continue;

      const instances = await ctx.db
        .query("routeInstances")
        .withIndex("by_guest_session", (q) =>
          q.eq("guestSessionId", session._id),
        )
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
        .withIndex("by_guest_session", (q) =>
          q.eq("guestSessionId", session._id),
        )
        .collect();
      for (const t of templates) {
        await ctx.db.delete(t._id);
      }

      const bars = await ctx.db
        .query("bars")
        .withIndex("by_guest_session", (q) =>
          q.eq("guestSessionId", session._id),
        )
        .collect();
      for (const bar of bars) {
        await ctx.db.delete(bar._id);
      }

      const challenges = await ctx.db
        .query("challenges")
        .withIndex("by_guest_session", (q) =>
          q.eq("guestSessionId", session._id),
        )
        .collect();
      for (const c of challenges) {
        await ctx.db.delete(c._id);
      }

      await ctx.db.delete(session._id);
      deletedSessions++;
    }

    return { deletedSessions };
  },
});

export const runDailyCleanup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(internal.guestCleanup.cleanupExpiredGuests, {
      now: Date.now(),
    });
    return null;
  },
});
