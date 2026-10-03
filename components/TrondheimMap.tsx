"use client";

import { useInlineSvg } from "@/lib/useInlineSvg";

/** Trondheim map hero — used above the route builder (with fade) or standalone. */
export function TrondheimMap({
  className = "",
  fadeIntoSurface = false,
}: {
  className?: string;
  fadeIntoSurface?: boolean;
}) {
  const { hostRef, ready } = useInlineSvg("/map-hero.svg");

  return (
    <div
      className={`relative overflow-hidden bg-[#121212] ${
        fadeIntoSurface ? "rounded-t-xl" : "rounded-xl"
      } ${className}`}
      aria-hidden="true"
    >
      <div className="map-hero pointer-events-none select-none aspect-[10/7] w-full bg-[#121212] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full [&_img]:block [&_img]:h-auto [&_img]:w-full">
        <div ref={hostRef} className={ready ? "contents" : "hidden"} />
        {!ready && (
          <img src="/map-hero.svg" alt="" width={1000} height={700} />
        )}
      </div>
      {fadeIntoSurface && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-[var(--bg)]/40 to-[var(--bg)]"
          aria-hidden
        />
      )}
    </div>
  );
}
