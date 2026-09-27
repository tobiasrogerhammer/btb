import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const openingHoursValidator = v.optional(
  v.array(
    v.object({
      day: v.number(), // 0 = Sunday … 6 = Saturday
      open: v.string(), // "HH:mm"
      close: v.string(),
    }),
  ),
);

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    acceptedDisclaimerAt: v.optional(v.number()),
  }).index("email", ["email"]),

  guestSessions: defineTable({
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    claimedByUserId: v.optional(v.id("users")),
  })
    .index("by_token", ["token"])
    .index("by_expiresAt", ["expiresAt"]),

  bars: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    priceLevel: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
    beerPrice: v.optional(v.number()),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    openingHours: openingHoursValidator,
    /** Google Places API place id — used by placesSync (fase 1.5). */
    googlePlaceId: v.optional(v.string()),
    source: v.union(v.literal("curated"), v.literal("user")),
    createdByUserId: v.optional(v.id("users")),
    guestSessionId: v.optional(v.id("guestSessions")),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_active", ["isActive"])
    .index("by_source", ["source"])
    .index("by_creator", ["createdByUserId"])
    .index("by_guest_session", ["guestSessionId"])
    .index("by_google_place", ["googlePlaceId"]),

  challenges: defineTable({
    text: v.string(),
    barId: v.optional(v.id("bars")),
    source: v.union(v.literal("builtin"), v.literal("user")),
    createdByUserId: v.optional(v.id("users")),
    guestSessionId: v.optional(v.id("guestSessions")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_bar", ["barId"])
    .index("by_source", ["source"])
    .index("by_creator", ["createdByUserId"])
    .index("by_guest_session", ["guestSessionId"]),

  routeTemplates: defineTable({
    userId: v.optional(v.id("users")),
    guestSessionId: v.optional(v.id("guestSessions")),
    name: v.string(),
    barIds: v.array(v.id("bars")),
    challengeIds: v.array(v.id("challenges")),
    estimatedDistanceMeters: v.number(),
    estimatedWalkMinutes: v.number(),
    estimatedDwellMinutes: v.number(),
    estimatedTotalMinutes: v.number(),
    stopDwellMinutes: v.array(v.number()),
    source: v.union(v.literal("manual"), v.literal("generated")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_guest_session", ["guestSessionId"]),

  routeInstances: defineTable({
    userId: v.optional(v.id("users")),
    guestSessionId: v.optional(v.id("guestSessions")),
    templateId: v.id("routeTemplates"),
    barIds: v.array(v.id("bars")),
    challengeIds: v.array(v.id("challenges")),
    estimatedDistanceMeters: v.number(),
    estimatedWalkMinutes: v.number(),
    estimatedDwellMinutes: v.number(),
    estimatedTotalMinutes: v.number(),
    stopDwellMinutes: v.array(v.number()),
    replayedFromInstanceId: v.optional(v.id("routeInstances")),
    mode: v.union(
      v.literal("solo"),
      v.literal("group"),
      v.literal("competition"),
    ),
    status: v.union(
      v.literal("planned"),
      v.literal("active"),
      v.literal("completed"),
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_completedAt", ["userId", "completedAt"])
    .index("by_guest_session", ["guestSessionId"]),

  stopLogs: defineTable({
    instanceId: v.id("routeInstances"),
    userId: v.optional(v.id("users")),
    guestSessionId: v.optional(v.id("guestSessions")),
    barId: v.id("bars"),
    orderIndex: v.number(),
    completedChallengeIds: v.array(v.id("challenges")),
    photoStorageId: v.optional(v.id("_storage")),
    checkedInAt: v.number(),
    plannedDwellMinutes: v.optional(v.number()),
    moveOnAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_instance", ["instanceId"])
    .index("by_instance_and_bar", ["instanceId", "barId"])
    .index("by_user_and_instance", ["userId", "instanceId"])
    .index("by_guest_and_instance", ["guestSessionId", "instanceId"]),
});
