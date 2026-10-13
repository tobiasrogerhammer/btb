"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useConvexAuth } from "convex/react";

export function AccountNavLink() {
  const { isAuthenticated } = useConvexAuth();
  const href = isAuthenticated ? "/me" : "/sign-in";

  return (
    <Link
      href={href}
      aria-label="Konto"
      className="inline-flex size-9 items-center justify-center rounded-full border border-white/25 text-white transition hover:border-white/40 hover:bg-white/5"
    >
      <User className="size-4" aria-hidden />
    </Link>
  );
}
