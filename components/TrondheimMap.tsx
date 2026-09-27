"use client";

import { useEffect, useState } from "react";

/** Trondheim map hero — used above the route builder (with fade) or standalone. */
export function TrondheimMap({
  className = "",
  fadeIntoSurface = false,
}: {
  className?: string;
  fadeIntoSurface?: boolean;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/map-hero.svg")
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setSvg(text);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden bg-[#121212] ${
        fadeIntoSurface ? "rounded-t-xl" : "rounded-xl"
      } ${className}`}
      aria-hidden="true"
    >
      {svg ? (
        <div
          className="map-hero pointer-events-none select-none [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="aspect-[10/7] w-full bg-[#121212]" />
      )}
      {fadeIntoSurface && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-[var(--surface)]/40 to-[var(--surface)]"
          aria-hidden
        />
      )}
    </div>
  );
}
