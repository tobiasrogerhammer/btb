"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppShell, PrimaryButton } from "@/components/ui";

export default function MyRoutesPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const now = useMemo(() => Date.now(), []);
  const list = useQuery(api.routes.listMine, isAuthenticated ? { now } : "skip");
  const replay = useMutation(api.routes.replay);
  const router = useRouter();

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
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          Mine kvelder
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Logg inn for å se lagrede runder.
        </p>
        <Link href="/sign-in" className="mt-6 block">
          <PrimaryButton type="button">Logg inn</PrimaryButton>
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        Mine kvelder
      </h1>
      <ul className="mt-6 space-y-3">
        {(list ?? []).map((item) => (
          <li
            key={item._id}
            className="rounded-xl bg-[var(--surface)] p-4"
          >
            <Link href={`/routes/${item._id}`} className="block">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {item.status} · {item.stopCount} stopp · ~
                {Math.round(item.estimatedDistanceMeters / 1000)} km
              </p>
            </Link>
            {item.status === "completed" && (
              <button
                type="button"
                className="mt-3 text-sm text-[var(--brand)]"
                onClick={() => {
                  void (async () => {
                    const id = await replay({
                      instanceId: item._id as Id<"routeInstances">,
                      now: Date.now(),
                    });
                    router.push(`/routes/${id}`);
                  })();
                }}
              >
                Ta på nytt
              </button>
            )}
          </li>
        ))}
        {list?.length === 0 && (
          <li className="text-sm text-[var(--muted)]">
            Ingen kvelder ennå.{" "}
            <Link href="/routes/new" className="text-[var(--brand)]">
              Start kvelden
            </Link>
          </li>
        )}
      </ul>
    </AppShell>
  );
}
