"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { RecapView } from "@/components/RecapView";

/**
 * Lagret kveld som popup over profilen. Bruker native `<dialog>` (modal) for
 * fokusfelle, Escape, inert bakgrunn og fokus-retur. Kryss står i en sticky
 * topplinje så det alltid er innen rekkevidde når innholdet scroller.
 */
export function RecapDialog({
  instanceId,
  onClose,
}: {
  instanceId: Id<"routeInstances">;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label="Kveld"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="recap-dialog m-auto max-h-[min(78dvh,42rem)] w-[calc(100%-3rem)] max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[var(--surface)] p-0 text-[var(--text)] shadow-2xl backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-center border-b border-white/5 bg-[var(--surface)] px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          title="Lukk"
          className="flex size-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="px-4 pb-6 pt-3">
        <RecapView instanceId={instanceId} onDeleted={onClose} />
      </div>
    </dialog>
  );
}
