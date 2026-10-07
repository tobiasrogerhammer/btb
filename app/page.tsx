import { AppShell, BrandMark } from "@/components/ui";
import { BarScene } from "@/components/BarScene";
import { ChaosCta } from "@/components/ChaosCta";

export default function HomePage() {
  return (
    <AppShell>
      <section className="flex flex-col rounded-2xl bg-[radial-gradient(ellipse_at_top,_#2a1810_0%,_#121212_55%)] px-5 pb-10 pt-12">
        <BrandMark size={56} />
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
          Bar til bar
        </h1>
        <p className="mt-3 max-w-[28ch] text-[var(--muted)]">
          Legger opp din rute for kvelden, finn ditt neste stopp her
        </p>

        <div className="mx-auto my-6 w-full max-w-[420px]">
          <BarScene />
        </div>

        <div className="space-y-3">
          <ChaosCta />
          <p className="text-center text-xs text-[var(--muted)]">
            Ingen konto nødvendig.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
