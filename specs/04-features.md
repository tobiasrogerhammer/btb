# 04 — Features og flyter

## Scope-matrise

| Område | MVP (fase 1) | Senere |
|--------|--------------|--------|
| Bar-katalog (kuratert) | Ja | Utvid + evt. scraping |
| Brukerskapt stopp | Ja | Deling / moderering |
| Manuell rute | Ja | — |
| Legge til/fjerne stopp på rute | Ja | — |
| Endre rekkefølge på stopp | Ja | — |
| Legge til stopp på aktiv runde | Ja | — |
| Automatisk ruteforslag | Ja (regelbasert) | Bedre scoring |
| Rute-options (pris / rating / tidsvindu) | Ja | Lagre preferanser på template |
| Builtin-utfordringer | Ja | — |
| Brukerskapt utfordring | Ja | Moderering |
| Solo rute-instans | Ja | — |
| Historikk (Mine kvelder) | Ja | — |
| Min profil (konto + kveldsfeed) | Ja (fase 1.5.1) | Offentlig profil / følgere |
| Ta samme rute på nytt (replay) | Ja | — |
| Estimert tid + gangavstand for rute | Ja | — |
| Gjesterunde (uten konto) | Ja | — |
| Recap / collage etter «Vi overlevde» | Ja | — |
| Auto-slett gjestedata dagen etter | Ja | — |
| Lagre kveld krever konto (claim) | Ja | — |
| Valgfri tid per stopp + «gå videre»-varsel | Nei | Fase 1.5 |
| Stopp: sjekk-inn + tidsstempel | Ja | — |
| Stopp: avhuk utfordringer | Ja | — |
| Stopp: bilde | Ja | — |
| Auth (valgfritt til lagring) | Ja | — |
| Gruppe delt fremgang | Nei | Fase 2 |
| Konkurranse / poeng | Nei | Fase 3 |
| Kart-SDK | Nei | Valgfritt |
| Native app | Nei | Etter web-validering |

## Flyt A — Manuell rute (solo)

```text
(Evt. akseptér disclaimer 18+)
  → Gjest: opprett/hent guestSession-token
  → ELLER logg inn
  → Velg barer i rekkefølge (katalog og/eller egne stopp)
  → Lagre template (barIds + challengeIds)
  → Start instance
  → Stopp: check-in → huk utfordringer → bilde
  → Vi overlevde (completedAt)
  → Recap
  → Gjest: CTA «Lagre — opprett bruker» ELLER «Data slettes i morgen»
  → Innlogget: synlig i historikk
```

## Flyt A0 — Gjest og claim

```text
Første «Start kvelden» / «Klar for kaos» uten konto
  → Opprett guestSession + token i localStorage
  → Ved «Vi overlevde»: sett expiresAt = slutten av neste kalenderdag (Europe/Oslo)
  → Recap-skjerm
  → «Opprett bruker for å lagre»
       → Auth → claimGuestSession
       → All data får userId; expiresAt fjernes
  → Uten claim: cron sletter session + bilder etter expiresAt
```

- Historikk og «ta på nytt» krever konto.
- Gjest kan slette runden manuelt før utløp.
## Flyt A2 — Opprett eget stopp

```text
Fra rutebygger eller aktiv runde → «Legg til stopp»
  → Navn (påkrevd)
  → Adresse og/eller kartpin (anbefalt)
  → Valgfritt: prisnivå
  → Lagre som bars med source: user
  → Legg inn i template eller aktiv instance
```

Minimumskrav MVP: **navn**. Uten koordinater deltar stoppet ikke i avstandsbasert forslag, men kan brukes manuelt.

## Flyt B — Automatisk forslag (solo)

```text
Gjest eller innlogget → `/routes/new`
  → «Din rute» vises som default (auto-forslag lastes med en gang)
  → Valgfritt: «Options» ved «Ny rute» → maks ølpris · min. rating · uten-dag · tidsvindu
  → Velg antall stopp (+/−) · se veiledende tid
  → Klient sender `now` + stopCount + valgfri `seed` + options-filtre
  → Server: filter (pris/rating/åpent i vindu) → seeded start → nearest-neighbor
  → Bruker ser redigerbar stoppliste; katalog bruker samme filtre
  → «Ny rute» (shuffle) bytter `seed` → nytt forslag med samme options
  → Kan: endre rekkefølge · fjerne stopp · legge til stopp (katalog bak toggle)
  → Estimat oppdateres ved hver endring
  → «Start kvelden» → lagre template + start instance
```

Ingen egen «Få forslag»-knapp — forslaget er default-tilstanden.

### Rute-options (MVP)

Panel ved siden av «Ny rute» på `/routes/new`. Preferanser lever i **klient-state** og sendes som args til `routes.suggest` — lagres ikke på template i MVP.

| Preferanse | Atferd |
|------------|--------|
| **Maks ølpris** | Kun stopp med `beerPrice ≤` verdi (halvliter NOK). Mangler pris → utenfor. Default: av. |
| **Min. rating** | Kun stopp med `rating ≥` verdi. Mangler rating → utenfor. Steg f.eks. 3.5 / 4.0 / 4.5. Default: av. |
| **Uten-dag** | Hvilken **ukedag** brukeren skal dra ut. **Dropdown** (man–søn). **Default: ukedagen i Europe/Oslo når siden lastes.** Løses til neste kalenderdato ≥ i dag med den ukedagen (inkl. i dag). |
| **Tidsvindu** | Klokkeslett `fra`–`til` (HH:mm) på uten-dagen. Hvis `til ≤ fra` → **neste kalenderdag**. **Åpen** = minst ett tidspunkt i vinduet. **Full dekning** = åpent hele vinduet (ingen varsel). Delvis: «Åpner snart» (ikke åpent ved start) eller «Stenger snart» (stenger før slutt). **Default: nå (Oslo) → +5 timer.** |

#### Uten-dag og åpningstid (MVP)

- **Uten-dag** = kvelden man *starter* (velg fre for «fredagskveld», også når vinduet går forbi midnatt).
- Dropdown-label: norske ukedagsnavn (`Mandag` … `Søndag`). Ingen egen datovelger i MVP.
- Aktive filtre kompakt **alltid** over stopplisten: f.eks. «Fre 20–01» (default) eller «Maks 110 kr · 4,0+ · Fre 20–02».
- Åpningstid-sjekk følger [03-data-model.md](03-data-model.md) (overnight).
- **Auto-forslag** inkluderer steder **åpne minst ett tidspunkt** i tidsvinduet. ≤ 5 slike: melding «N utesteder åpne, utvid filter for fler valg». Under 2: fall tilbake til pris/rating-pool.
- Er ikke alle foreslåtte stopp åpne hele vinduet: **smart rekkefølge etter åpningstid** (tidlig stenging / allerede åpent tidligere; sent åpnende senere). Ellers samme timer-baserte orden + nærmeste.
- **Manuell katalog:** hele katalogen synlig. Mismatch (ingen overlap med vindu / pris / rating) → bekreftelsesdialog.
- **Stopp i «Din rute»** uten full vindu-dekning: åpningstid i amber + varsel-ikon (ikke egen tekst ved navn).
- **Aldersgrense (18/20) er ikke i scope.**

### Redigering av forslag / rute (MVP)

Gjelder både etter auto-forslag og ved manuell bygging (`/routes/new`):

| Handling | Atferd |
|----------|--------|
| **Ny rute** | Shuffle-knapp i «Din rute»; ny `seed` → nytt forslag med samme stoppantall og options |
| **Options** | Knapp ved «Ny rute»; maks ølpris, min. rating, uten-dag (dropdown), tidsvindu (se over) |
| **Populære ruter** | Knapp ved +/− åpner **popup-meny** med kuraterte favoritt-runder; lukkes ved valg eller klikk utenfor |
| **Endre rekkefølge** | Opp/ned-kontroller; `barIds` (og parallell `stopDwellMinutes`) permuteres |
| **Fjerne stopp** | Fjern fra listen; minst **2 stopp** før start (under → disable «Start kvelden» / vis melding) |
| **Legge til stopp** | Fra katalog (toggle) eller eget stopp. Katalog viser **alle** etter filter. Mismatch (pris/rating/åpningstid) → bekreftelsesdialog før add |
| **Rating** | Under navn på stopp i «Din rute» (kuratert `rating` 1–5 + `ratingCount`) |
| **Ølpris** | Under navn: veiledende `beerPrice` (NOK) med øl-ikon |
| **Åpningstid** | Under navn: slot for uten-dagen. Mismatch → åpningstid i amber + `AlertTriangle` (klokke byttes); tooltip/sr-only for «Åpner snart» / «Stenger snart» |
| **Statusbar** | Sticky topp på aktiv runde: stopp-progress, tid brukt, innstillinger |
| **Kart** | Ikon åpner Google Maps sted-/profilvisning via `googlePlaceId` (`query_place_id`; fallback navn/adresse, deretter coords — ikke turn-by-turn) |
| **Estimat** | Rekalkuleres umiddelbart ved reorder/add/remove |

- Forslaget er aldri låst — det er et utgangspunkt.
- Samme redigerings-UI brukes for manuell rute og foreslått rute.

### Forslagsregler (MVP)

1. Kun `isActive` **kuraterte** barer med koordinater (brukerskapte er ikke i auto-forslag i MVP).
2. Valgfritt: `beerPrice ≤ maxBeerPrice` (mangler pris → ekskludér).
3. Valgfritt: `rating ≥ minRating` (mangler rating → ekskludér).
4. **Forslag:** steder med **minst ett** åpent tidspunkt i `windowStart`/`windowEnd`; soft melding ved ≤ 5; under 2 → fall tilbake til pris/rating-pool. Varsel i UI ved delvis dekning. Mangler åpningstider → antas åpen.
5. Startstopp + nearest-neighbor: **prioriter steder åpne i hele tidsvinduet** ved plukking. Fyll deretter med delvis åpne ved behov. Seed gir variasjon innen fullt-åpne.
6. Etter plukking: **omordne alltid** etter åpningstid (`orderRouteByOpeningHours`) — besøk når åpent; tidlig stenging tidligere i ruten. Gangtid + 30 min/stopp i planen.
7. Bruker velger **antall stopp** (2–12) med +/−; UI viser veiledende tid (30 min/stopp + gang). Endring av stoppantall regenererer forslag.
8. Returner liste; bruker kan fortsatt endre rekkefølge manuelt.
9. Vis alltid **estimert gangavstand** og **estimert total tid**.

*(Tidsbudsjett som egen forslagsmodus er ikke i UI i MVP; backend kan fortsatt støtte det senere.)*

### Estimat: tid og avstand (MVP)

Beregnes for template/instance når `barIds` endres, og vises i rutebygger, forslag, aktiv runde og historikk.

| Størrelse | Formel (MVP) |
|-----------|----------------|
| Gangavstand | Sum Haversine mellom påfølgende stopp som har `lat`/`lng` |
| Gangtid | Avstand / **5 km/t** (gangtempo), avrundet til hele minutter |
| Opphold | **30 min × antall stopp** (fast default) |
| Total tid | Gangtid + opphold |

- Mangler koordinater på et stopp: den etappen utelates fra avstand/gangtid; UI merkes «delvis estimat».
- Estimat er veiledende — ikke live GPS-tracking i MVP.
- Verdier lagres på template/instance (`estimatedDistanceMeters`, `estimatedWalkMinutes`, `estimatedDwellMinutes`, `estimatedTotalMinutes`) og rekalkuleres ved endring av stopp.

## Flyt C — Utfordringer

- Ved start: snapshot relevante utfordringer inn i `template.challengeIds` / `instance.challengeIds` (bar-spesifikke for stoppene + generiske + evt. egne valgte).
- På stopp: vis **maks 3 foreslåtte** utfordringer (bar-spesifikke først, deretter generiske rotert per stopp).
- Bruker kan **opprette egen utfordring** (`source: user`, knyttet til aktuelt stopp) — appendes til `instance.challengeIds` og vises alltid på det stoppet (i tillegg til foreslåtte).
- Avhuk lagres på `stopLogs.completedChallengeIds`.
- Ingen server-side «bevis» utover bilde (valgfritt) og tidsstempel.
- Innholdstonen følger [01-product.md](01-product.md) — inkluderende kveldshumor, **ikke** school-/øving-tema.

## Flyt D — Stopp-logg

| Handling | Effekt |
|----------|--------|
| Første check-in på stopp | Opprett `stopLog`, sett `checkedInAt = now` |
| Toggle utfordring | Oppdater array + `updatedAt` |
| Last opp bilde | `generateUploadUrl` → lagre → sett `photoStorageId` |
| Legg til stopp på aktiv runde | Append `barId` på `instance.barIds` (eksisterende eller nyopprettet) |
| Fullfør runde | Sett `completed` + `completedAt`; gjest: sett `expiresAt` |
| «Vi overlevde» → Recap | Vis collage + utfordringer (Flyt G) |

## Flyt E — Historikk og ta på nytt

```text
/routes eller /me#kvelder (krever innlogging)
  → Liste: aktive + fullførte
  → «Ta på nytt» → ny instance (samme barIds + challengeIds)
```

- Replay kun for konto.
- Ved «ta på nytt»: patch template til siste instance-kopi.
- **Fase 1.5.1:** historikk er primært seksjon på **Min profil** (`/me`); `/routes` kan redirecte dit eller beholde samme liste som alias.

## Flyt H — Min profil (Fase 1.5.1)

Blanding av **konto/profil** og **lett sosial egen-feed** — ikke gruppe, ikke følgere.

```text
Navbar «Konto» → innlogget: /me · utlogget: /sign-in
  → Profil-header (avatar, navn, korte stats)
  → Feed: tidligere / aktive kvelder (kort)
  → Åpne kveld → aktiv runde eller recap
  → «Ta på nytt» på fullførte
  → Konto: logg ut · slett konto (bekreft)
```

### Hva siden er

| Del | Innhold (1.5.1) |
|-----|----------------|
| **Profil** | Visningsnavn + avatar fra auth (`users.name`, `users.image`). E-post kun for eier (ikke i «sosial»-del). |
| **Stats** | Antall fullførte kvelder · antall stopp (check-ins) · sum gang-km (fra lagrede estimat). Kun tall — ikke leaderboard. |
| **Kveldsfeed** | Kronologisk liste (nyeste først): navn, status, stoppantall, estimat, dato. Fullførte: valgfri bilde-thumb fra stopLogs. CTA «Ta på nytt» / åpne recap. |
| **Konto** | Logg ut. Slett konto (sletter egne rute-data + auth-bruker iht. personvern). Lenker til ansvar / personvern. |

### Hva det *ikke* er (1.5.1)

- Andres profiler, følgere, likes, kommentarer, aktivitet fra venner.
- Offentlig delbar profil-URL (`/u/…`) — kan komme senere; default nå: **kun eier ser `/me`**.
- Bio, badges, poeng — utsettes (fase 2/3).
- Live «hvem er ute nå».

### Akseptansekriterier (fase 1.5.1)

- [x] Innlogget: profil-ikon går til `/me`; utlogget til `/sign-in`.
- [x] `/me` uten auth → redirect/CTA til innlogging.
- [x] Viser navn/avatar (fallback-initialer hvis mangler bilde).
- [x] Stats stemmer med eiers `routeInstances` / `stopLogs`.
- [x] Kveldsfeed viser egne instances; fremmed bruker ser ikke andres `/me`-data.
- [x] «Ta på nytt» og åpne recap/aktiv runde fungerer som i Flyt E/G.
- [x] Logg ut fungerer.
- [x] Slett konto krever bekreftelse og fjerner brukerens data (eller dokumentert «kontakt oss» midlertidig — se privacy).

## Flyt F — Stopptid og varsel (fase 1.5 — ikke MVP)

```text
Per stopp: ønsket opphold (default 30 min)
  → check-in → moveOnAt
  → in-app «på tide å gå videre» (push senere)
```

## Flyt G — Recap etter «Vi overlevde»

```text
Vi overlevde
  → /routes/[instanceId]/recap
  → Gi kvelden et navn (input; lagres på template)
  → Collage / grid av bilder fra stopLogs
  → Liste over hukede utfordringer (gruppert per stopp eller flat)
  → Kort oppsummering: antall stopp, tid brukt (fra startedAt→completedAt), estimat
  → Gjest: «Lagre kvelden — opprett bruker» + info om sletting dagen etter
  → Innlogget: «Se mine kvelder» / «Ta på nytt»
```

- Kveldsnavn settes **på recap**, ikke i rutebyggeren (`/routes/new`). Til midlertidig lagring brukes default «Min kveld».
- Deling av recap (lenke/bilde) er nice-to-have, ikke MVP-krav.
- Collage: enkel CSS-grid i MVP; fancy layout kan poleres senere.

## UI-skjermer (MVP)

| Rute | Jobb |
|------|------|
| `/` | Landing: **BtB** + CTA **«Klar for kaos»** (uten krav om login) |
| `/disclaimer` eller modal | 18+ / ansvar — lenke til [07-disclaimer.md](07-disclaimer.md) |
| `/personvern` | [08-privacy.md](08-privacy.md) |
| `/sign-in`, `/sign-up` | Auth (+ claim gjest) |
| `/me` | **Min profil** (Fase 1.5.1): profil + stats + kveldsfeed + konto — krever innlogging |
| `/bars` | **Utesteder** — katalog + egne stopp |
| `/routes/new` | Bygg / foreslå; redigerbar liste (reorder, fjern, legg til); estimat — uten navn |
| `/routes/[instanceId]` | Aktiv runde |
| `/routes/[instanceId]/recap` | Navn + collage + utfordringer + lagre-CTA |
| `/routes` | Mine kvelder (fase 1); i 1.5.1: alias/redirect til `/me` kveldsseksjon |

## Eksplisitt utenfor MVP

- Live «hvem er hvor» / gruppe-presence.
- Poengtavle og konkurranseregler.
- Push, chat, invitasjonslenker (kan komme tidlig i fase 2).
- Offentlige profiler / følgere / sosial feed på tvers av brukere (fase 1.5.1 = kun egen feed).
- Admin-UI for bar-kuratering (seed via mutation/script er nok).
- Offline-first / PWA-krav (nice-to-have, ikke blocker).
- Sosial deling av recap som bilde/story (kan komme raskt etter MVP).

## Akseptansekriterier (MVP)

- [ ] Seedede Trondheim-barer synlige i UI.
- [ ] Gjest kan starte og fullføre runde uten konto.
- [ ] Etter «Vi overlevde»: recap med bilder (collage) og hukede utfordringer.
- [ ] Gjest ser tydelig at data slettes dagen etter, med CTA for å opprette bruker.
- [ ] Claim: opprett bruker → kvelden lagres i historikk.
- [ ] Cron/job sletter utløpte gjestesessions inkl. bilder.
- [ ] Innlogget: egne stopp, historikk, ta på nytt.
- [ ] Check-in lagrer `checkedInAt` én gang per stopp.
- [ ] Rute viser estimert gangavstand og total tid.
- [ ] Etter forslag (og i manuell builder): kan endre rekkefølge og fjerne stopp; estimat oppdateres.
- [ ] Disclaimer og personvern tilgjengelig i UI.
- [ ] Fremmed token/user kan ikke mutere andres data.
- [ ] Options: maks ølpris, min. rating, uten-dag og tidsvindu styrer forslag (preferanse); katalog forblir full.
- [ ] Catalog-add som mismatcher filter → bekreftelsesdialog; stopp uten full vindu-dekning → åpningstid i amber + varsel-ikon; forslag omordnes etter åpningstid.
- [ ] Overnight-åpningstid: fre 20–02 treffer barer åpne fre kveld og lør natt før stenging; lør 01 dekkes av fre-slot når close er 02:00.
