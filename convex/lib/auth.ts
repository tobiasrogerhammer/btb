import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getCurrentUserId(
  ctx: Ctx,
): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Ikke innlogget");
  }
  return userId;
}

export async function getGuestSessionByToken(
  ctx: Ctx,
  token: string,
  now: number,
): Promise<Doc<"guestSessions"> | null> {
  const session = await ctx.db
    .query("guestSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) return null;
  if (session.claimedByUserId) return null;
  if (session.expiresAt < now) return null;
  return session;
}

export async function requireOwner(
  ctx: Ctx,
  args: {
    guestToken?: string;
    now: number;
  },
): Promise<
  | { kind: "user"; userId: Id<"users"> }
  | { kind: "guest"; guestSessionId: Id<"guestSessions"> }
> {
  const userId = await getAuthUserId(ctx);
  if (userId) {
    return { kind: "user", userId };
  }
  if (!args.guestToken) {
    throw new Error("Krever innlogging eller gyldig gjesteøkt");
  }
  const session = await getGuestSessionByToken(ctx, args.guestToken, args.now);
  if (!session) {
    throw new Error("Ugyldig eller utløpt gjesteøkt");
  }
  return { kind: "guest", guestSessionId: session._id };
}

export function ownsResource(
  owner: { kind: "user"; userId: Id<"users"> } | { kind: "guest"; guestSessionId: Id<"guestSessions"> },
  resource: { userId?: Id<"users">; guestSessionId?: Id<"guestSessions"> },
): boolean {
  if (owner.kind === "user") {
    return resource.userId === owner.userId;
  }
  return resource.guestSessionId === owner.guestSessionId;
}
