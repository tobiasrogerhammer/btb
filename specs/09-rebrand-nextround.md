# 09 — Rebrand: BtB → NextRound (utfyllingsskjema)

Fyll inn **Ny verdi** i tabellene under. Tom celle = «behold som i dag» eller «ikke bestemt ennå».

Når skjemaet er ferdig: si ifra, så oppdateres specs + kode ut fra dette dokumentet.

---

## 1. Merkenavn


| Felt                             | Hva det er                                         | Nå                            | Ny verdi  |
| -------------------------------- | -------------------------------------------------- | ----------------------------- | --------- |
| Kort merkenavn                   | Navnet brukeren ser i nav, fanetittel, «BtB»       | `BtB`                         | nextround |
| Langt merkenavn                  | Forklaring / undertittel (tidligere «Bar-til-bar») | `Bar-til-bar` / `Bar til bar` | nextround |
| Hvordan skrives det i setninger? | F.eks. «Ved å bruke NextRound…»                    | `BtB`                         | nextround |
| Fallback når bruker mangler navn | Tekst i profil                                     | `BtB-bruker`                  | nextround |


Eksempel på utfylt rad: Ny verdi = `NextRound`

---



## 2. Landing / hero


| Felt                            | Hva det er         | Nå                                                           | Ny verdi                                                     |
| ------------------------------- | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Stor overskrift på forsiden     | H1 under CTA       | `Bar til bar`                                                | Bar til bar                                                  |
| Støtte-setning under overskrift | Kort beskrivelse   | `Legger opp din rute for kvelden, finn ditt neste stopp her` | `Legger opp din rute for kvelden, finn ditt neste stopp her` |
| Primærknapp (CTA)               | Stor oransje knapp | `Klar for kaos`                                              | `Klar for kaos`                                              |
| Tekst under CTA                 |                    | `Ingen konto nødvendig.`                                     | `Ingen konto nødvendig.`                                     |


---



## 3. Domeneord i appen (kan beholdes)


| Felt               | Hva det er                   | Nå                                | Ny verdi (eller «behold»)         |
| ------------------ | ---------------------------- | --------------------------------- | --------------------------------- |
| Starte runde       |                              | `Klar for kaos` / `Start kvelden` | `Klar for kaos` / `Start kvelden` |
| Fullføre runde     | Knapp nederst på siste stopp | `Vi overlevde`                    | `Vi overlevde`                    |
| Historikk          |                              | `Mine kvelder`                    | `Mine kvelder`                    |
| Oppgaver per stopp |                              | `Utfordringer`                    | `Utfordringer`                    |
| Profil             |                              | `Min profil`                      | `Min profil`                      |


---



## 4. Nettadresse og SEO (fanetittel / deling)


| Felt                      | Hva det er                      | Nå                                                             | Ny verdi                                                       |
| ------------------------- | ------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| Offentlig nettadresse     | Domene appen kjører på          | `https://btb.tobiashammer.dev`                                 | skal bli nextround.no                                          |
| Fanetittel                | `<title>` i nettleseren         | `BtB — Bar til bar`                                            | `NextRound - Bar til bar` (fanetittel + Google; øvrig UI lowercase) |
| Kort beskrivelse          | Meta description + delingstekst | `Legger opp din rute for kvelden — finn ditt neste stopp her.` | `Legger opp din rute for kvelden — finn ditt neste stopp her.` |
| Navn i delingskort        | Open Graph `siteName`           | `BtB`                                                          | nextround                                                      |
| Alt-tekst på delingsbilde |                                 | `BtB — Bar til bar`                                            | `NextRound - Bar til bar`                                      |


---



## 5. Visuell merkevare


| Felt              | Hva det er             | Nå                                    | Ny verdi / beslutning |
| ----------------- | ---------------------- | ------------------------------------- | --------------------- |
| Logo-fil          | Ikon i nav og favicon  | `public/logo.png` (oransje bue+prikk) | Behold                |
| Delingsbilde (OG) | Bilde når lenken deles | `public/og-image.png`                 | ny fil                |
| Brand-farge       | CSS `--brand`          | `#CC3F0C`                             |                       |
| Bakgrunnsfarge    | CSS `--bg`             | `#121212`                             |                       |


---



## 6. Juridisk / personvern (må matche merkenavn)


| Felt                         | Hva det er | Nå                       | Ny verdi                       |
| ---------------------------- | ---------- | ------------------------ | ------------------------------ |
| Navn i ansvarsfraskrivelse   |            | `BtB («Bar til bar»)`    | nextround                      |
| Navn i personvernerklæring   |            | `BtB («Bar til bar»)`    | nextround                      |
| Behandlingsansvarlig (tekst) |            | `eier av BtB-prosjektet` | `eier av nextround-prosjektet` |


---



## 7. Tekniske nøkler (lokal lagring / pakke)


| Felt                       | Hva det er                                                                     | Nå                | Ny verdi                |
| -------------------------- | ------------------------------------------------------------------------------ | ----------------- | ----------------------- |
| Gjeste-token i nettleseren | localStorage-nøkkel (gammelt = gamle gjester mister session hvis ikke migrert) | `BtB_guest_token` | `nextround_guest_token` |
| Migrer gammel nøkkel?      | Les gammel → skriv ny                                                          | Nei               | du velger               |
| npm-pakkenavn              | `package.json` name                                                            | `BtB`             | nextround               |


---



## 8. Infrastruktur (utenfor git — huskeliste)

Kryss av / fyll inn når gjort:


| #   | Oppgave                                                     | Din note / ny verdi |
| --- | ----------------------------------------------------------- | ------------------- |
| 1   | DNS: pek nytt domene til Vercel                             |                     |
| 2   | Vercel: custom domain                                       |                     |
| 3   | Google OAuth: app-navn + authorized origins / redirect URIs |                     |
| 4   | Convex: evt. nytt prosjektnavn (valgfritt)                  |                     |
| 5   | GitHub: evt. rename repo `bar-til-bar` (valgfritt)          |                     |
| 6   | Google Analytics: label / property                          |                     |
| 7   | Facebook Sharing Debugger: scrape ny URL                    |                     |


---



## 9. Valgfritt / ikke nødvendig


| Felt                                  | Anbefaling                          |
| ------------------------------------- | ----------------------------------- |
| Convex tabeller (`routeInstances`, …) | Behold engelsk — ikke rename        |
| Git-mappe lokalt                      | Kan hete `bar-til-bar` fortsatt     |
| Catch phrase (engelsk)                | Nå: *Your next bar is one tap away* |


---



## 10. Din sign-off

Når alt over er fylt ut (eller merket «behold»):

- [x] Specs er source of truth for nextround
- [x] Kode + specs oppdatert ut fra dette dokumentet (2026-10-13)

**Gjenstår utenfor repo:**
- Nytt `public/og-image.png` (skjema sa «ny fil» — ikke levert ennå)
- Domene `nextround.no` (DNS + Vercel) — `metadataBase` peker allerede dit
- OAuth / Analytics / cache (se seksjon 8)

**Dato fylt ut:** 2026-10-13  
**Utfylt av:** Tobias (+ agent)