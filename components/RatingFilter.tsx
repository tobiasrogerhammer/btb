"use client";

import { useState } from "react";

export type RatingThreshold = 0 | 3.5 | 4 | 4.5;

const OPTIONS: { value: RatingThreshold; label: string }[] = [
  { value: 0, label: "Alle" },
  { value: 3.5, label: "3.5+" },
  { value: 4, label: "4+" },
  { value: 4.5, label: "4.5+" },
];

type RatingFilterProps = {
  value?: RatingThreshold;
  defaultValue?: RatingThreshold;
  onChange?: (threshold: RatingThreshold) => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * Segmented rating filter: Alle | 3.5+ | 4+ | 4.5+
 * Sliding brand highlight via translateX (not left/width).
 */
export function RatingFilter({
  value: controlledValue,
  defaultValue = 0,
  onChange,
  className = "",
  "aria-label": ariaLabel = "Filtrer på rating",
}: RatingFilterProps) {
  const [uncontrolled, setUncontrolled] =
    useState<RatingThreshold>(defaultValue);
  const value = controlledValue ?? uncontrolled;
  const index = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === value),
  );

  function select(next: RatingThreshold) {
    if (controlledValue === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`relative flex h-9 w-full overflow-hidden rounded-lg border-[0.5px] border-white/20 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/4 rounded-lg bg-[#CC3F0C] transition-transform duration-[250ms] ease"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map((opt) => {
        const pressed = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => select(opt.value)}
            className={`relative z-10 flex-1 bg-transparent text-center text-[13px] leading-9 transition-colors duration-200 ${
              pressed ? "text-white" : "text-[var(--muted)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Map UI threshold to filter value used by suggest/katalog (null = no filter). */
export function thresholdToMinRating(
  threshold: RatingThreshold,
): number | null {
  return threshold === 0 ? null : threshold;
}

export function minRatingToThreshold(
  minRating: number | null,
): RatingThreshold {
  if (minRating == null) return 0;
  if (minRating >= 4.5) return 4.5;
  if (minRating >= 4) return 4;
  if (minRating >= 3.5) return 3.5;
  return 0;
}
