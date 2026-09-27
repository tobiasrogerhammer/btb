import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "cleanup expired guest sessions",
  { hourUTC: 4, minuteUTC: 0 },
  internal.guestCleanup.runDailyCleanup,
);

/** Weekly Places sync — rating + opening hours (not beerPrice). */
crons.weekly(
  "sync google places details",
  { dayOfWeek: "monday", hourUTC: 5, minuteUTC: 0 },
  internal.placesSyncActions.syncAllInternal,
);

export default crons;
