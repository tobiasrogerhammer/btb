import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { endOfNextOsloDay } from "./lib/geo";

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const create = mutation({
  args: {
    now: v.number(),
  },
  returns: v.object({
    guestSessionId: v.id("guestSessions"),
    token: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const token = randomToken();
    const expiresAt = Math.max(
      endOfNextOsloDay(args.now),
      args.now + 36 * 60 * 60 * 1000,
    );
    const guestSessionId = await ctx.db.insert("guestSessions", {
      token,
      createdAt: args.now,
      expiresAt,
    });
    return { guestSessionId, token, expiresAt };
  },
});

export const getByToken = query({
  args: {
    token: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("guestSessions"),
      expiresAt: v.number(),
      claimed: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("guestSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session) return null;
    if (session.claimedByUserId) {
      return {
        _id: session._id,
        expiresAt: session.expiresAt,
        claimed: true,
      };
    }
    if (session.expiresAt < args.now) return null;
    return {
      _id: session._id,
      expiresAt: session.expiresAt,
      claimed: false,
    };
  },
});
