"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell, PrimaryButton } from "@/components/ui";

function statusLabel(status: "planned" | "active" | "completed") {
  if (status === "completed") return "fullført";
  if (status === "active") return "aktiv";
  return "planlagt";
}

function formatNightDate(ms: number | undefined) {
  if (ms == null) return null;
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Oslo",
  }).format(new Date(ms));
}

export default function MePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const now = useMemo(() => Date.now(), []);
  const profile = useQuery(
    api.users.getProfile,
    isAuthenticated ? { now } : "skip",
  );
  const replay = useMutation(api.routes.replay);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-[var(--muted)]">Laster…</p>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppShell>
        <h1 className="text-balance font-[family-name:var(--font-display)] text-2xl">
          Min profil
        </h1>
        <p className="mt-2 text-pretty text-sm text-[var(--muted)]">
          Logg inn for å se profilen og dine kvelder.
        </p>
        <Link href="/sign-in" className="mt-6 block">
          <PrimaryButton type="button">Logg inn</PrimaryButton>
        </Link>
      </AppShell>
    );
  }

  if (profile === undefined) {
    return (
      <AppShell>
        <p className="text-[var(--muted)]">Laster profil…</p>
      </AppShell>
    );
  }

  if (profile === null) {
    return (
      <AppShell>
        <p className="text-[var(--muted)]">Fant ikke profil.</p>
      </AppShell>
    );
  }

  const displayName = profile.name?.trim() || "BtB-bruker";
  const initial = displayName.slice(0, 1).toUpperCase();
  const { completedNights, stopCount, distanceKm } = profile.stats;

  async function onSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke logge ut");
      setBusy(false);
    }
  }

  async function onDeleteAccount() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount({});
      await signOut();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke slette konto");
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <AppShell>
      <section className="flex items-center gap-4">
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.image}
            alt=""
            className="size-14 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--surface)] font-[family-name:var(--font-display)] text-xl text-[var(--brand)]"
          >
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-balance font-[family-name:var(--font-display)] text-2xl">
            {displayName}
          </h1>
          <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">
            {completedNights} kvelder · {stopCount} stopp · {distanceKm} km
          </p>
        </div>
      </section>

      <section className="mt-8" id="kvelder">
        <h2 className="text-sm font-medium text-[var(--muted)]">Mine kvelder</h2>
        <ul className="mt-3 divide-y divide-white/10">
          {profile.nights.length === 0 && (
            <li className="py-4 text-sm text-[var(--muted)]">
              Ingen kvelder ennå.{" "}
              <Link href="/routes/new" className="text-[var(--brand)]">
                Start kvelden
              </Link>
            </li>
          )}
          {profile.nights.map((night) => {
            const href =
              night.status === "completed"
                ? `/routes/${night._id}/recap`
                : `/routes/${night._id}`;
            const when = formatNightDate(
              night.completedAt ?? night.startedAt ?? undefined,
            );
            return (
              <li key={night._id} className="py-3">
                <Link href={href} className="flex items-center gap-3">
                  {night.photoThumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={night.photoThumbUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-xs text-[var(--muted)]">
                      {night.stopCount}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {night.name}
                    </span>
                    <span className="block text-xs text-[var(--muted)]">
                      {statusLabel(night.status)}
                      {when ? ` · ${when}` : ""} · {night.stopCount} stopp · ~
                      {Math.round(night.estimatedDistanceMeters / 1000)} km
                    </span>
                  </span>
                </Link>
                {night.status === "completed" && (
                  <button
                    type="button"
                    disabled={busy}
                    className="mt-2 text-sm text-[var(--brand)] disabled:opacity-40"
                    onClick={() => {
                      void (async () => {
                        setBusy(true);
                        try {
                          const id = await replay({
                            instanceId: night._id as Id<"routeInstances">,
                            now: Date.now(),
                          });
                          router.push(`/routes/${id}`);
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Kunne ikke starte på nytt",
                          );
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    Ta på nytt
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 space-y-3 border-t border-white/10 pt-6">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSignOut()}
          className="w-full rounded-lg border border-white/15 px-4 py-3 text-sm disabled:opacity-40"
        >
          Logg ut
        </button>
        {!confirmDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="w-full text-sm text-red-400 disabled:opacity-40"
          >
            Slett konto
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-red-400/30 bg-red-400/5 p-3">
            <p className="text-pretty text-sm text-[var(--muted)]">
              Sletter kvelder, bilder og kontoen din. Dette kan ikke angres.
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
                onClick={() => void onDeleteAccount()}
                className="flex-1 rounded-lg bg-red-500/90 px-3 py-2 text-sm text-white disabled:opacity-40"
              >
                {busy ? "Sletter…" : "Slett for godt"}
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
