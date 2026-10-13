"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Check, Share, Trash2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";
import {
  exportFileName,
  MAX_EXPORT_CHALLENGES,
  renderRecapImage,
} from "@/lib/recapExport";

function formatClock(ms: number): string {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Oslo",
  }).format(new Date(ms));
}

const MAX_PICK = MAX_EXPORT_CHALLENGES;

function ShareChallengePicker({
  challenges,
  selectedIds,
  sharing,
  shareError,
  onToggle,
  onConfirm,
  onClose,
}: {
  challenges: { _id: Id<"challenges">; text: string }[];
  selectedIds: Id<"challenges">[];
  sharing: boolean;
  shareError: string | null;
  onToggle: (id: Id<"challenges">) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const selected = new Set(selectedIds);
  const atMax = selectedIds.length >= MAX_PICK;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label="Velg utfordringer til bilde"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sharing) onClose();
      }}
      className="recap-dialog m-auto max-h-[min(78dvh,42rem)] w-[calc(100%-3rem)] max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[var(--surface)] p-0 text-[var(--text)] shadow-2xl backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/5 bg-[var(--surface)] px-3 py-2.5">
        <button
          type="button"
          disabled={sharing}
          onClick={onClose}
          aria-label="Lukk"
          title="Lukk"
          className="flex size-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-[var(--text)] disabled:opacity-40"
        >
          <X className="size-5" aria-hidden />
        </button>
        <h2 className="min-w-0 flex-1 text-center font-[family-name:var(--font-display)] text-base">
          Velg utfordringer
        </h2>
        <span className="size-10 shrink-0" aria-hidden />
      </div>
      <div className="px-4 pb-5 pt-3">
        <p className="text-pretty text-sm text-[var(--muted)]">
          Ta med opptil {MAX_PICK} på delebildet.{" "}
          <span className="tabular-nums text-[var(--text)]">
            {selectedIds.length}/{MAX_PICK}
          </span>{" "}
          valgt.
        </p>
        <ul className="mt-3 space-y-2">
          {challenges.map((c) => {
            const isOn = selected.has(c._id);
            const locked = !isOn && atMax;
            return (
              <li key={c._id}>
                <button
                  type="button"
                  disabled={sharing || locked}
                  onClick={() => onToggle(c._id)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                    locked
                      ? "bg-[var(--bg)]/50 text-[var(--muted)] opacity-50"
                      : "bg-[var(--bg)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                      isOn
                        ? "border-[var(--brand)] bg-[var(--brand)]"
                        : "border-white/20"
                    }`}
                  >
                    {isOn && <Check className="size-3 text-white" />}
                  </span>
                  <span className="min-w-0 flex-1 text-pretty">{c.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {challenges.length > MAX_PICK && (
          <p className="mt-3 text-sm tabular-nums text-[var(--muted)]">
            + {challenges.length - MAX_PICK} utfordring
            {challenges.length - MAX_PICK === 1 ? "" : "er"}
          </p>
        )}
        {shareError && (
          <p className="mt-3 text-sm text-red-400">{shareError}</p>
        )}
        <PrimaryButton className="mt-4" disabled={sharing} onClick={onConfirm}>
          {sharing ? "Lager bilde…" : "Del bilde"}
        </PrimaryButton>
      </div>
    </dialog>
  );
}

export function RecapView({
  instanceId,
  isSaveFlow = false,
  onClose,
  onDeleted,
}: {
  instanceId: Id<"routeInstances">;
  /** `?save=1`: nettopp fullført kveld (navn kan redigeres, «Lagre minner»). */
  isSaveFlow?: boolean;
  /** Vises som kryss øverst når en lagret kveld åpnes (popup / dyplenke). */
  onClose?: () => void;
  /** Etter sletting; standard er å gå til /me. */
  onDeleted?: () => void;
}) {
  const { guestToken, clearGuest } = useGuest();
  const { isAuthenticated } = useConvexAuth();
  const now = useMemo(() => Date.now(), []);
  const router = useRouter();
  const claim = useMutation(api.routes.claimGuest);
  const rename = useMutation(api.routes.rename);
  const replay = useMutation(api.routes.replay);
  const deleteInstance = useMutation(api.routes.deleteInstance);

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

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sharePickerOpen, setSharePickerOpen] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState<
    Id<"challenges">[]
  >([]);
  const [shareError, setShareError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (instance?.name) {
      setName(
        instance.name === "Mitt emne" || instance.name === "Min kveld"
          ? ""
          : instance.name,
      );
    }
  }, [instance?.name]);

  if (!instance) {
    return <p className="text-[var(--muted)]">Laster recap…</p>;
  }

  const route = instance;
  const barNameById = new Map(route.bars.map((b) => [b._id, b.name]));
  const photos = (logs ?? []).flatMap((l) =>
    l.photos.map((p) => ({
      url: p.url,
      barName: barNameById.get(l.barId) ?? null,
    })),
  );

  const doneIds = new Set((logs ?? []).flatMap((l) => l.completedChallengeIds));
  const doneChallenges = (challenges ?? []).filter((c) => doneIds.has(c._id));

  async function persistName(): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Gi kvelden et navn");
      return false;
    }
    if (trimmed === route.name) {
      setNameError(null);
      return true;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await rename({
        instanceId,
        name: trimmed,
        guestToken: guestToken ?? undefined,
        now: Date.now(),
      });
      return true;
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Kunne ikke lagre navn");
      return false;
    } finally {
      setSavingName(false);
    }
  }

  async function onSaveMemories() {
    setBusy(true);
    setActionError(null);
    try {
      const ok = await persistName();
      if (!ok) {
        setBusy(false);
        return;
      }

      if (!isAuthenticated) {
        if (!guestToken) {
          router.push("/sign-in");
          return;
        }
        router.push(`/sign-in?claim=1`);
        return;
      }

      if (!route.savedToAccount && guestToken) {
        await claim({ guestToken, now: Date.now() });
        clearGuest();
      }

      router.push("/me");
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Kunne ikke lagre minner",
      );
      setBusy(false);
    }
  }

  async function onReplay() {
    setBusy(true);
    setActionError(null);
    try {
      const id = await replay({
        instanceId,
        now: Date.now(),
      });
      router.push(`/routes/${id}`);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Kunne ikke starte på nytt",
      );
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    setActionError(null);
    try {
      await deleteInstance({
        instanceId,
        guestToken: guestToken ?? undefined,
        now: Date.now(),
      });
      if (onDeleted) onDeleted();
      else router.replace("/me");
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Kunne ikke slette kvelden",
      );
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const showSave = isSaveFlow || !isAuthenticated || !route.savedToAccount;
  const showReplay = isAuthenticated && route.savedToAccount && !isSaveFlow;

  /** Lagret, gjennomført kveld åpnet senere: navn er låst (ikke input). */
  const readOnly = showReplay;
  const logByBar = new Map((logs ?? []).map((l) => [l.barId, l]));
  const challengeById = new Map((challenges ?? []).map((c) => [c._id, c]));

  /** Hukede utfordringer i stopp-rekkefølge — brukes til delebilde (unike). */
  const exportableChallenges = (() => {
    const seen = new Set<Id<"challenges">>();
    const list: { _id: Id<"challenges">; text: string }[] = [];
    for (const bar of route.bars) {
      const log = logByBar.get(bar._id);
      for (const id of log?.completedChallengeIds ?? []) {
        if (seen.has(id)) continue;
        const c = challengeById.get(id);
        if (!c) continue;
        seen.add(id);
        list.push({ _id: c._id, text: c.text });
      }
    }
    return list;
  })();

  function openSharePicker() {
    setShareError(null);
    setSelectedExportIds(
      exportableChallenges.slice(0, MAX_EXPORT_CHALLENGES).map((c) => c._id),
    );
    if (exportableChallenges.length === 0) {
      void doShare([]);
      return;
    }
    setSharePickerOpen(true);
  }

  function toggleExportChallenge(id: Id<"challenges">) {
    setSelectedExportIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_EXPORT_CHALLENGES) return prev;
      return [...prev, id];
    });
  }

  async function doShare(challengeIds: Id<"challenges">[]) {
    setSharing(true);
    setShareError(null);
    try {
      const idSet = new Set(challengeIds);
      const exportChallenges = exportableChallenges
        .filter((c) => idSet.has(c._id))
        .slice(0, MAX_EXPORT_CHALLENGES)
        .map((c) => ({ text: c.text }));
      const moreChallengesCount = Math.max(
        0,
        exportableChallenges.length - exportChallenges.length,
      );
      const blob = await renderRecapImage({
        name: route.name,
        photos,
        challenges: exportChallenges,
        moreChallengesCount,
      });
      const fileName = exportFileName(route.name);
      const file = new File([blob], fileName, { type: "image/png" });
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: route.name });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      setSharePickerOpen(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setShareError(e instanceof Error ? e.message : "Kunne ikke dele kvelden");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      {readOnly && onClose && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            title="Lukk"
            className="flex size-10 items-center justify-center rounded-full border border-white/20 text-[var(--text)] transition hover:border-white/40 hover:bg-white/5"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}
      {!readOnly && <p className="text-sm text-[var(--brand)]">Vi overlevde</p>}
      <div className="mt-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {readOnly ? (
            <h1 className="text-balance font-[family-name:var(--font-display)] text-2xl text-[var(--text)]">
              {route.name}
            </h1>
          ) : (
            <>
              <label className="block">
                <span className="sr-only">Navn på kvelden</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2.5 font-[family-name:var(--font-display)] text-2xl text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--brand)]/60 focus:outline-none"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                  onBlur={() => {
                    if (name.trim()) void persistName();
                  }}
                  placeholder="Gi kvelden et navn"
                  maxLength={80}
                  autoComplete="off"
                />
              </label>
              {nameError && (
                <p className="mt-1.5 text-sm text-red-400">{nameError}</p>
              )}
            </>
          )}
          <p className="mt-2 text-sm text-[var(--muted)]">
            {route.bars.length} stopp · {doneChallenges.length} utfordringer
            huket av
            {savingName ? " · Lagrer…" : ""}
          </p>
        </div>
        {photos.length > 0 && (
          <button
            type="button"
            disabled={busy || sharing}
            onClick={() => openSharePicker()}
            aria-label={sharing ? "Lager bilde…" : "Del kveld"}
            title="Del kveld"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/20 text-[var(--text)] transition hover:border-white/40 hover:bg-white/5 disabled:opacity-40"
          >
            <Share
              className={`size-5 ${sharing ? "animate-pulse" : ""}`}
              aria-hidden
            />
          </button>
        )}
      </div>
      {shareError && !sharePickerOpen && (
        <p className="mt-2 text-sm text-red-400">{shareError}</p>
      )}

      {sharePickerOpen && (
        <ShareChallengePicker
          challenges={exportableChallenges}
          selectedIds={selectedExportIds}
          sharing={sharing}
          shareError={shareError}
          onToggle={toggleExportChallenge}
          onConfirm={() => void doShare(selectedExportIds)}
          onClose={() => {
            if (!sharing) setSharePickerOpen(false);
          }}
        />
      )}

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {photos.map(({ url, barName }) => (
            <figure
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={barName ? `Bilde fra ${barName}` : ""}
                className="size-full object-cover"
              />
              {barName && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-8 text-sm font-medium leading-tight text-white">
                  <span className="line-clamp-2">{barName}</span>
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Kvelden stopp for stopp
        </h2>
        <ol className="mt-4">
          {route.bars.map((bar, i) => {
            const log = logByBar.get(bar._id);
            const visited = log != null;
            const nextVisited =
              i < route.bars.length - 1 && logByBar.has(route.bars[i + 1]!._id);
            const isLast = i === route.bars.length - 1;
            const skipped = logs !== undefined && !visited;
            const stopChallenges = (log?.completedChallengeIds ?? []).flatMap(
              (id) => {
                const c = challengeById.get(id);
                return c ? [c] : [];
              },
            );
            return (
              <li
                key={bar._id}
                className={`relative pl-11 ${isLast ? "" : "pb-7"}`}
              >
                {!isLast && (
                  <span
                    aria-hidden
                    className={`absolute left-3 top-8 -bottom-0.5 w-0.5 -translate-x-1/2 rounded-full ${
                      visited && nextVisited
                        ? "bg-[var(--brand)]"
                        : "bg-white/10"
                    }`}
                  />
                )}
                <span
                  aria-hidden
                  className={`absolute left-0 top-0 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    skipped
                      ? "border border-white/20 text-[var(--muted)]"
                      : "bg-[var(--brand)] text-white"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <h3
                    className={`min-w-0 text-balance font-[family-name:var(--font-display)] text-xl leading-tight ${
                      skipped ? "text-[var(--muted)]" : "text-[var(--text)]"
                    }`}
                  >
                    {bar.name}
                  </h3>
                  {log && (
                    <time
                      dateTime={new Date(log.checkedInAt).toISOString()}
                      className="shrink-0 text-xs tabular-nums text-[var(--muted)]"
                    >
                      <span className="sr-only">Sjekket inn </span>
                      {formatClock(log.checkedInAt)}
                    </time>
                  )}
                </div>
                {skipped && (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Ikke sjekket inn
                  </p>
                )}
                {stopChallenges.length > 0 && (
                  <ul className="mt-2.5 space-y-2">
                    {stopChallenges.map((c) => (
                      <li
                        key={c._id}
                        className="flex gap-2 text-sm leading-snug text-[var(--text)]/85"
                      >
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-[var(--brand)]"
                          aria-hidden
                        />
                        <span>{c.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        {logs !== undefined && doneChallenges.length === 0 && (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Ingen utfordringer huket av — æresystem.
          </p>
        )}
      </section>

      {(showSave || showReplay) && (
        <div className="mt-8 space-y-3">
          {showSave && (
            <>
              <PrimaryButton
                disabled={busy}
                onClick={() => void onSaveMemories()}
              >
                {busy ? "Lagrer…" : "Lagre minner :)"}
              </PrimaryButton>
              {!isAuthenticated && (
                <p className="text-center text-xs text-[var(--muted)]">
                  Uten lagring slettes dataen dagen etter.
                </p>
              )}
            </>
          )}
          {showReplay && (
            <PrimaryButton disabled={busy} onClick={() => void onReplay()}>
              {busy ? "Starter…" : "Ta ruten på nytt :P"}
            </PrimaryButton>
          )}
          {readOnly &&
            (!confirmDelete ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-red-400 disabled:opacity-40"
              >
                <Trash2 className="size-4" aria-hidden />
                Slett kveld
              </button>
            ) : (
              <div className="space-y-2 rounded-lg border border-red-400/30 bg-red-400/5 p-3">
                <p className="text-pretty text-sm text-[var(--muted)]">
                  Sletter kvelden og alle bildene fra den. Dette kan ikke
                  angres.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDelete()}
                    className="flex-1 rounded-lg bg-red-500/90 px-3 py-2 text-sm text-white disabled:opacity-40"
                  >
                    {busy ? "Sletter…" : "Slett for godt"}
                  </button>
                </div>
              </div>
            ))}
          {actionError && (
            <p className="text-center text-sm text-red-400">{actionError}</p>
          )}
        </div>
      )}
    </>
  );
}
