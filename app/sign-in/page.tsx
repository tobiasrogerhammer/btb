"use client";

import { Suspense, FormEvent, useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { AppShell, PrimaryButton } from "@/components/ui";
import { useGuest } from "@/components/GuestProvider";

const fieldClassName =
  "w-full rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--brand)]/60 focus:outline-none";

/** Offisiell Google «G» (fire farger) — gjenkjennelig innloggingsmerke. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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

  if (isLoading) {
    return <p className="text-center text-sm text-[var(--muted)]">Laster…</p>;
  }

  if (isAuthenticated && claim) {
    return (
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--brand)]">Nesten der</p>
        <h1 className="mt-2 text-balance font-[family-name:var(--font-display)] text-3xl text-[var(--text)]">
          Lagrer kvelden…
        </h1>
        <p className="mt-3 text-pretty text-sm text-[var(--muted)]">
          Knytter kveldens runde til kontoen din.
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const isSignIn = flow === "signIn";

  return (
    <div>
      <header className="text-center">
        {claim && (
          <p className="text-sm font-medium text-[var(--brand)]">
            Lagre kvelden
          </p>
        )}
        <h1
          className={`text-balance font-[family-name:var(--font-display)] text-3xl text-[var(--text)] ${
            claim ? "mt-2" : ""
          }`}
        >
          {isSignIn ? "Logg inn" : "Opprett bruker"}
        </h1>
        <p className="mx-auto mt-3 max-w-[22rem] text-pretty text-sm leading-relaxed text-[var(--muted)]">
          {claim
            ? "Etterpå ligger kvelden trygg på kontoen din — klar til å tas på nytt."
            : isSignIn
              ? "Se kveldene dine, prøv nye ruter, og plukk opp der kaoset stoppet sist."
              : "Lag konto, lagre minnene, og vær klar til neste runde i byen."}
        </p>
      </header>

      <button
        type="button"
        disabled={busy}
        onClick={() => void onGoogle()}
        aria-label="Logg inn med Google"
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 py-3.5 text-base font-medium text-[#1f1f1f] shadow-sm transition hover:bg-[#f8f9fa] hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-40"
      >
        <GoogleMark className="size-5 shrink-0" />
        {busy ? "Åpner Google…" : "Logg inn med Google"}
      </button>

      <div className="my-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-[var(--muted)]">eller med e-post</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        {!isSignIn && (
          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--muted)]">
              Navn
            </span>
            <input
              name="name"
              autoComplete="name"
              placeholder="Ditt navn"
              className={fieldClassName}
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs text-[var(--muted)]">
            E-post
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="navn@epost.no"
            className={fieldClassName}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-[var(--muted)]">
            Passord
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            placeholder={isSignIn ? "Passordet ditt" : "Minst 8 tegn"}
            className={fieldClassName}
          />
        </label>

        {error && (
          <p className="text-pretty text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" disabled={busy} className="mt-1">
          {busy
            ? "Vent litt…"
            : isSignIn
              ? "Logg inn med e-post"
              : "Opprett bruker"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center">
        <button
          type="button"
          className="text-sm text-[var(--muted)] underline underline-offset-2 transition hover:text-[var(--text)]"
          onClick={() => {
            setError(null);
            setFlow(isSignIn ? "signUp" : "signIn");
          }}
        >
          {isSignIn ? "Ny her? Opprett bruker" : "Har konto? Logg inn"}
        </button>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <p className="py-20 text-center text-[var(--muted)]">Laster…</p>
        }
      >
        <div className="relative flex min-h-[min(36rem,calc(100dvh-11rem))] flex-col justify-center py-8">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[42%] -z-10 size-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand)]/[0.12] blur-2xl"
          />
          <SignInForm />
        </div>
      </Suspense>
    </AppShell>
  );
}
