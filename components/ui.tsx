import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Martini, Route, User } from "lucide-react";
import { ReactNode } from "react";

export function BrandMark({
  size = 28,
  withWordmark = true,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={Math.round(size * (150 / 169))}
        className="shrink-0"
        priority
      />
      {withWordmark && (
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          BTB
        </span>
      )}
    </span>
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
          <Link href="/" aria-label="BTB — hjem">
            <BrandMark size={28} />
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/routes/new"
              aria-label="Min rute"
              className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--brand)] text-white transition hover:bg-[var(--brand)]/10"
            >
              <Route className="size-4" aria-hidden />
            </Link>
            <Link
              href="/bars"
              aria-label="Utesteder"
              className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--brand)] text-white transition hover:bg-[var(--brand)]/10"
            >
              <Martini className="size-4" aria-hidden />
            </Link>
            <Link
              href="/sign-in"
              aria-label="Konto"
              className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--brand)] text-white transition hover:bg-[var(--brand)]/10"
            >
              <User className="size-4" aria-hidden />
            </Link>
          </nav>
        </header>
      )}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10">{children}</main>
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
