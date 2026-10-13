import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Martini, Route } from "lucide-react";
import { ReactNode } from "react";
import { AccountNavLink } from "@/components/AccountNavLink";

/** Wordmark asset: 1800×313 (hvit + oransje o). */
const WORDMARK_ASPECT = 1800 / 313;
/** Merke asset: 1024×925 (n-bue + o). */
const MERKE_ASPECT = 1024 / 925;

export function BrandMark({
  size = 28,
  withWordmark = true,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  if (!withWordmark) {
    const height = size;
    const width = Math.round(height * MERKE_ASPECT);
    return (
      <Image
        src="/logo.png"
        alt="nextround"
        width={width}
        height={height}
        className="shrink-0"
        priority
      />
    );
  }

  const wordmarkHeight = Math.max(16, Math.round(size * 0.72));
  const wordmarkWidth = Math.round(wordmarkHeight * WORDMARK_ASPECT);

  return (
    <Image
      src="/nextround-logo-white.png"
      alt="nextround"
      width={wordmarkWidth}
      height={wordmarkHeight}
      className="shrink-0"
      priority
    />
  );
}

export function BackLink({
  href = "/",
  label = "Tilbake",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] transition hover:border-[var(--brand)]/50 hover:text-white"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--text)]">
      {!hideNav && (
        <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-4">
          <Link href="/" aria-label="nextround — hjem">
            <BrandMark size={28} />
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/routes/new"
              aria-label="Min rute"
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/25 text-white transition hover:border-white/40 hover:bg-white/5"
            >
              <Route className="size-4" aria-hidden />
            </Link>
            <Link
              href="/bars"
              aria-label="Utesteder"
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/25 text-white transition hover:border-white/40 hover:bg-white/5"
            >
              <Martini className="size-4" aria-hidden />
            </Link>
            <AccountNavLink />
          </nav>
        </header>
      )}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10">
        {children}
      </main>
      {!hideNav && (
        <footer className="mx-auto mt-auto w-full max-w-md border-t border-white/5 px-4 py-6 text-xs text-[var(--muted)]">
          <div className="flex gap-5">
            <Link href="/ansvar" className="hover:text-[var(--text)]">
              Ansvar
            </Link>
            <Link href="/personvern" className="hover:text-[var(--text)]">
              Personvern
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-lg bg-[var(--brand)] px-4 py-3 text-center text-base font-medium text-white disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
