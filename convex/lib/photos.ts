import type { Doc, Id } from "../_generated/dataModel";

export const MAX_PHOTOS_PER_STOP = 3;
export const MAX_PHOTOS_PER_INSTANCE = 20;

/** Alle bilder på en stopp-logg, inkl. utfaset `photoStorageId` (ett bilde). */
export function logPhotoIds(
  log: Pick<Doc<"stopLogs">, "photoStorageId" | "photoStorageIds">,
): Id<"_storage">[] {
  const ids = [...(log.photoStorageIds ?? [])];
  if (log.photoStorageId && !ids.includes(log.photoStorageId)) {
    ids.unshift(log.photoStorageId);
  }
  return ids;
}
