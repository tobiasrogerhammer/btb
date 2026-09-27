# 06 — Roadmap

Utvikling skjer i faser. **Ikke start neste fase før fase-mål er møtt**, med mindre spec eksplisitt endres.

## Fase 0 — Blueprint (nå)

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
8. [ ] Smoke-test mot akseptansekriterier i [04-features.md](04-features.md)

**Exit:** Akseptansekriterier i features-spec er huket av.

## Fase 1.5 — Stopptid, «gå videre» og Places-sync

Etter solo-MVP, før eller parallelt med gruppe:

- Bruker setter ønsket minutter per stopp (`stopDwellMinutes`)
- Ved check-in: `moveOnAt` på stopp-logg
- In-app nedtelling / «på tide å gå videre»
- Push-varsler når PWA/native er aktuelt (se fase 4)
- [x] **Google Places sync scaffolding:** `googlePlaceId`, `placesSync` + ukentlig cron (krever API-nøkkel + place ids)
- Oppdater features/data-model hvis detaljer endres under implementasjon

**Exit:** Bruker kan styre opphold per stopp; bar-rating/timer kan synces fra Places.

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
