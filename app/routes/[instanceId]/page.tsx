"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import {
  MAX_PHOTOS_PER_INSTANCE,
  MAX_PHOTOS_PER_STOP,
} from "@/convex/lib/photos";
import {
  Beer,
  Camera,
  Check,
  Clock,
  Plus,
  Settings,
  CircleStop,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";
import { formatHoursForNow } from "@/convex/lib/geo";
import { mapsPlaceUrl } from "@/lib/maps";

const MAX_SUGGESTED_CHALLENGES = 3;

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Google Maps–stil sted-ikon (skrå firkant med svingpil). */
function MapsPlaceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M21.71 11.29 12.71 2.29a.996.996 0 0 0-1.41 0l-9 9a.996.996 0 0 0 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 0 0 0-1.41M14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5L17.5 11z" />
    </svg>
  );
}

type ChallengeRow = {
  _id: Id<"challenges">;
  text: string;
  barId?: Id<"bars">;
  source: "builtin" | "user";
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Alle utfordringer som gjelder dette stoppet (bar-spesifikke + generiske + egne). */
function allChallengesForStop(
  all: ChallengeRow[],
  barId: Id<"bars">,
): ChallengeRow[] {
  return all.filter((c) => c.barId === undefined || c.barId === barId);
}

/** Maks 3 foreslåtte (builtin); egne utfordringer for stoppet vises alltid. */
function pickChallengesForStop(
  all: ChallengeRow[],
  barId: Id<"bars">,
): ChallengeRow[] {
  const forStop = allChallengesForStop(all, barId);
  const userOnes = forStop.filter((c) => c.source === "user");
  const barSpecific = forStop.filter(
    (c) => c.source === "builtin" && c.barId === barId,
  );
  const generics = forStop.filter(
    (c) => c.source === "builtin" && c.barId === undefined,
  );

  const start = generics.length > 0 ? hashId(barId) % generics.length : 0;
  const rotated =
    generics.length > 0
      ? [...generics.slice(start), ...generics.slice(0, start)]
      : [];

  const suggested = [...barSpecific, ...rotated].slice(
    0,
    MAX_SUGGESTED_CHALLENGES,
  );

  const seen = new Set(userOnes.map((c) => c._id));
  const merged = [...userOnes];
  for (const c of suggested) {
    if (!seen.has(c._id)) {
      seen.add(c._id);
      merged.push(c);
    }
  }
  return merged;
}

/**
 * Stoppliste: foreslåtte (+ egne) + hukede fra «Se alle» som ikke allerede er der.
 * Gjennomførte sorteres øverst så det er tydelig hva som er gjort.
 */
function visibleChallengesForStop(
  all: ChallengeRow[],
  barId: Id<"bars">,
  completedIds: Id<"challenges">[],
): ChallengeRow[] {
  const base = pickChallengesForStop(all, barId);
  const baseIds = new Set(base.map((c) => c._id));
  const done = new Set(completedIds);
  const extras = allChallengesForStop(all, barId).filter(
    (c) => done.has(c._id) && !baseIds.has(c._id),
  );
  const merged = [...extras, ...base];
  return [
    ...merged.filter((c) => done.has(c._id)),
    ...merged.filter((c) => !done.has(c._id)),
  ];
}

function AllChallengesDialog({
  challenges,
  completedIds,
  onToggle,
  onClose,
}: {
  challenges: ChallengeRow[];
  completedIds: Id<"challenges">[];
  onToggle: (id: Id<"challenges">) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const done = new Set(completedIds);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const sorted = [
    ...challenges.filter((c) => done.has(c._id)),
    ...challenges.filter((c) => !done.has(c._id)),
  ];

  return (
    <dialog
      ref={ref}
      aria-label="Alle utfordringer"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="recap-dialog m-auto max-h-[min(78dvh,42rem)] w-[calc(100%-3rem)] max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[var(--surface)] p-0 text-[var(--text)] shadow-2xl backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/5 bg-[var(--surface)] px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          title="Lukk"
          className="flex size-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          <X className="size-5" aria-hidden />
        </button>
        <h2 className="min-w-0 flex-1 text-center font-[family-name:var(--font-display)] text-base">
          Alle utfordringer
        </h2>
        <span className="size-10 shrink-0" aria-hidden />
      </div>
      <ul className="space-y-2 px-4 py-4">
        {sorted.map((c) => {
          const isDone = done.has(c._id);
          return (
            <li key={c._id}>
              <button
                type="button"
                onClick={() => onToggle(c._id)}
                className="flex w-full items-start gap-3 rounded-lg bg-[var(--bg)] px-3 py-3 text-left text-sm"
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                    isDone
                      ? "border-[var(--brand)] bg-[var(--brand)]"
                      : "border-white/20"
                  }`}
                >
                  {isDone && <Check className="size-3 text-white" />}
                </span>
                <span className="min-w-0 flex-1 text-pretty">{c.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}

export default function ActiveRoutePage() {
  const params = useParams();
  const instanceId = params.instanceId as Id<"routeInstances">;
  const router = useRouter();
  const { guestToken, ensureGuest } = useGuest();
  const now = useMemo(() => Date.now(), []);
  const [stopIndex, setStopIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [addingChallenge, setAddingChallenge] = useState(false);
  const [newChallengeText, setNewChallengeText] = useState("");
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInBurst, setCheckInBurst] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [confirmStopOpen, setConfirmStopOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingRound, setDeletingRound] = useState(false);
  const [customStopName, setCustomStopName] = useState("");
  const [addingStop, setAddingStop] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [allChallengesOpen, setAllChallengesOpen] = useState(false);

  const instance = useQuery(api.routes.getInstance, {
    instanceId,
    guestToken: guestToken ?? undefined,
    now,
  });
  const logs = useQuery(api.stopLogs.listForInstance, {
    instanceId,
    guestToken: guestToken ?? undefined,
    now,
  });
  const catalogBars = useQuery(api.bars.listActive, {
    guestToken: guestToken ?? undefined,
    now,
  });
  const challenges = useQuery(
    api.challenges.listForBars,
    instance
      ? {
          barIds: instance.barIds,
          guestToken: guestToken ?? undefined,
          now,
        }
      : "skip",
  );

  const checkIn = useMutation(api.stopLogs.checkIn);
  const toggle = useMutation(api.stopLogs.toggleChallenge);
  const generateUploadUrl = useMutation(api.stopLogs.generateUploadUrl);
  const attachPhoto = useMutation(api.stopLogs.attachPhoto);
  const removePhoto = useMutation(api.stopLogs.removePhoto);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const complete = useMutation(api.routes.complete);
  const deleteInstance = useMutation(api.routes.deleteInstance);
  const createChallenge = useMutation(api.challenges.createForInstance);
  const addStop = useMutation(api.routes.addStop);
  const createUserBar = useMutation(api.bars.createUserBar);

  useEffect(() => {
    setCheckInBurst(false);
    setCheckingIn(false);
    setSettingsOpen(false);
    setAllChallengesOpen(false);
  }, [stopIndex]);

  useEffect(() => {
    const startedAt = instance?.startedAt;
    if (startedAt == null) {
      setElapsedMs(0);
      return;
    }
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [instance?.startedAt]);

  if (instance === undefined) {
    return (
      <AppShell>
        <p className="text-[var(--muted)]">Laster runden…</p>
      </AppShell>
    );
  }
  if (instance === null) {
    return (
      <AppShell>
        <p>Fant ikke runden.</p>
      </AppShell>
    );
  }

  const bar = instance.bars[stopIndex];
  const log = logs?.find((l) => l.barId === bar?._id);
  const totalPhotos = (logs ?? []).reduce((n, l) => n + l.photos.length, 0);
  const allStopChallenges =
    bar && challenges ? allChallengesForStop(challenges, bar._id) : [];
  const stopChallenges =
    bar && challenges
      ? visibleChallengesForStop(
          challenges,
          bar._id,
          log?.completedChallengeIds ?? [],
        )
      : [];
  const hoursLabel = bar ? formatHoursForNow(bar.openingHours, now) : null;

  async function onCheckIn() {
    if (!bar || checkingIn) return;
    setError(null);
    setCheckingIn(true);
    try {
      const token = guestToken ?? (await ensureGuest());
      await checkIn({
        instanceId,
        barId: bar._id,
        orderIndex: stopIndex,
        guestToken: token,
        now: Date.now(),
      });
      setCheckInBurst(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feil");
    } finally {
      setCheckingIn(false);
    }
  }

  async function onToggle(challengeId: Id<"challenges">) {
    if (!log) return;
    const token = guestToken ?? (await ensureGuest());
    await toggle({
      stopLogId: log._id,
      challengeId,
      guestToken: token,
      now: Date.now(),
    });
  }

  async function onAddChallenge() {
    if (!bar) return;
    const text = newChallengeText.trim();
    if (!text) return;
    setSavingChallenge(true);
    setError(null);
    try {
      const token = guestToken ?? (await ensureGuest());
      await createChallenge({
        instanceId,
        barId: bar._id,
        text,
        guestToken: token,
        now: Date.now(),
      });
      setNewChallengeText("");
      setAddingChallenge(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke lagre utfordring");
    } finally {
      setSavingChallenge(false);
    }
  }

  async function onPhoto(file: File) {
    if (!log) return;
    if (log.photos.length >= MAX_PHOTOS_PER_STOP) {
      setError(`Maks ${MAX_PHOTOS_PER_STOP} bilder per stopp`);
      return;
    }
    if (totalPhotos >= MAX_PHOTOS_PER_INSTANCE) {
      setError(`Maks ${MAX_PHOTOS_PER_INSTANCE} bilder per kveld`);
      return;
    }
    setUploadingPhoto(true);
    setError(null);
    try {
      const token = guestToken ?? (await ensureGuest());
      const uploadUrl = await generateUploadUrl({
        guestToken: token,
        now: Date.now(),
      });
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Opplasting feilet");
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      const ok = await attachPhoto({
        stopLogId: log._id,
        storageId,
        guestToken: token,
        now: Date.now(),
      });
      if (!ok) setError("Maks antall bilder er nådd");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke laste opp bildet");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onRemovePhoto(storageId: Id<"_storage">) {
    if (!log) return;
    setRemovingPhoto(true);
    setError(null);
    try {
      const token = guestToken ?? (await ensureGuest());
      await removePhoto({
        stopLogId: log._id,
        storageId,
        guestToken: token,
        now: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke fjerne bildet");
    } finally {
      setRemovingPhoto(false);
    }
  }

  async function onComplete() {
    const token = guestToken ?? (await ensureGuest());
    await complete({
      instanceId,
      guestToken: token,
      now: Date.now(),
    });
    router.push(`/routes/${instanceId}/recap?save=1`);
  }

  const stopCount = instance.bars.length;

  async function onAddCatalogStop(barId: Id<"bars">) {
    if (addingStop) return;
    setAddingStop(true);
    setError(null);
    try {
      const token = guestToken ?? (await ensureGuest());
      await addStop({
        instanceId,
        barId,
        guestToken: token,
        now: Date.now(),
      });
      setAddStopOpen(false);
      setCustomStopName("");
      setStopIndex(stopCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke legge til stopp");
    } finally {
      setAddingStop(false);
    }
  }

  async function onAddCustomStop() {
    const name = customStopName.trim();
    if (!name || addingStop) return;
    setAddingStop(true);
    setError(null);
    try {
      const token = guestToken ?? (await ensureGuest());
      const barId = await createUserBar({
        name,
        guestToken: token,
        now: Date.now(),
      });
      await addStop({
        instanceId,
        barId,
        guestToken: token,
        now: Date.now(),
      });
      setAddStopOpen(false);
      setCustomStopName("");
      setStopIndex(stopCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke legge til stopp");
    } finally {
      setAddingStop(false);
    }
  }

  const km = (instance.estimatedDistanceMeters / 1000)
    .toFixed(1)
    .replace(".", ",");
  const totalMin = Math.max(
    0,
    Math.round(instance.estimatedTotalMinutes / 5) * 5,
  );
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const durationLabel =
    totalMin < 60
      ? `~${totalMin} min`
      : mins === 0
        ? `~${hours} t`
        : `~${hours} t ${mins} min`;
  const checkedCount = logs?.length ?? 0;
  const progressPct = stopCount > 0 ? (checkedCount / stopCount) * 100 : 0;

  return (
    <AppShell>
      <div className="route-status sticky top-0 z-20 -mx-4 mb-5 border-b border-white/10 bg-[var(--bg)]/90 px-4 pb-3 pt-1 backdrop-blur-md">
        <div className="mb-2.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text)]">
              Stopp {stopIndex + 1}{" "}
              <span className="font-normal text-[var(--muted)]">
                av {stopCount}
              </span>
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1 tabular-nums text-[var(--text)]">
                <Clock className="size-3" aria-hidden />
                {formatElapsed(elapsedMs)}
              </span>
              <span aria-hidden>·</span>
              <span>
                ~{km} km · {durationLabel}
              </span>
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Innstillinger"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((v) => !v)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-[var(--muted)] transition hover:border-white/30 hover:text-[var(--text)]"
            >
              <Settings className="size-4" aria-hidden />
            </button>
            {settingsOpen && (
              <>
                <button
                  type="button"
                  aria-label="Lukk meny"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setSettingsOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-lg border border-white/10 bg-[var(--surface)] py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text)] transition hover:bg-white/5"
                    onClick={() => {
                      setSettingsOpen(false);
                      setAddStopOpen(true);
                    }}
                  >
                    <Plus className="size-4 text-[var(--muted)]" aria-hidden />
                    Legg til stopp
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text)] transition hover:bg-white/5"
                    onClick={() => {
                      setSettingsOpen(false);
                      setConfirmStopOpen(true);
                    }}
                  >
                    <CircleStop
                      className="size-4 text-[var(--muted)]"
                      aria-hidden
                    />
                    Stopp runde
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                    onClick={() => {
                      setSettingsOpen(false);
                      setConfirmDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Slett runde
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={checkedCount}
          aria-valuemin={0}
          aria-valuemax={stopCount}
          aria-label={`${checkedCount} av ${stopCount} stopp innsjekket`}
        >
          <div
            className="route-status__fill h-full rounded-full bg-[var(--brand)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {bar && (
        <section
          className={
            log
              ? `venue-checked relative overflow-hidden rounded-xl${
                  checkInBurst ? " venue-checked--burst" : ""
                }`
              : "rounded-xl bg-[var(--surface)] p-4"
          }
          onAnimationEnd={(e) => {
            if (
              e.target === e.currentTarget &&
              checkInBurst &&
              e.animationName === "venue-check-burst"
            ) {
              setCheckInBurst(false);
            }
          }}
        >
          <div className={log ? "venue-checked__core relative p-4" : undefined}>
            <div className="relative z-[1] flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  className={`font-[family-name:var(--font-display)] text-2xl leading-tight ${
                    log ? "text-white" : ""
                  }`}
                >
                  {bar.name}
                </h1>
                {(bar.rating != null ||
                  bar.beerPrice != null ||
                  hoursLabel) && (
                  <p
                    className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${
                      log ? "text-white/90" : "text-[var(--muted)]"
                    }`}
                  >
                    {bar.rating != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star
                          className={`size-3 ${
                            log
                              ? "fill-white text-white"
                              : "fill-[#F5C518] text-[#F5C518]"
                          }`}
                          aria-hidden
                        />
                        <span className="tabular-nums">
                          {bar.rating.toFixed(1).replace(".", ",")}
                        </span>
                        {bar.ratingCount != null && (
                          <span
                            className={`tabular-nums ${
                              log ? "text-white/75" : "text-[var(--muted)]/70"
                            }`}
                          >
                            ({bar.ratingCount})
                          </span>
                        )}
                      </span>
                    )}
                    {bar.beerPrice != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <Beer className="size-3" aria-hidden />
                        <span className="tabular-nums">{bar.beerPrice} kr</span>
                      </span>
                    )}
                    {hoursLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3 shrink-0" aria-hidden />
                        <span>{hoursLabel}</span>
                      </span>
                    )}
                  </p>
                )}
              </div>
              <a
                href={mapsPlaceUrl(bar)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Vis ${bar.name} i Google Maps`}
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md transition ${
                  log
                    ? "text-white hover:bg-white/15"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--brand)]"
                }`}
              >
                <MapsPlaceIcon className="size-6" />
              </a>
            </div>
            {!log ? (
              <div className="mt-4">
                <PrimaryButton
                  disabled={checkingIn}
                  onClick={() => void onCheckIn()}
                >
                  {checkingIn ? "Sjekker inn…" : "Sjekk inn"}
                </PrimaryButton>
              </div>
            ) : (
              <p className="venue-checked__status relative z-[1] mt-3 flex items-center gap-2 text-sm font-medium text-white">
                <Check className="size-4" aria-hidden /> Innsjekket
              </p>
            )}
          </div>
        </section>
      )}

      {log && (
        <>
          <section className="mt-6">
            <h2 className="text-sm font-medium">
              {log.photos.length > 1 ? "Bilder" : "Bilde"}
            </h2>
            <div className="mt-2 space-y-2">
              {log.photos.length > 0 && (
                <div
                  className={`grid gap-2 ${
                    log.photos.length === 1
                      ? "mx-auto w-[78%] grid-cols-1"
                      : log.photos.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                  }`}
                >
                  {log.photos.map((photo) => (
                    <div key={photo.storageId} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        disabled={removingPhoto}
                        onClick={() => void onRemovePhoto(photo.storageId)}
                        aria-label="Fjern bilde"
                        title="Fjern bilde"
                        className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-black/70 text-red-400 transition-colors hover:bg-black/85 hover:text-red-300 disabled:opacity-40"
                      >
                        <X className="size-5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {log.photos.length < MAX_PHOTOS_PER_STOP &&
                totalPhotos < MAX_PHOTOS_PER_INSTANCE && (
                  <label
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-sm text-[var(--muted)] ${
                      log.photos.length === 0 ? "py-10" : "py-3"
                    } ${uploadingPhoto ? "pointer-events-none opacity-40" : ""}`}
                  >
                    <Camera className="size-5" aria-hidden />
                    {uploadingPhoto ? "Laster opp…" : "Ta / last opp"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void onPhoto(file);
                      }}
                    />
                  </label>
                )}
            </div>
            {log.photos.length >= MAX_PHOTOS_PER_STOP && (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Maks {MAX_PHOTOS_PER_STOP} bilder per stopp
              </p>
            )}
            {log.photos.length < MAX_PHOTOS_PER_STOP &&
              totalPhotos >= MAX_PHOTOS_PER_INSTANCE && (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Du har nådd maks {MAX_PHOTOS_PER_INSTANCE} bilder for kvelden.
                </p>
              )}
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Utfordringer</h2>
              {allStopChallenges.length > MAX_SUGGESTED_CHALLENGES && (
                <button
                  type="button"
                  onClick={() => setAllChallengesOpen(true)}
                  className="shrink-0 text-sm font-medium text-[var(--brand)] transition hover:text-[var(--brand)]/80"
                >
                  Se alle
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-2">
              {stopChallenges.map((c) => {
                const done = log.completedChallengeIds.includes(c._id);
                return (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={() => void onToggle(c._id)}
                      className="flex w-full items-start gap-3 rounded-lg bg-[var(--surface)] px-3 py-3 text-left text-sm"
                    >
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                          done
                            ? "border-[var(--brand)] bg-[var(--brand)]"
                            : "border-white/20"
                        }`}
                      >
                        {done && <Check className="size-3 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">{c.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {addingChallenge ? (
              <div className="mt-2 space-y-2">
                <input
                  className="w-full rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--brand)]/60 focus:outline-none"
                  value={newChallengeText}
                  onChange={(e) => setNewChallengeText(e.target.value)}
                  placeholder="Skriv din egen utfordring…"
                  maxLength={160}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onAddChallenge();
                    }
                    if (e.key === "Escape") {
                      setAddingChallenge(false);
                      setNewChallengeText("");
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={savingChallenge || !newChallengeText.trim()}
                    onClick={() => void onAddChallenge()}
                    className="flex-1 rounded-lg bg-[var(--brand)] py-2 text-sm font-medium disabled:opacity-40"
                  >
                    {savingChallenge ? "Lagrer…" : "Legg til"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingChallenge(false);
                      setNewChallengeText("");
                    }}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-[var(--muted)]"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingChallenge(true)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2.5 text-sm text-[var(--muted)] transition hover:border-white/30 hover:text-[var(--text)]"
              >
                <Plus className="size-4" />
                Egen utfordring
              </button>
            )}
          </section>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {allChallengesOpen && bar && log && (
        <AllChallengesDialog
          challenges={allStopChallenges}
          completedIds={log.completedChallengeIds}
          onToggle={(id) => void onToggle(id)}
          onClose={() => setAllChallengesOpen(false)}
        />
      )}

      {confirmStopOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => setConfirmStopOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-stop-title"
            aria-describedby="confirm-stop-desc"
            className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="confirm-stop-title"
              className="font-[family-name:var(--font-display)] text-lg text-[var(--text)]"
            >
              Stoppe runden?
            </h2>
            <p
              id="confirm-stop-desc"
              className="mt-2 text-sm leading-snug text-[var(--muted)]"
            >
              Du går tilbake til forsiden. Fremgangen blir værende, så du kan
              fortsette senere. Runden fullføres ikke som «Vi overlevde».
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmStopOpen(false)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-[var(--text)] transition hover:bg-white/5"
              >
                Fortsett runden
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmStopOpen(false);
                  router.push("/");
                }}
                className="flex-1 rounded-lg bg-[var(--brand)] px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Stopp runde
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!deletingRound) setConfirmDeleteOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            aria-describedby="confirm-delete-desc"
            className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="confirm-delete-title"
              className="font-[family-name:var(--font-display)] text-lg text-[var(--text)]"
            >
              Slette runden?
            </h2>
            <p
              id="confirm-delete-desc"
              className="mt-2 text-sm leading-snug text-[var(--muted)]"
            >
              Sletter runden og alle bildene fra den. Dette kan ikke angres.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={deletingRound}
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-[var(--text)] transition hover:bg-white/5 disabled:opacity-40"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={deletingRound}
                onClick={() => {
                  void (async () => {
                    setDeletingRound(true);
                    setError(null);
                    try {
                      const token = guestToken ?? (await ensureGuest());
                      await deleteInstance({
                        instanceId,
                        guestToken: token,
                        now: Date.now(),
                      });
                      router.replace("/");
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Kunne ikke slette runden",
                      );
                      setDeletingRound(false);
                      setConfirmDeleteOpen(false);
                    }
                  })();
                }}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-40"
              >
                {deletingRound ? "Sletter…" : "Slett runde"}
              </button>
            </div>
          </div>
        </div>
      )}

      {addStopOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!addingStop) {
              setAddStopOpen(false);
              setCustomStopName("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-stop-title"
            className="flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--surface)] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2
                id="add-stop-title"
                className="font-[family-name:var(--font-display)] text-lg text-[var(--text)]"
              >
                Legg til stopp
              </h2>
              <button
                type="button"
                aria-label="Lukk"
                disabled={addingStop}
                onClick={() => {
                  setAddStopOpen(false);
                  setCustomStopName("");
                }}
                className="inline-flex size-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)]"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <p className="text-xs text-[var(--muted)]">Fra katalogen</p>
              <ul className="mt-2 space-y-1">
                {catalogBars === undefined && (
                  <li className="py-2 text-sm text-[var(--muted)]">Laster…</li>
                )}
                {catalogBars !== undefined &&
                  catalogBars.filter((b) => !instance.barIds.includes(b._id))
                    .length === 0 && (
                    <li className="py-2 text-sm text-[var(--muted)]">
                      Ingen flere utesteder i katalogen.
                    </li>
                  )}
                {(catalogBars ?? [])
                  .filter((b) => !instance.barIds.includes(b._id))
                  .map((b) => (
                    <li key={b._id}>
                      <button
                        type="button"
                        disabled={addingStop}
                        onClick={() => void onAddCatalogStop(b._id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-sm text-[var(--text)] transition hover:bg-white/5 disabled:opacity-40"
                      >
                        <span className="min-w-0 truncate">{b.name}</span>
                        <Plus
                          className="size-4 shrink-0 text-[var(--muted)]"
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
              </ul>

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs text-[var(--muted)]">Eget stopp</p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--brand)]/60 focus:outline-none"
                    value={customStopName}
                    onChange={(e) => setCustomStopName(e.target.value)}
                    placeholder="Navn på stedet…"
                    disabled={addingStop}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onAddCustomStop();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={addingStop || !customStopName.trim()}
                    onClick={() => void onAddCustomStop()}
                    className="shrink-0 rounded-lg bg-[var(--brand)] px-3 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {addingStop ? "…" : "Legg til"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          disabled={stopIndex === 0}
          onClick={() => {
            setStopIndex((i) => i - 1);
            setAddingChallenge(false);
            setNewChallengeText("");
          }}
          className="flex-1 rounded-lg border border-white/15 py-3 text-sm disabled:opacity-30"
        >
          Forrige
        </button>
        {stopIndex < instance.bars.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              setStopIndex((i) => i + 1);
              setAddingChallenge(false);
              setNewChallengeText("");
            }}
            className="flex-1 rounded-lg bg-[var(--brand)] py-3 text-sm font-medium"
          >
            Neste stopp
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onComplete()}
            className="flex-1 rounded-lg bg-[var(--brand)] py-3 text-sm font-medium"
          >
            Vi overlevde
          </button>
        )}
      </div>
    </AppShell>
  );
}
