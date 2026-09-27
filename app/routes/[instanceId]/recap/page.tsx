"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";

export default function RecapPage() {
  const params = useParams();
  const instanceId = params.instanceId as Id<"routeInstances">;
  const { guestToken, clearGuest } = useGuest();
  const { isAuthenticated } = useConvexAuth();
  const now = useMemo(() => Date.now(), []);
  const router = useRouter();
  const claim = useMutation(api.routes.claimGuest);
  const rename = useMutation(api.routes.rename);

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
    return (
      <AppShell>
        <p className="text-[var(--muted)]">Laster recap…</p>
      </AppShell>
    );
  }

  const photos = (logs ?? [])
    .map((l) => l.photoUrl)
    .filter((u): u is string => Boolean(u));

  const doneIds = new Set(
    (logs ?? []).flatMap((l) => l.completedChallengeIds),
  );
  const doneChallenges = (challenges ?? []).filter((c) => doneIds.has(c._id));

  async function persistName(): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Gi kvelden et navn");
      return false;
    }
    if (trimmed === instance.name) {
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

  async function onSave() {
    const ok = await persistName();
    if (!ok) return;
    if (!guestToken) {
      router.push("/sign-in");
      return;
    }
    if (!isAuthenticated) {
      router.push(`/sign-in?claim=1`);
      return;
    }
    await claim({ guestToken, now: Date.now() });
    clearGuest();
    router.push("/routes");
  }

  return (
    <AppShell>
      <p className="text-sm text-[var(--brand)]">Vi overlevde</p>
      <label className="mt-2 block">
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
      <p className="mt-2 text-sm text-[var(--muted)]">
        {instance.bars.length} stopp ·{" "}
        {doneChallenges.length} utfordringer huket av
        {savingName ? " · Lagrer…" : ""}
      </p>

      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          {photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="aspect-square rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-medium">Utfordringer du tok</h2>
        <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
          {doneChallenges.length === 0 && <li>Ingen huket av — æresystem.</li>}
          {doneChallenges.map((c) => (
            <li key={c._id}>• {c.text}</li>
          ))}
        </ul>
      </section>

      {!isAuthenticated ? (
        <div className="mt-8 space-y-3">
          <PrimaryButton onClick={() => void onSave()}>
            Lagre kvelden — opprett bruker
          </PrimaryButton>
          <p className="text-center text-xs text-[var(--muted)]">
            Uten lagring slettes dataen dagen etter.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {guestToken ? (
            <PrimaryButton onClick={() => void onSave()}>
              Lagre i mine kvelder
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={() =>
                void persistName().then((ok) => ok && router.push("/routes"))
              }
            >
              Ferdig
            </PrimaryButton>
          )}
          <Link
            href="/routes"
            className="block text-center text-sm text-[var(--muted)]"
          >
            Se mine kvelder
          </Link>
        </div>
      )}
    </AppShell>
  );
}
