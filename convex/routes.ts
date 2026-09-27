import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ownsResource, requireOwner, requireUserId } from "./lib/auth";
import {
  endOfNextOsloDay,
  estimateRoute,
  haversineMeters,
  isOpenDuringWindow,
  isOpenNow,
  TRONDHEIM_CENTER,
} from "./lib/geo";

const estimateFields = {
  estimatedDistanceMeters: v.number(),
  estimatedWalkMinutes: v.number(),
  estimatedDwellMinutes: v.number(),
  estimatedTotalMinutes: v.number(),
  stopDwellMinutes: v.array(v.number()),
};

async function loadBars(ctx: QueryCtx | MutationCtx, barIds: Id<"bars">[]) {
  const bars = [];
  for (const id of barIds) {
    const bar = await ctx.db.get(id);
    if (!bar) throw new Error("Bar ikke funnet");
    bars.push(bar);
  }
  return bars;
}

async function snapshotChallenges(
  ctx: QueryCtx | MutationCtx,
  barIds: Id<"bars">[],
): Promise<Id<"challenges">[]> {
  const builtins = await ctx.db
    .query("challenges")
    .withIndex("by_source", (q) => q.eq("source", "builtin"))
    .collect();
  return builtins
    .filter(
      (c) =>
        c.isActive &&
        (c.barId === undefined || barIds.includes(c.barId)),
    )
    .map((c) => c._id);
}

export const suggest = query({
  args: {
    mode: v.union(v.literal("stops"), v.literal("time")),
    stopCount: v.optional(v.number()),
    targetMinutes: v.optional(v.number()),
    startLat: v.optional(v.number()),
    startLng: v.optional(v.number()),
    /** Endrer startstopp / rekkefølge for «Ny rute» */
    seed: v.optional(v.number()),
    now: v.number(),
    maxBeerPrice: v.optional(v.number()),
    minRating: v.optional(v.number()),
    windowStart: v.optional(v.number()),
    windowEnd: v.optional(v.number()),
  },
  returns: v.object({
    barIds: v.array(v.id("bars")),
    ...estimateFields,
    partial: v.boolean(),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("bars")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const curated = all.filter(
      (b) => b.source === "curated" && b.lat != null && b.lng != null,
    );

    const emptyEstimate = {
      barIds: [] as Id<"bars">[],
      estimatedDistanceMeters: 0,
      estimatedWalkMinutes: 0,
      estimatedDwellMinutes: 0,
      estimatedTotalMinutes: 0,
      stopDwellMinutes: [] as number[],
      partial: true,
    };

    if (curated.length < 2) {
      return {
        ...emptyEstimate,
        message:
          "Ingen barer i katalogen ennå. Kjør seed, eller plukk manuelt når data finnes.",
      };
    }

    // Pris og rating er harde filtre
    let pool = curated;
    if (args.maxBeerPrice != null) {
      pool = pool.filter(
        (b) => b.beerPrice != null && b.beerPrice <= args.maxBeerPrice!,
      );
    }
    if (args.minRating != null) {
      pool = pool.filter(
        (b) => b.rating != null && b.rating >= args.minRating!,
      );
    }
    if (pool.length < 2) {
      return {
        ...emptyEstimate,
        message:
          "For få steder matcher pris/rating. Prøv å myke filtrene i Options.",
      };
    }

    const useWindow =
      args.windowStart != null &&
      args.windowEnd != null &&
      args.windowEnd > args.windowStart;

    let candidates = pool.filter((b) =>
      useWindow
        ? isOpenDuringWindow(
            b.openingHours,
            args.windowStart!,
            args.windowEnd!,
          )
        : isOpenNow(b.openingHours, args.now),
    );
    let message: string | undefined;
    if (candidates.length < 2) {
      candidates = pool;
      message = useWindow
        ? "Få steder åpne i tidsvinduet — foreslo blant treff på valgte filter."
        : "Få barer åpne nå — foreslo blant treff på valgte filter.";
    }

    const center = {
      lat: args.startLat ?? TRONDHEIM_CENTER.lat,
      lng: args.startLng ?? TRONDHEIM_CENTER.lng,
    };

    const remaining = [...candidates];
    const picked: typeof candidates = [];

    // Seeded start: pick first bar from shuffled order so «Ny rute» gir variasjon
    const seed = args.seed ?? 0;
    if (remaining.length > 0) {
      const startIdx = Math.abs(Math.floor(seed)) % remaining.length;
      const first = remaining.splice(startIdx, 1)[0]!;
      picked.push(first);
    }

    let current =
      picked.length > 0
        ? { lat: picked[0]!.lat!, lng: picked[0]!.lng! }
        : center;

    const maxStops = 12;
    const stopTarget =
      args.mode === "stops"
        ? Math.min(
            Math.max(Math.floor(args.stopCount ?? 4), 2),
            maxStops,
          )
        : maxStops;
    const timeBudget =
      args.mode === "time"
        ? Math.min(Math.max(Math.floor(args.targetMinutes ?? 180), 90), 480)
        : null;

    while (picked.length < stopTarget && remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const b = remaining[i]!;
        const d = haversineMeters(current, {
          lat: b.lat!,
          lng: b.lng!,
        });
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const next = remaining.splice(bestIdx, 1)[0]!;
      const trial = [...picked, next];
      if (timeBudget != null && trial.length >= 2) {
        const trialEst = estimateRoute(trial);
        if (trialEst.estimatedTotalMinutes > timeBudget) {
          if (picked.length < 2) {
            picked.push(next);
            current = { lat: next.lat!, lng: next.lng! };
          }
          break;
        }
      }
      picked.push(next);
      current = { lat: next.lat!, lng: next.lng! };
    }

    if (picked.length < 2 && candidates.length >= 2) {
      remaining.length = 0;
      remaining.push(...candidates.filter((c) => !picked.includes(c)));
      while (picked.length < 2 && remaining.length > 0) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const b = remaining[i]!;
          const d = haversineMeters(
            picked.length === 0
              ? center
              : {
                  lat: picked[picked.length - 1]!.lat!,
                  lng: picked[picked.length - 1]!.lng!,
                },
            { lat: b.lat!, lng: b.lng! },
          );
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        picked.push(remaining.splice(bestIdx, 1)[0]!);
      }
      if (timeBudget != null) {
        message =
          (message ? message + " " : "") +
          "Tidsbudsjettet er stramt — foreslo minst to stopp.";
      }
    }

    const barIds = picked.map((b) => b._id);
    const est = estimateRoute(picked);
    return {
      barIds,
      estimatedDistanceMeters: est.estimatedDistanceMeters,
      estimatedWalkMinutes: est.estimatedWalkMinutes,
      estimatedDwellMinutes: est.estimatedDwellMinutes,
      estimatedTotalMinutes: est.estimatedTotalMinutes,
      stopDwellMinutes: est.stopDwellMinutes,
      partial: est.partial,
      message,
    };
  },
});

export const createTemplateAndStart = mutation({
  args: {
    /** Valgfritt — navn settes typisk på recap. Default: «Min kveld». */
    name: v.optional(v.string()),
    barIds: v.array(v.id("bars")),
    source: v.union(v.literal("manual"), v.literal("generated")),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.id("routeInstances"),
  handler: async (ctx, args) => {
    if (args.barIds.length < 2) {
      throw new Error("Minst to stopp kreves");
    }
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    const bars = await loadBars(ctx, args.barIds);
    const est = estimateRoute(bars);
    const challengeIds = await snapshotChallenges(ctx, args.barIds);

    const templateId = await ctx.db.insert("routeTemplates", {
      userId: owner.kind === "user" ? owner.userId : undefined,
      guestSessionId:
        owner.kind === "guest" ? owner.guestSessionId : undefined,
      name: args.name?.trim() || "Min kveld",
      barIds: args.barIds,
      challengeIds,
      estimatedDistanceMeters: est.estimatedDistanceMeters,
      estimatedWalkMinutes: est.estimatedWalkMinutes,
      estimatedDwellMinutes: est.estimatedDwellMinutes,
      estimatedTotalMinutes: est.estimatedTotalMinutes,
      stopDwellMinutes: est.stopDwellMinutes,
      source: args.source,
      createdAt: args.now,
    });

    return await ctx.db.insert("routeInstances", {
      userId: owner.kind === "user" ? owner.userId : undefined,
      guestSessionId:
        owner.kind === "guest" ? owner.guestSessionId : undefined,
      templateId,
      barIds: args.barIds,
      challengeIds,
      estimatedDistanceMeters: est.estimatedDistanceMeters,
      estimatedWalkMinutes: est.estimatedWalkMinutes,
      estimatedDwellMinutes: est.estimatedDwellMinutes,
      estimatedTotalMinutes: est.estimatedTotalMinutes,
      stopDwellMinutes: est.stopDwellMinutes,
      mode: "solo",
      status: "active",
      startedAt: args.now,
      createdAt: args.now,
    });
  },
});

export const getInstance = query({
  args: {
    instanceId: v.id("routeInstances"),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("routeInstances"),
      templateId: v.id("routeTemplates"),
      name: v.string(),
      barIds: v.array(v.id("bars")),
      challengeIds: v.array(v.id("challenges")),
      status: v.union(
        v.literal("planned"),
        v.literal("active"),
        v.literal("completed"),
      ),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      ...estimateFields,
      bars: v.array(
        v.object({
          _id: v.id("bars"),
          name: v.string(),
          address: v.optional(v.string()),
          lat: v.optional(v.number()),
          lng: v.optional(v.number()),
          priceLevel: v.optional(
            v.union(v.literal(1), v.literal(2), v.literal(3)),
          ),
          beerPrice: v.optional(v.number()),
          rating: v.optional(v.number()),
          ratingCount: v.optional(v.number()),
          openingHours: v.optional(
            v.array(
              v.object({
                day: v.number(),
                open: v.string(),
                close: v.string(),
              }),
            ),
          ),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) return null;
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) {
      throw new Error("Ingen tilgang");
    }
    const template = await ctx.db.get(instance.templateId);
    const bars = [];
    for (const id of instance.barIds) {
      const bar = await ctx.db.get(id);
      if (bar) {
        bars.push({
          _id: bar._id,
          name: bar.name,
          address: bar.address,
          lat: bar.lat,
          lng: bar.lng,
          priceLevel: bar.priceLevel,
          beerPrice: bar.beerPrice,
          rating: bar.rating,
          ratingCount: bar.ratingCount,
          openingHours: bar.openingHours,
        });
      }
    }
    return {
      _id: instance._id,
      templateId: instance.templateId,
      name: template?.name ?? "Emne",
      barIds: instance.barIds,
      challengeIds: instance.challengeIds,
      status: instance.status,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      estimatedDistanceMeters: instance.estimatedDistanceMeters,
      estimatedWalkMinutes: instance.estimatedWalkMinutes,
      estimatedDwellMinutes: instance.estimatedDwellMinutes,
      estimatedTotalMinutes: instance.estimatedTotalMinutes,
      stopDwellMinutes: instance.stopDwellMinutes,
      bars,
    };
  },
});

export const listMine = query({
  args: {
    now: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("routeInstances"),
      name: v.string(),
      status: v.union(
        v.literal("planned"),
        v.literal("active"),
        v.literal("completed"),
      ),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      estimatedTotalMinutes: v.number(),
      estimatedDistanceMeters: v.number(),
      stopCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    void args.now;
    const userId = await requireUserId(ctx);
    const instances = await ctx.db
      .query("routeInstances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const result = [];
    for (const inst of instances) {
      const template = await ctx.db.get(inst.templateId);
      result.push({
        _id: inst._id,
        name: template?.name ?? "Emne",
        status: inst.status,
        startedAt: inst.startedAt,
        completedAt: inst.completedAt,
        estimatedTotalMinutes: inst.estimatedTotalMinutes,
        estimatedDistanceMeters: inst.estimatedDistanceMeters,
        stopCount: inst.barIds.length,
      });
    }
    return result.sort(
      (a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0),
    );
  },
});

export const complete = mutation({
  args: {
    instanceId: v.id("routeInstances"),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) throw new Error("Emne ikke funnet");
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) throw new Error("Ingen tilgang");
    if (instance.status === "completed") return null;

    await ctx.db.patch(args.instanceId, {
      status: "completed",
      completedAt: args.now,
    });

    if (owner.kind === "guest") {
      const expiresAt = endOfNextOsloDay(args.now);
      await ctx.db.patch(owner.guestSessionId, { expiresAt });
    }
    return null;
  },
});

/** Sett kveldsnavn (typisk på recap etter «Vi overlevde»). */
export const rename = mutation({
  args: {
    instanceId: v.id("routeInstances"),
    name: v.string(),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trimmed = args.name.trim();
    if (trimmed.length < 1) {
      throw new Error("Navn er påkrevd");
    }
    if (trimmed.length > 80) {
      throw new Error("Navnet er for langt");
    }
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) throw new Error("Emne ikke funnet");
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) throw new Error("Ingen tilgang");

    await ctx.db.patch(instance.templateId, { name: trimmed });
    return null;
  },
});

export const addStop = mutation({
  args: {
    instanceId: v.id("routeInstances"),
    barId: v.id("bars"),
    guestToken: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) throw new Error("Emne ikke funnet");
    if (instance.status !== "active") {
      throw new Error("Kan bare legge til stopp på aktiv runde");
    }
    const owner = await requireOwner(ctx, {
      guestToken: args.guestToken,
      now: args.now,
    });
    if (!ownsResource(owner, instance)) throw new Error("Ingen tilgang");
    if (instance.barIds.includes(args.barId)) {
      throw new Error("Stoppet er allerede i runden");
    }
    const barIds = [...instance.barIds, args.barId];
    const bars = await loadBars(ctx, barIds);
    const est = estimateRoute(bars);
    await ctx.db.patch(args.instanceId, {
      barIds,
      ...est,
      stopDwellMinutes: est.stopDwellMinutes,
    });
    return null;
  },
});

export const replay = mutation({
  args: {
    instanceId: v.id("routeInstances"),
    now: v.number(),
  },
  returns: v.id("routeInstances"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const prev = await ctx.db.get(args.instanceId);
    if (!prev || prev.userId !== userId) {
      throw new Error("Emne ikke funnet");
    }
    const bars = await loadBars(ctx, prev.barIds);
    const est = estimateRoute(bars);

    await ctx.db.patch(prev.templateId, {
      barIds: prev.barIds,
      challengeIds: prev.challengeIds,
      stopDwellMinutes: est.stopDwellMinutes,
      estimatedDistanceMeters: est.estimatedDistanceMeters,
      estimatedWalkMinutes: est.estimatedWalkMinutes,
      estimatedDwellMinutes: est.estimatedDwellMinutes,
      estimatedTotalMinutes: est.estimatedTotalMinutes,
    });

    return await ctx.db.insert("routeInstances", {
      userId,
      templateId: prev.templateId,
      barIds: prev.barIds,
      challengeIds: prev.challengeIds,
      estimatedDistanceMeters: est.estimatedDistanceMeters,
      estimatedWalkMinutes: est.estimatedWalkMinutes,
      estimatedDwellMinutes: est.estimatedDwellMinutes,
      estimatedTotalMinutes: est.estimatedTotalMinutes,
      stopDwellMinutes: est.stopDwellMinutes,
      replayedFromInstanceId: prev._id,
      mode: "solo",
      status: "active",
      startedAt: args.now,
      createdAt: args.now,
    });
  },
});

export const claimGuest = mutation({
  args: {
    guestToken: v.string(),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db
      .query("guestSessions")
      .withIndex("by_token", (q) => q.eq("token", args.guestToken))
      .unique();
    if (!session) throw new Error("Gjesteøkt ikke funnet");
    if (session.claimedByUserId) return null;

    const templates = await ctx.db
      .query("routeTemplates")
      .withIndex("by_guest_session", (q) =>
        q.eq("guestSessionId", session._id),
      )
      .collect();
    for (const t of templates) {
      await ctx.db.patch(t._id, {
        userId,
        guestSessionId: undefined,
      });
    }

    const instances = await ctx.db
      .query("routeInstances")
      .withIndex("by_guest_session", (q) =>
        q.eq("guestSessionId", session._id),
      )
      .collect();
    for (const inst of instances) {
      await ctx.db.patch(inst._id, {
        userId,
        guestSessionId: undefined,
      });
      const logs = await ctx.db
        .query("stopLogs")
        .withIndex("by_instance", (q) => q.eq("instanceId", inst._id))
        .collect();
      for (const log of logs) {
        await ctx.db.patch(log._id, {
          userId,
          guestSessionId: undefined,
        });
      }
    }

    const bars = await ctx.db
      .query("bars")
      .withIndex("by_guest_session", (q) =>
        q.eq("guestSessionId", session._id),
      )
      .collect();
    for (const bar of bars) {
      await ctx.db.patch(bar._id, {
        createdByUserId: userId,
        guestSessionId: undefined,
      });
    }

    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_guest_session", (q) =>
        q.eq("guestSessionId", session._id),
      )
      .collect();
    for (const c of challenges) {
      await ctx.db.patch(c._id, {
        createdByUserId: userId,
        guestSessionId: undefined,
      });
    }

    await ctx.db.patch(session._id, {
      claimedByUserId: userId,
      expiresAt: args.now + 1000 * 60 * 60 * 24 * 365 * 100,
    });
    return null;
  },
});
