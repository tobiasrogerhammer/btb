# 01 — Produkt

## Navn

**BtB** — kort for **Bar-til-bar**.

Pub crawl-app med ruteforslag og utfordringer per stopp.

Catch phrase (engelsk, valgfri i UI): *Your next bar is one tap away*.

## Problem

Studenter vil ha en sosial kveld mellom flere barer, men:

- Planlegging tar tid (hvilke barer, rekkefølge, avstand, pris, åpningstider).
- Turen kan bli «bare drikke» uten struktur eller felles mål.
- Det finnes få lette verktøy som kombinerer rute + gamification uten tung setup.
- Vanskelig å velge hvor man skal dra ut.

## Verdiforslag

Appen foreslår (eller lar deg bygge) en runde mellom barer, og gjør turen mer sosial og morsom med innebygde og egne øvinger. Du slipper å planlegge kvelden selv.

**Kjerneverdi:** mindre friksjon før start + mer struktur og moro underveis.

Lav terskel: **du kan starte kvelden uten å opprette bruker**. Vil du beholde historikk, lager du konto.

## Målgruppe

- Primært: studenter i Trondheim, **ca. 20–25 år** (startmarked).
- Situasjon: kveld/helg, 2–8 personer (solo først i MVP; gruppe senere).
- Behov: rask start på mobil, ærlig og uformell tone, lav terskel.
- Inkluderende: humor og tone skal treffe både jenter og gutter — uten at vitsene *handler om* kjønn.
- **18+** — se [07-disclaimer.md](07-disclaimer.md).

## Tone og humor

Produktet skal føles som venner på byen, ikke som en bedriftsapp eller en «edgy» meme-side.

**UI-domeneord:**

| Domene | UI-språk |
|--------|----------|
| Starte en runde | **Klar for kaos** / **Start kvelden** |
| Historikk | **Mine kvelder** (på Min profil i fase 1.5.1) |
| Konto | **Min profil** |
| Oppgaver per stopp | **Utfordringer** |
| Fullføre runden | **Vi overlevde** (parallell til «Klar for kaos») |
| Aktiv runde | Pågående runde / kveld |

Unngå school-/eksamen-metafor i UI. Tone: kveld ute, by, lett kaos.

**Humor-mix (MVP-innhold og microcopy):**

1. **Kveld-/by-humor** — kø, «en til», feil dør, budsjett vs. smak, gruppedynamikk.
2. **Absurd / tørr** — korte, rare utfordringer som ikke krever inside jokes fra ett miljø.
3. **Ikke** — sexistisk, ekskluderende, «bare guttefest»-, eller kun-NTNU-inside-humor som stenger ute andre. Ikke school-/øving-tema.

**Test:** En 22-åring (uavhengig kjønn) skal kunne lese en utfordring og smile eller rulle øyne — ikke føle seg utenfor.

## Produktprinsipper

1. **Ærlighet fremfor kontroll** — utfordringer verifiseres ikke. Huk av og ta bilde på tillit.
2. **Mobil-først** — primær bruk er ute på byen.
3. **Lite friksjon** — fra idé til aktiv runde på få trykk; **konto er valgfritt** til du vil lagre.
4. **Kuratert kvalitet + egne stopp** — start med manuelt verifiserte barer, men brukeren skal alltid kunne legge til egne stopp (sted som mangler i katalogen).
5. **Bygg for senere, ship solo først** — tidsstempler og `mode` på instanser fra dag én; gruppe/konkurranse utsettes funksjonelt.
6. **Én klar jobb per skjerm** — unngå dashboard-følelse under en aktiv runde.
7. **Humor med bred appell** — kveld/by-humor; inkluderende for 20–25-åringer uavhengig kjønn.
8. **Gjestedata er midlertidig** — uten konto slettes runden automatisk dagen etter; lagring krever bruker.

## Sosiale modus (produktvisjon)

| Modus | Beskrivelse | Status |
|-------|-------------|--------|
| **Solo** | Følger egen rute-instans. Gjest eller innlogget. | MVP |
| **Felles gruppe** | Flere koblet til samme instans; delt fremgang i sanntid. | Senere |
| **Konkurranse** | Grupper/personer konkurrerer. Poengmodell TBD. | Senere |

## Geografi

MVP: **Trondheim**, lite kuratert sett barer (manuelt verifisert).

## Suksess for MVP

1. Starte kvelden **uten konto** (gjeste-flyt).
2. Se kuraterte barer; legge til egne stopp.
3. Bygge eller få foreslått en rute; **endre rekkefølge / fjerne stopp**; se estimert tid/avstand.
4. Per stopp: sjekke inn, huke utfordringer, laste bilde.
5. **Vi overlevde** → recap (collage + gjennomførte utfordringer).
6. CTA: opprett bruker for å **lagre** kvelden; ellers slettes data dagen etter.
7. Innlogget: **Mine kvelder** + ta samme rute på nytt.
8. (Fase 1.5.1) **Min profil** — se hvem du er + egne overlevde kvelder på én skjerm.

## Ansvar og personvern

- Ansvarsfraskrivelse: [07-disclaimer.md](07-disclaimer.md) (vises ved første bruk / i footer).
- Personvernerklæring: [08-privacy.md](08-privacy.md).

## Ikke-mål (produkt)

- Native iOS/Android-app i første omgang.
- App Store-validering før web-MVP er testet.
- Automatisk scraping av bar-data i MVP.
- Verifikasjon av utfordringer (GPS-geofence, kvittering, o.l.).
- Permanent lagring uten konto.
