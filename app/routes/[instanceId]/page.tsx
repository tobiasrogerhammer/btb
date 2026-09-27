"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { Beer, Camera, Check, Clock, Plus, Settings, Star, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";

const MAX_SUGGESTED_CHALLENGES = 3;

type OpeningSlot = { day: number; open: string; close: string };

/** Ukedag 0=søn … 6=lør i Europe/Oslo. */
function osloWeekday(now: number): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Oslo",
    weekday: "short",
  }).format(new Date(now));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

function formatTodayHours(
  openingHours: OpeningSlot[] | undefined,
  now: number,
): string | null {
  if (!openingHours || openingHours.length === 0) return null;
  const slots = openingHours.filter((h) => h.day === osloWeekday(now));
  if (slots.length === 0) return "Stengt i dag";
  return slots.map((s) => `${s.open}–${s.close}`).join(", ");
}

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

/** Google Maps–stil veibeskrivelse (skrå firkant med svingpil). */
function MapsDirectionsIcon({ className }: { className?: string }) {
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

function mapsDirectionsUrl(bar: {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}): string {
  if (bar.lat != null && bar.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${bar.lat},${bar.lng}`;
  }
  const q = bar.address?.trim() || `${bar.name} Trondheim`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
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

/** Maks 3 foreslåtte (builtin); egne utfordringer for stoppet vises alltid. */
function pickChallengesForStop(
  all: ChallengeRow[],
  barId: Id<"bars">,
): ChallengeRow[] {
  const forStop = all.filter((c) => c.barId === undefined || c.barId === barId);
  const userOnes = forStop.filter((c) => c.source === "user");
  const barSpecific = forStop.filter(
    (c) => c.source === "builtin" && c.barId === barId,
  );
  const generics = forStop.filter(
    (c) => c.source === "builtin" && c.barId === undefined,
  );

  const start =
    generics.length > 0 ? hashId(barId) % generics.length : 0;
  const rotated =
    generics.length > 0
      ? [...generics.slice(start), ...generics.slice(0, start)]
      : [];

  const suggestedSlots = Math.max(0, MAX_SUGGESTED_CHALLENGES);
  const suggested = [...barSpecific, ...rotated].slice(0, suggestedSlots);

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
  const [elapsedMs, setElapsedMs] = useState(0);

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
  const complete = useMutation(api.routes.complete);
  const createChallenge = useMutation(api.challenges.createForInstance);

  useEffect(() => {
    setCheckInBurst(false);
    setCheckingIn(false);
    setSettingsOpen(false);
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
  const stopChallenges =
    bar && challenges
      ? pickChallengesForStop(challenges, bar._id)
      : [];
  const hoursLabel = bar
    ? formatTodayHours(bar.openingHours, now)
    : null;

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
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    await attachPhoto({
      stopLogId: log._id,
      storageId,
      guestToken: token,
      now: Date.now(),
    });
  }

  async function onComplete() {
    const token = guestToken ?? (await ensureGuest());
    await complete({
      instanceId,
      guestToken: token,
      now: Date.now(),
    });
    router.push(`/routes/${instanceId}/recap`);
  }

  const km = (instance.estimatedDistanceMeters / 1000).toFixed(1).replace(".", ",");
  const totalMin = Math.max(0, Math.round(instance.estimatedTotalMinutes / 5) * 5);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const durationLabel =
    totalMin < 60
      ? `~${totalMin} min`
      : mins === 0
        ? `~${hours} t`
        : `~${hours} t ${mins} min`;
  const stopCount = instance.bars.length;
  const checkedCount = logs?.length ?? 0;
  const progressPct =
    stopCount > 0 ? (checkedCount / stopCount) * 100 : 0;

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
                  className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-[var(--surface)] py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text)] transition hover:bg-white/5"
                    onClick={() => {
                      setSettingsOpen(false);
                      router.push("/");
                    }}
                  >
                    <X className="size-4 text-[var(--muted)]" aria-hidden />
                    Avslutt runde
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
                        <span className="tabular-nums">
                          {bar.beerPrice} kr
                        </span>
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
                href={mapsDirectionsUrl(bar)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Veibeskrivelse til ${bar.name}`}
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md transition ${
                  log
                    ? "text-white hover:bg-white/15"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--brand)]"
                }`}
              >
                <MapsDirectionsIcon className="size-6" />
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
            <h2 className="text-sm font-medium">Bilde</h2>
            {log.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={log.photoUrl}
                alt=""
                className="mt-2 aspect-square w-full rounded-xl object-cover"
              />
            ) : (
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-10 text-sm text-[var(--muted)]">
                <Camera className="size-5" />
                Ta / last opp
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onPhoto(file);
                  }}
                />
              </label>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-medium">Utfordringer</h2>
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
