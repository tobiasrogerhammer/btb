import type { Metadata } from "next";
import { AppShell, BackLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Ansvarsfraskrivelse — BTB",
};

export default function DisclaimerPage() {
  return (
    <AppShell>
      <BackLink href="/" label="Tilbake til forsiden" />
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        Ansvarsfraskrivelse
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Ved å bruke BTB («Bar til bar») aksepterer du vilkårene under.
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-[var(--muted)]">
        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            1. Alder og alkohol
          </h2>
          <p>
            Tjenesten er ment for personer som er <strong className="text-[var(--text)]">18 år eller eldre</strong>.
            Du er selv ansvarlig for at du har lovlig alder til å kjøpe og
            konsumere alkohol der du befinner deg.
          </p>
          <p>
            BTB oppfordrer til ansvarlig alkoholbruk. Vi er ikke ansvarlige for
            valg du tar ute — inkludert beruselse, transport, sikkerhet eller
            hvordan du oppfører deg overfor andre.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            2. Utfordringer og «Vi overlevde»
          </h2>
          <p>
            Utfordringer er frivillige forslag på ærlighetsbasis. Vi verifiserer
            ikke at noe er gjennomført. «Vi overlevde» og lignende statuser er
            spillmekanikk, ikke en faktisk vurdering.
          </p>
          <p>
            Du er selv ansvarlig for at det du gjør er lovlig, trygt og
            respektfullt overfor andre og stedene du besøker. Ikke utfør
            farlige, ulovlige, diskriminerende eller skadelige handlinger «fordi
            appen foreslo det».
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            3. Barer, åpningstider og estimat
          </h2>
          <p>
            Informasjon om barer (navn, adresse, åpningstider, prisnivå,
            koordinater) er kuratert etter beste evne og kan være feil, ufullstendig
            eller utdatert. Sjekk alltid med stedet selv før du går.
          </p>
          <p>
            Estimater for gangtid, avstand og tid på stopp er veiledende
            (forenklet beregning) og ikke en garanti for faktisk reisetid eller
            kapasitet på stedet.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            4. Gjesterunde og konto
          </h2>
          <p>
            Du kan fullføre en runde uten konto. Da lagres data midlertidig og
            slettes automatisk etter utløp (se personvernerklæringen). Permanent
            historikk krever innlogging. Vi er ikke ansvarlige for tap av
            gjestedata etter sletting eller utløp.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            5. Bilder og andres personvern
          </h2>
          <p>
            Hvis du laster opp bilder, er du ansvarlig for at du har rett til å
            dele dem — inkludert samtykke fra personer som er synlige. Ikke last
            opp ulovlig eller krenkende innhold.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">
            7. Tjenesten «som den er»
          </h2>
          <p>
            BTB leveres uten garanti om oppetid, nøyaktighet, fullstendighet
            eller egnethet for et bestemt formål. Funksjoner kan endres eller
            fjernes uten varsel, spesielt mens tjenesten er i tidlig fase (MVP).
          </p>
          <p>
            Så langt loven tillater, er utvikler/eier ikke erstatningsansvarlig
            for direkte eller indirekte tap, skade, ulykker eller hendelser som
            oppstår under bruk av tjenesten ute i byen, eller som følge av feil
            i innhold eller estimater.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[var(--text)]">8. Kontakt</h2>
          <p>
            Spørsmål om denne ansvarsfraskrivelsen kan sendes til
            prosjektets kontaktperson når den er oppgitt i appen. Inntil
            videre: bruk samme kanal som oppgis under personvern ved offentlig
            lansering.
          </p>
        </section>

        <p className="text-xs opacity-70">Sist oppdatert: 22. september 2026</p>
      </div>
    </AppShell>
  );
}
