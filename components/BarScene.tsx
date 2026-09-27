"use client";

import { useEffect, useState } from "react";

/** Decorative bar scene — landing hero atmosphere. */
export function BarScene({ className = "" }: { className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/bar-scene.svg")
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
      className={`relative overflow-hidden rounded-xl bg-[#120B08] ${className}`}
      aria-hidden="true"
    >
      {svg ? (
        <div
          className="bar-scene-svg [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="aspect-[1000/600] w-full bg-[#120B08]" />
      )}
    </div>
  );
}
