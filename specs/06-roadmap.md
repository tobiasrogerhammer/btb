# 06 — Roadmap

Utvikling skjer i faser. **Ikke start neste fase før fase-mål er møtt**, med mindre spec eksplisitt endres.

## Fase 0 — Blueprint

- [x] Produktkonsept dokumentert
- [x] Tech-valg låst (Next.js + Convex)
- [x] Datamodell skissert
- [x] MVP-features og flyter
- [x] Designretning
- [x] Cursor/agent-regel som peker til specs

**Exit:** Specs er godkjent som arbeidsgrunnlag. ✅ (2026-09-22)

## Fase 1 — MVP solo

**Kode klar** — koble Convex lokalt via [SETUP.md](../SETUP.md).

1. [x] Scaffold: Next.js + Tailwind + Convex + Convex Auth
2. [x] Schema iht. [03-data-model.md](03-data-model.md)
3. [x] Seed-mutasjon (`seed:seedDatabase`)
4. [x] API: guestSessions, bars, challenges, routes, stopLogs, claim, guest-cleanup cron
5. [x] `suggestRoute` + ruteestimat
6. [x] UI: landing, gjesteflyt, builder, aktiv runde, recap, auth
7. [x] Rute-options: maks ølpris, min. rating, tidsvindu (filter suggest + katalog)
8. [x] Smoke-test utsatt — fase lukket uten at alle punkter i [04-features.md](04-features.md) er huket av

**Exit:** Solo-MVP er i bruk som grunnlag. ✅ (2026-09-29). Akseptansekriterier i features-spec er restgjeld, ikke blocker for 1.5.

## Fase 1.5 — Åpningstider, deretter stopptid (nå)

To spor. **Nå:** korrekte åpningstider per ukedag. **Senere i samme fase:** ønsket minutter per stopp, `moveOnAt`, in-app «gå videre». Push venter til fase 4.

### Spor A — Åpningstider per ukedag (nåværende arbeid)

Mål: hver **kuratert** bar har `openingHours` fra Google Places `regularOpeningHours` — egne slots **man–søn**, ikke felles `TYPICAL_HOURS`. Filter, forslag og «Åpner snart» / «Stenger snart» bruker disse slotene. `beerPrice` forblir manuell.

Kilde: **ukentlig timeplan**, ikke «åpen akkurat dette minuttet» (`currentOpeningHours` / helligdager er utenfor dette sporet).

Allerede i kode: `googlePlaceId`, `placesSync` / `placesSyncActions`, ukentlig cron. **Ikke** gjort: place-id på barene, og seed overskriver `openingHours` med `TYPICAL_HOURS` ved hver `seedDatabase`.

Implementeringsrekkefølge:

1. **Seed-vern.** Re-seed patcher ikke `openingHours` (eller rating/adresse) på en bar som allerede har `googlePlaceId`. Nye barer uten id får fortsatt `TYPICAL_HOURS` som midlertidig bootstrap.
2. **API-nøkkel.** `GOOGLE_PLACES_API_KEY` i Convex; Places API (New) slått på.
3. **Place-id, én gang.** Action: tekstsøk `navn + adresse + Trondheim` → foreslå `googlePlaceId`. Tvetydige treff logges og settes **ikke** automatisk. Kurator bekrefter før sync.
4. **Details-sync.** `regularOpeningHours.periods` → én slot per periode (`day` = åpningsdag, `open`/`close` `HH:mm`). Flere perioder samme dag beholdes. Overnight (`close` neste dag) følger regelen i [03-data-model.md](03-data-model.md). Rører ikke `beerPrice`.
5. **Kjør sync** (`placesSyncActions:syncAll`). Cron (mandag) holder planen oppdatert.
6. **Sjekk.** Minst ett sted med ulik åpning mandag vs. lørdag; tidsvindu på den ukedagen bruker **den** dagens slot (ikke felles 16:00–01:00).

**Exit spor A:** alle aktive kuraterte barer har `googlePlaceId` og minst én slot per ukedag der Google har åpent; ingen av dem står igjen på bare `TYPICAL_HOURS`.

### Spor B — Stopptid (etter spor A)

- Bruker setter ønsket minutter per stopp (`stopDwellMinutes`)
- Ved check-in: `moveOnAt` på stopp-logg
- In-app nedtelling / «på tide å gå videre»

**Exit fase 1.5:** spor A + bruker kan styre opphold per stopp.

## Fase 1.5.1 — Min profil (konto + kveldsfeed)

Etter at innlogging virker i prod: én skjerm som blander **profil** og **egen sosial historikk** — ikke gruppe.

1. [x] Rute `/me` + navbar: innlogget → `/me`, utlogget → `/sign-in`
2. [x] Query: nåværende bruker + stats (fullførte kvelder, stopp, km) + liste over egne instances (med valgfri photo-thumb)
3. [x] UI iht. [05-design.md](05-design.md) / Flyt H i [04-features.md](04-features.md)
4. [x] Logg ut; slett konto (bekreft + cascade egne data — se [08-privacy.md](08-privacy.md))
5. [x] `/routes` → redirect eller samme feed-seksjon på `/me` (unngå to konkurrerende «mine kvelder»-sider)

**Exit:** Innlogget bruker ser profil + egne kvelder på `/me`; ingen andres data lekker.

## Fase 2 — Gruppe

- `groups` / `groupMembers`
- Invitasjon (kode eller lenke)
- Delt `routeInstance` med reaktiv fremgang (hvem er hvor, hva er huket av)
- Stopp-logger per bruker innen samme instans
- Oppdater product/features/data-model-spec før kode

**Exit:** To brukere ser hverandres fremgang live på samme runde.

## Fase 3 — Konkurranse

- Poengmodell (besluttes og dokumenteres i ny eller utvidet spec)
- Ranking / resultat
- Eventuelt tidsbaserte regler som bruker eksisterende `checkedInAt`

**Exit:** To lag/personer kan fullføre en konkurranserunde med synlig resultat.

## Fase 4 — Drift og vekst (valgfritt, etter validering)

- Bedre bar-data (semi-automatisk / scraping med manuell godkjenning)
- Kart-visning
- Flere byer
- PWA / native hvis web-MVP beviselig brukes

## Endringsprosess

1. Oppdater relevant fil under `specs/`.
2. Kort notis i denne roadmapen hvis fasegrenser flyttes.
3. Implementer.
4. Ikke la «midlertidig snarvei» i kode bli udokumentert sannhet.

## Beslutningslogg

| Dato | Beslutning |
|------|------------|
| 2026-09-22 | Stack: Next.js + Convex |
| 2026-09-22 | MVP = solo først; gruppe/konkurranse senere |
| 2026-09-22 | Manuelt kuraterte Trondheim-barer (ingen scraping i MVP) |
| 2026-09-22 | Spec-drevet utvikling; `specs/` er source of truth |
| 2026-09-22 | Bruker kan legge til egne stopp (katalog + aktiv runde); `bars.source` curated/user |
| 2026-09-22 | Farger låst: bg `#121212`, brand `#CC3F0C` |
| 2026-09-22 | Ikoner: Lucide (`lucide-react`) |
| 2026-09-22 | UI-craft: `npx ui-skills` + lokal skill `.cursor/skills/ui-skills` |
| 2026-09-22 | Speilet UI-skills: frontend-design, landing-page, web-design-guidelines |
| 2026-09-22 | Tone: 20–25, inkluderende humor; UI: emne / øvinger / bestått |
| 2026-09-22 | Historikk + replay: samme barIds/challengeIds; snapshot på instance |
| 2026-09-22 | MVP: estimat tid/avstand (5 km/t + 30 min/stopp); fase 1.5: valgfri stopptid + varsel |
| 2026-09-22 | Merkevare **BTB**; fullføre = **Bestått**; disclaimer + personvern |
| 2026-09-22 | Gjesterunde uten konto; recap/collage; auto-slett dagen etter; lagring krever claim |
| 2026-09-22 | Etter forslag: endre rekkefølge + fjerne stopp (samme builder som manuell) |
| 2026-09-27 | Rute-options: maks ølpris per stopp, min. rating, tidsvindu; ingen aldersgrense-filter |
| 2026-09-27 | Bar-data: manuelt beerPrice; Places API for rating/timer i fase 1.5 |
| 2026-09-27 | UI: øvinger → utfordringer; fullfør = «Vi overlevde»; recap «Gi kvelden et navn»; bort fra school-tema |
| 2026-09-27 | «Ta et emne» → Start kvelden; «Mine emner» → Mine kvelder |
| 2026-09-29 | Soft filter: katalog alltid synlig; mismatch → confirm; rute-stopp med tidlig stenging → varselsbakgrunn + «Stenger HH:mm»; forslag prefererer fortsatt full vindu-dekning |
| 2026-09-29 | Tidsvindu-default: nå (Oslo) → +5 timer (ikke fast 20–02) |
| 2026-09-29 | Fase 1 lukket (smoke-test = restgjeld). Fase 1.5 startet: spor A = Places-åpningstider per ukedag før stopptid |
| 2026-09-29 | Suggest: smart ruteorden etter åpningstid når ikke alle stopp er åpne i hele tidsvinduet |
| 2026-10-05 | Fase 1.5.1: **Min profil** (`/me`) = profil + stats + egen kveldsfeed; ikke offentlige profiler/følgere |
