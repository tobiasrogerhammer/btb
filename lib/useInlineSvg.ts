"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Henter SVG og monterer via DOMParser + importNode (Safari-vennlig).
 * Host-refen skal ikke ha React-children — bare tom container.
 */
export function useInlineSvg(src: string): {
  hostRef: RefObject<HTMLDivElement | null>;
  ready: boolean;
} {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    setReady(false);

    void fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`Kunne ikke hente ${src}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled || !hostRef.current) return;
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        if (doc.querySelector("parsererror")) {
          throw new Error(`Ugyldig SVG: ${src}`);
        }
        const svg = document.importNode(
          doc.documentElement,
          true,
        ) as unknown as SVGElement;
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "auto");
        svg.removeAttribute("xmlns:xlink");
        hostRef.current.replaceChildren(svg);
        setReady(true);
      })
      .catch(() => {
        setReady(false);
      });

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [src]);

  return { hostRef, ready };
}
