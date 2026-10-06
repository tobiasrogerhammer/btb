# 03 — Datamodell

Relasjonell, flat modell i Convex. Arrays kun for korte, naturlig begrensede lister (f.eks. `barIds` på en rute).

## Entitetsoversikt

```text
users ──┬── routeTemplates ── routeInstances ── stopLogs ── bars
        │                              │
        ├── challenges (brukerskapt)   └── challenges (avhuket via IDs)
        │
        └── (senere) groups

guestSessions ── routeTemplates? ── routeInstances ── stopLogs
                 (midlertidig; slettes etter utløp)

bars ──── challenges (bar-spesifikke, optional barId)
```

## Tabeller

### `users`

Convex Auth-bruker (+ app-felt). Feltene under speiler praktisk schema (`authTables` + utvidelser).

| Felt | Type | Merknad |
|------|------|---------|
| `name` | string? | Fra auth / profil |
| `email` | string? | |
| `image` | string? | Profilbilde-URL fra OAuth |
| `emailVerificationTime` | number? | |
| `phone` / `phoneVerificationTime` | — | Auth-valgfritt; ikke brukt i UI |
| `isAnonymous` | boolean? | |
| `acceptedDisclaimerAt` | number? | Når bruker bekreftet 18+/ansvar |

**Indekser:** `email` (`email`).

**Min profil (Fase 1.5.1):** ingen nye tabeller. `/me` leser `users` (eier) + aggregerer egne `routeInstances` / `stopLogs`. Stats beregnes i query (ikke denormaliserte felter i MVP/1.5.1). Offentlig profil / `bio` / visibility-flagg utsettes.

### `guestSessions`

Midlertidig eierskap uten konto. Token lagres i nettleser (`localStorage`).

| Felt | Type | Merknad |
|------|------|---------|
| `token` | string | Uguessable (f.eks. UUID); sendes fra klient |
| `createdAt` | number | |
| `expiresAt` | number | Settes/oppdateres ved fullføring: **slutten av neste kalenderdag** (Europe/Oslo) etter `completedAt`, eller senest 36 t etter siste aktivitet |
| `claimedByUserId` | Id\<users\>? | Satt når gjest oppretter konto og lagrer |

**Indekser:** `by_token` (`token`), `by_expiresAt` (`expiresAt`).

Cron (daglig): slett `guestSessions` der `expiresAt < now` og `claimedByUserId` mangler — cascade slett tilknyttede templates, instances, stopLogs, storage-filer og gjeste-barer/øvinger.

### `bars`

| Felt | Type | Merknad |
|------|------|---------|
| `name` | string | |
| `address` | string? | Påkrevd for kuraterte; valgfritt for brukerskapte |
| `lat` / `lng` | number? | Valgfritt for brukerskapte (anbefalt for avstand/forslag) |
| `priceLevel` | 1 \| 2 \| 3 \| null? | Billig → dyr; kan mangle på brukerskapte |
| `beerPrice` | number? | Veiledende ølpris i NOK per **halvliter** (kuratert manuelt; ikke overskrives av Places) |
| `rating` | number? | Snitt 1.0–5.0; manuelt i MVP, Places-sync senere |
| `ratingCount` | number? | Antall vurderinger |
| `openingHours` | objekt? | Slots `{ day, open, close }` per ukedag — se **Åpningstider**. Etter spor A: fra Places, ikke felles `TYPICAL_HOURS` |
| `googlePlaceId` | string? | Places place id. Når satt: re-seed overskriver ikke `openingHours` |
| `source` | `curated` \| `user` | Seed vs. brukerskapt stopp |
| `createdByUserId` | Id\<users\>? | Når innlogget opprettet |
| `guestSessionId` | Id\<guestSessions\>? | Når gjest opprettet (slettes med session) |
| `isActive` | boolean | Soft-hide uten sletting |
| `notes` | string? | Intern kurator-note |

**Indekser:** `by_active` (`isActive`), `by_source` (`source`), `by_creator` (`createdByUserId`), `by_guest_session` (`guestSessionId`).

### Åpningstider (semantikk)

Lagres som liste av slots (Google Places-konvensjon):

| Felt | Type | Merknad |
|------|------|---------|
| `day` | 0–6 | **Åpningsdag** (0 = søndag … 6 = lørdag), Europe/Oslo |
| `open` / `close` | `"HH:mm"` | Veggtid. Hvis `close ≤ open` (eller typisk natt, f.eks. `14:00`–`02:00`): slotten dekker **åpningsdagen fra `open` til midnatt** og **neste kalenderdag fra 00:00 til `close`** |

**`isOpenNow(hours, t)`:** mangler hours → antas åpen. Ellers true hvis minst én slot dekker øyeblikket `t` (Oslo), dvs. sjekk slots for **kalenderdagen til `t`** *og* overnight-slots fra **foregående dag**.

**`isOpenDuringWindow(hours, start, end)`:** åpent i **hele** `[start, end)`.

**`isOpenAtAnyDuringWindow(hours, start, end)`:** åpent minst ett tidspunkt i vinduet (forslag + «åpen»-telling).

**`hoursWarningForWindow`:** null ved full dekning; ellers «Åpner snart» / «Stenger snart» / «Ikke åpent i tidsvinduet».

Klient bygger `windowStart`/`windowEnd` fra **uten-dag** + klokkeslett (se features) og sender epoch ms til `routes.suggest`. Backend tar ikke imot ukedag direkte. «Åpen» i forslag = minst ett tidspunkt i vinduet; varsel i UI ved delvis dekning.

### Rute-preferanser (klient → `routes.suggest`)

Ikke egne tabeller i MVP. Args på query:

| Arg | Type | Merknad |
|-----|------|---------|
| `maxBeerPrice` | number? | Maks ølpris per stopp |
| `minRating` | number? | Min. rating |
| `windowStart` / `windowEnd` | number? | Epoch ms; åpen i hele vinduet (klient ankrer på uten-dag) |
| `now` | number | Påkrevd; brukes når vindu mangler |

Katalogen på `/routes/new` filteres klient-side med samme verdier.

**Synlighet (MVP):** kuraterte barer er synlige for alle; brukerskapte stopp er synlige for skaperen/gjesten (og kan brukes på egne ruter). Deling i gruppe kommer i fase 2.

### `challenges`

| Felt | Type | Merknad |
|------|------|---------|
| `text` | string | Selve øvingen |
| `barId` | Id\<bars\>? | Null = generisk |
| `source` | `builtin` \| `user` | |
| `createdByUserId` | Id\<users\>? | Når innlogget |
| `guestSessionId` | Id\<guestSessions\>? | Når gjest |
| `isActive` | boolean | |
| `createdAt` | number | |

**Indekser:** `by_bar` (`barId`), `by_source` (`source`), `by_creator` (`createdByUserId`), `by_guest_session` (`guestSessionId`).

Ingen verifikasjon — bare tekst + avhuking i stopp-logg.

### `routeTemplates`

Mal: ordnet liste barer + øvinger. Kan være manuelt bygget eller generert. Bruker/gjest kan **endre rekkefølge**, fjerne og legge til stopp før start (også etter auto-forslag). Brukes også som kilde ved «ta på nytt» (konto).

| Felt | Type | Merknad |
|------|------|---------|
| `userId` | Id\<users\>? | Eier hvis innlogget; null for gjest |
| `guestSessionId` | Id\<guestSessions\>? | Eier hvis gjest |
| `name` | string | |
| `barIds` | Id\<bars\>[] | Rekkefølge = ruteordre (kort liste, typisk 3–8); kan inkludere brukerskapte |
| `challengeIds` | Id\<challenges\>[] | Snapshot av utfordringer knyttet til denne runden |
| `estimatedDistanceMeters` | number | Sum gangavstand (Haversine); 0 hvis ingen etapper med coords |
| `estimatedWalkMinutes` | number | Fra avstand @ 5 km/t |
| `estimatedDwellMinutes` | number | Sum planlagt opphold (MVP: 30 × antall stopp) |
| `estimatedTotalMinutes` | number | walk + dwell |
| `stopDwellMinutes` | number[] | Parallell til `barIds`; MVP fylles med 40 overalt; redigerbar i fase 1.5 |
| `source` | `manual` \| `generated` | |
| `createdAt` | number | |

**Indekser:** `by_user` (`userId`), `by_guest_session` (`guestSessionId`).

Ved start og ved replay: `challengeIds` kopieres til instansen, så senere endringer i katalogen ikke endrer et gammelt emne.

### `routeInstances`

Faktisk gjennomføring av en mal. Ved start kopieres `barIds` og `challengeIds` inn på instansen.

| Felt | Type | Merknad |
|------|------|---------|
| `userId` | Id\<users\>? | Solo-eier hvis innlogget |
| `guestSessionId` | Id\<guestSessions\>? | Hvis gjesterunde |
| `templateId` | Id\<routeTemplates\> | |
| `barIds` | Id\<bars\>[] | Arbeidskopi; kan utvides med `addStop` |
| `challengeIds` | Id\<challenges\>[] | Arbeidskopi; nye øvinger underveis appendes |
| `estimatedDistanceMeters` | number | |
| `estimatedWalkMinutes` | number | |
| `estimatedDwellMinutes` | number | |
| `estimatedTotalMinutes` | number | |
| `stopDwellMinutes` | number[] | Parallell til `barIds` |
| `replayedFromInstanceId` | Id\<routeInstances\>? | Kun konto: «ta på nytt» |
| `mode` | `solo` \| `group` \| `competition` | MVP: kun `solo` |
| `status` | `planned` \| `active` \| `completed` | |
| `startedAt` | number? | |
| `completedAt` | number? | |
| `createdAt` | number | |

**Indekser:** `by_user` (`userId`), `by_user_and_status` (`userId`, `status`), `by_user_and_completedAt` (`userId`, `completedAt`), `by_guest_session` (`guestSessionId`).

### `stopLogs`

Per eier (bruker eller gjest) per bar i en instans. **Tidsstempel er first-class.**

| Felt | Type | Merknad |
|------|------|---------|
| `instanceId` | Id\<routeInstances\> | |
| `userId` | Id\<users\>? | Hvis innlogget |
| `guestSessionId` | Id\<guestSessions\>? | Hvis gjest |
| `barId` | Id\<bars\> | |
| `orderIndex` | number | |
| `completedChallengeIds` | Id\<challenges\>[] | |
| `photoStorageId` | Id\<_storage\>? | |
| `checkedInAt` | number | Første sjekk-inn |
| `plannedDwellMinutes` | number? | Fase 1.5 |
| `moveOnAt` | number? | Fase 1.5 |
| `updatedAt` | number | |

**Indekser:** `by_instance` (`instanceId`), `by_instance_and_bar` (`instanceId`, `barId`), `by_user_and_instance` (`userId`, `instanceId`), `by_guest_and_instance` (`guestSessionId`, `instanceId`).

Unikhet: én logg per (`instanceId`, eier, `barId`) — håndheves i mutation.

## Regler

1. **Tidsstempel fra start** — `checkedInAt` / `startedAt` / `completedAt` er ikke valgfrie «nice-to-have».
2. **Eierskap** — skriv krever matchende innlogget `userId` **eller** gyldig `guestSession` (token + ikke utløpt).
3. **Historikk for konto** — fullførte brukereide instanser slettes ikke i MVP.
4. **Gjestedata utløper** — slettes automatisk etter `expiresAt` (dagen etter fullføring). Ingen permanent historikk uten konto.
5. **`mode` reserves** — ikke bygg gruppe-logikk før fase 2.
6. **Egne stopp** — krever `name` + (`createdByUserId` eller `guestSessionId`).
7. **Replay** — kun innlogget; kloner `barIds` + `challengeIds` (+ `stopDwellMinutes`).
8. **Estimater** — rekalkuleres når stopplisten endres.
9. **Claim** — ved konto fra gjest: overfør eierskap til `userId`, sett `claimedByUserId`, fjern utløp.

## Seed (MVP)

Intern seed-mutation med ~8–12 Trondheim-barer + et sett `builtin`-øvinger (generiske + noen bar-knyttede). Manuelt verifiserte koordinater og åpningstider.

## Senere utvidelser (ikke implementer nå)

| Tabell / felt | Formål |
|---------------|--------|
| `groups` | Binder brukere til én `routeInstance` |
| `groupMembers` | Rolle, joinedAt |
| `routeInstances.groupId` | Kobling |
| Poeng / scores | Konkurranse — modell TBD |
