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

export type Owner =
  | { kind: "user"; userId: Id<"users"> }
  | { kind: "guest"; guestSessionId: Id<"guestSessions"> };

/**
 * Identitet for å *opprette* data: innlogget bruker vinner,
 * ellers gyldig gjesteøkt.
 */
export async function requireOwner(
  ctx: Ctx,
  args: {
    guestToken?: string;
    now: number;
  },
): Promise<Owner> {
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

/**
 * Tilgang til *eksisterende* ressurs: innlogget eier, eller gjesteøkt
 * som eier — selv om brukeren også er innlogget (f.eks. før claim).
 */
export async function requireResourceOwner(
  ctx: Ctx,
  args: {
    guestToken?: string;
    now: number;
    resource: { userId?: Id<"users">; guestSessionId?: Id<"guestSessions"> };
  },
): Promise<Owner> {
  const userId = await getAuthUserId(ctx);
  if (userId && args.resource.userId === userId) {
    return { kind: "user", userId };
  }

  if (args.guestToken) {
    const session = await getGuestSessionByToken(
      ctx,
      args.guestToken,
      args.now,
    );
    if (session && args.resource.guestSessionId === session._id) {
      return { kind: "guest", guestSessionId: session._id };
    }
  }

  if (!userId && !args.guestToken) {
    throw new Error("Krever innlogging eller gyldig gjesteøkt");
  }
  if (!userId && args.guestToken) {
    throw new Error("Ugyldig eller utløpt gjesteøkt");
  }
  throw new Error("Ingen tilgang");
}

export function ownsResource(
  owner: Owner,
  resource: { userId?: Id<"users">; guestSessionId?: Id<"guestSessions"> },
): boolean {
  if (owner.kind === "user") {
    return resource.userId === owner.userId;
  }
  return resource.guestSessionId === owner.guestSessionId;
}
