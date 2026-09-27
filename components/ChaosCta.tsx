"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ChaosCta() {
  return (
    <Link
      href="/routes/new"
      className="chaos-cta group relative block w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
    >
      <span className="chaos-cta__spin" aria-hidden />
      <span className="chaos-cta__core">
        <span className="chaos-cta__sheen" aria-hidden />
        <span className="relative z-[1] flex items-center justify-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-wide text-white">
          Klar for kaos
          <ArrowRight
            className="size-5 transition-transform duration-300 group-hover:translate-x-1.5 group-active:translate-x-2"
            strokeWidth={2.5}
          />
        </span>
      </span>
    </Link>
  );
}
