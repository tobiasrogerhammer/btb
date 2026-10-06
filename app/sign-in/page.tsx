"use client";

import { Suspense, FormEvent, useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";

function SignInForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const claim = search.get("claim") === "1";
  const { guestToken, clearGuest } = useGuest();
  const claimGuest = useMutation(api.routes.claimGuest);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (claim && guestToken) return;
    if (claim) return;
    router.replace("/me");
  }, [isAuthenticated, isLoading, claim, guestToken, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !claim || !guestToken) return;
    let cancelled = false;
    void (async () => {
      try {
        await claimGuest({ guestToken, now: Date.now() });
        if (cancelled) return;
        clearGuest();
        router.replace("/me");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Kunne ikke lagre gjestedata",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isLoading,
    claim,
    guestToken,
    claimGuest,
    clearGuest,
    router,
  ]);

  async function afterAuth() {
    if (claim && guestToken) {
      await claimGuest({ guestToken, now: Date.now() });
      clearGuest();
      router.push("/me");
      return;
    }
    router.push("/me");
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signIn("google", {
        redirectTo: claim ? "/sign-in?claim=1" : "/me",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google-innlogging feilet");
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
      await afterAuth();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Innlogging feilet";
      if (/already exists/i.test(raw)) {
        setFlow("signIn");
        setError(
          "Kontoen finnes allerede — logg inn i stedet (eller bruk Google hvis du opprettet den der).",
        );
      } else if (/InvalidAccountId|InvalidSecret|invalid/i.test(raw)) {
        setError("Feil e-post eller passord.");
      } else {
        setError(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  if (isAuthenticated && claim) {
    return (
      <>
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          Lagrer kvelden…
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Knytter kveldens runde til kontoen din.
        </p>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </>
    );
  }

  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-2xl">
        {flow === "signIn" ? "Logg inn" : "Opprett bruker"}
      </h1>
      {claim && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Etterpå lagres kvelden på kontoen din.
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => void onGoogle()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm font-medium text-[#121212] disabled:opacity-40"
      >
        Fortsett med Google
      </button>

      <p className="my-4 text-center text-xs text-[var(--muted)]">eller</p>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        {flow === "signUp" && (
          <input
            name="name"
            placeholder="Navn"
            className="w-full rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2"
          />
        )}
        <input
          name="email"
          type="email"
          required
          placeholder="E-post"
          className="w-full rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Passord"
          className="w-full rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <PrimaryButton type="submit" disabled={busy}>
          {busy
            ? "…"
            : flow === "signIn"
              ? "Logg inn"
              : "Opprett bruker"}
        </PrimaryButton>
      </form>
      <button
        type="button"
        className="mt-4 text-sm text-[var(--muted)]"
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
      >
        {flow === "signIn" ? "Ny her? Opprett bruker" : "Har konto? Logg inn"}
      </button>
    </>
  );
}

export default function SignInPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-[var(--muted)]">Laster…</p>}>
        <SignInForm />
      </Suspense>
    </AppShell>
  );
}
