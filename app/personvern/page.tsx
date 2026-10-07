import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, BackLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Personvernerklæring — BtB",
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <BackLink href="/" label="Tilbake til forsiden" />
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        Personvernerklæring
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Denne erklæringen gjelder BtB («Bar til bar») og beskriver hvilke
        personopplysninger vi behandler, hvorfor, og hvilke rettigheter du har.
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-[var(--muted)]">
        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            1. Behandlingsansvarlig
          </h2>
          <p>
            Behandlingsansvarlig er eier av BtB-prosjektet. Kontaktopplysninger
            (navn og e-post) oppgis i appen ved offentlig lansering. Inntil
            da gjelder denne erklæringen for tjenesten som kjøres i
            utviklings-/MVP-fase.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            2. Hva vi samler inn
          </h2>
          <p className="font-medium text-[var(--text)]">Med brukerkonto</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              E-post, navn og eventuelt profilbilde fra innlogging (f.eks.
              passord eller Google) — for konto, innlogging og eierskap til
              kvelder/ruter.
            </li>
            <li>
              Kvelder (ruter), stopp, tidsstempler og estimater — for historikk
              og replay.
            </li>
            <li>
              Utfordringer du huker av eller lager — for spillmekanikk og
              historikk.
            </li>
            <li>
              Bilder du laster opp på stopp — for recap og minne fra kvelden.
            </li>
            <li>
              Tekniske logger (feil, ytelse) — for drift og feilretting.
            </li>
          </ul>
          <p className="mt-3 font-medium text-[var(--text)]">
            Uten konto (gjesterunde)
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Midlertidig gjeste-ID (tilfeldig token lagret i nettleseren) —
              for å knytte runden din sammen.
            </li>
            <li>
              Samme type runde-data som over (stopp, utfordringer, bilder) —
              for å gjennomføre runden og vise recap.
            </li>
            <li>Utløpstidspunkt — for automatisk sletting.</li>
          </ul>
          <p>
            Vi ber ikke om navn eller e-post for å starte en gjesterunde.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            3. Formål og rettslig grunnlag
          </h2>
          <p>
            Vi behandler opplysninger for å levere tjenesten du ber om (runde,
            historikk, recap), for sikkerhet og misbruksforebygging, og for
            grov feilretting.
          </p>
          <p>
            Rettslig grunnlag er typisk avtale/forespurt tjeneste, og der det
            er relevant berettiget interesse. Ved offentlig lansering i EU/EØS
            skal behandlingen være forenlig med GDPR; kontaktpunktet over
            oppdateres da.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            4. Lagring og sletting
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--text)]">Gjestedata:</strong>{" "}
              slettes automatisk dagen etter at runden er fullført (eller senest
              omtrent 36 timer etter fullføring / siste relevante aktivitet).
              Bilder i fil-storage slettes sammen med runden.
            </li>
            <li>
              <strong className="text-[var(--text)]">Brukerkonto:</strong>{" "}
              beholdes til du sletter kontoen, eller til prosjektet avvikles.
            </li>
            <li>
              <strong className="text-[var(--text)]">Auth-sesjoner:</strong>{" "}
              etter reglene til innloggingsløsningen (Convex Auth).
            </li>
          </ul>
          <p>
            Velger du å opprette bruker for å lagre, overføres gjestedata til
            kontoen din før utløp; deretter gjelder kontoreglene.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            5. Deling med andre
          </h2>
          <p>Vi selger ikke personopplysninger.</p>
          <p>
            Data kan behandles av underleverandører som er nødvendige for
            driften, typisk:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--text)]">Convex</strong> —
              database, fil-storage og backend.
            </li>
            <li>
              <strong className="text-[var(--text)]">Vercel</strong> (eller
              tilsvarende) — hosting av webappen.
            </li>
            <li>
              Innloggingsleverandører via Convex Auth (f.eks. Google OAuth når
              det er aktivert).
            </li>
          </ul>
          <p>
            Disse behandler data etter egne avtaler / databehandleravtaler.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">6. Bilder</h2>
          <p>
            Bilder lastes opp frivillig. Du bør ikke laste opp bilder av andre
            uten samtykke. Gjeste-bilder slettes med gjesterunden; konto-bilder
            slettes ved kontosletting (eller når slettefunksjon er tilgjengelig
            i appen).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            7. Dine rettigheter
          </h2>
          <p>
            Du kan be om innsyn, retting, sletting og begrensning, og klage til{" "}
            <a
              href="https://www.datatilsynet.no/"
              className="text-[var(--text)] underline underline-offset-2 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              Datatilsynet
            </a>
            .
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--text)]">Gjester:</strong> data
              forsvinner automatisk ved utløp.
            </li>
            <li>
              <strong className="text-[var(--text)]">Konto:</strong> slett
              konto i innstillinger når funksjonen er tilgjengelig (senest ved
              offentlig launch), eller kontakt oss.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            8. Informasjonskapsler og lokal lagring
          </h2>
          <p>
            Vi bruker lokal lagring i nettleseren for gjeste-token og
            innlogging. Vi bruker Google Analytics for bruksstatistikk
            (sidevisninger); dette kan sette cookies via Google. Se{" "}
            <a
              href="https://policies.google.com/privacy"
              className="text-[var(--text)] underline underline-offset-2 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              Googles personvern
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">9. Endringer</h2>
          <p>
            Vi kan oppdatere denne erklæringen. Vesentlige endringer varsles i
            appen eller på nettsiden. Dato nederst oppdateres.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">10. Mer om ansvar</h2>
          <p>
            For bruksvilkår og ansvarsbegrensning, se{" "}
            <Link
              href="/ansvar"
              className="text-[var(--text)] underline underline-offset-2 hover:text-white"
            >
              ansvarsfraskrivelsen
            </Link>
            .
          </p>
        </section>

        <p className="text-xs opacity-70">Sist oppdatert: 22. september 2026</p>
      </div>
    </AppShell>
  );
}
