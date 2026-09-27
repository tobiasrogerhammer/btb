# 02 — Teknologivalg

## Låst stack (MVP)

| Lag | Valg | Begrunnelse |
|-----|------|-------------|
| Frontend | **Next.js** (App Router) + TypeScript + Tailwind | Rask web-MVP, unngår App Store under validering, god Convex-integrasjon |
| Ikoner | **Lucide** (`lucide-react`) | Konsistent, lettvektet ikonset — se [05-design.md](05-design.md) |
| UI-craft | **UI Skills** (`npx ui-skills`) | Agent-skills for design engineering; se [05-design.md](05-design.md) |
| Backend / DB | **Convex** | Type-safe API, innebygd DB, fil-storage, reaktivitet uten egen WebSocket-server — kritisk for senere gruppe-modus |
| Auth | **Convex Auth** (`@convex-dev/auth`) — Password + Google OAuth | Eierskap av ruter/logger; Google for rask innlogging, passord som fallback |
| Avstand | **Haversine** på lat/lng | Nok for ruteforslag; ingen Maps-SDK-kost eller API-nøkler i MVP |
| Hosting (senere) | Vercel (frontend) + Convex Cloud | Standard Next + Convex-oppsett |

## Hvorfor ikke det opprinnelige forslaget

Opprinnelig skisse: Node/Python-API + Postgres + WebSockets/Firebase + scraping-jobber.

| Behov | Convex-løsning | Alternativ vi dropper i MVP |
|-------|----------------|----------------------------|
| Sanntid gruppefremgang | Reactive queries | Egen WebSocket / Firebase |
| Stopp-bilder | Convex file storage | S3 + signed URLs manuelt |
| Auth + brukerdata | Convex Auth + `users` | Custom JWT/session |
| Scraping | Utsettes; manuelt seed | Periodiske scrapers |

Scraping kan komme senere som Convex cron/action eller egen jobb — ikke blokkerende for MVP.

## Arkitekturoversikt

```text
┌─────────────────────┐
│  Next.js (App)      │
│  React + Tailwind   │
│  Convex React hooks │
└─────────┬───────────┘
          │ Convex client
┌─────────▼───────────┐
│  Convex backend     │
│  queries/mutations  │
│  schema + storage   │
│  auth               │
└─────────────────────┘
```

- **Ingen separat REST-API** i MVP — UI kaller Convex-funksjoner direkte.
- **Ingen Date.now() i queries** — tid for åpningstider/forslag sendes fra klient (`now`).
- **Public vs authed vs guest** — barer/builtin-øvinger leses offentlig; skriving via innlogget bruker **eller** gyldig `guestSession`; permanent historikk krever konto.
- Gjest-cleanup: Convex cron sletter utløpte `guestSessions` (+ filer).

## Mapper (målstruktur)

```text
bar-til-bar/
├── specs/                 # Blueprint (denne mappen)
├── app/                   # Next.js App Router
├── components/            # UI-komponenter
├── convex/
│   ├── schema.ts
│   ├── lib/               # auth helpers, haversine, openingHours
│   ├── bars.ts
│   ├── challenges.ts
│   ├── routes.ts
│   ├── stopLogs.ts
│   ├── seed.ts
│   └── auth.config.ts
├── AGENTS.md
└── .cursor/
    ├── rules/
    └── skills/ui-skills/  # npx ui-skills routing
```

## Konvensjoner

- Convex: argument- og retur-validators på alle public functions; `await` alle promises; indekser fremfor `.filter()`.
- TypeScript: strict, unngå `any`.
- Utvikling: `npx convex dev` (aldri `deploy` til prod under lokal utvikling).
- UI-arbeid: bruk `npx ui-skills` (start → list/get) før implementasjon/polish — se [05-design.md](05-design.md).
- Spec-drevet: se [README.md](README.md).

## Bar-datakilder

| Felt | MVP | Neste steg (fase 1.5+) |
|------|-----|------------------------|
| Ølpris (`beerPrice`) | Manuelt seed (lokale prislister) | Forblir manuelt — ingen pålitelig gratis API |
| Rating / `ratingCount` | Manuelt (f.eks. fra Google Maps) | **Google Places API (New)** Place Details |
| Åpningstider | Seed `TYPICAL_HOURS` / kuratert | Samme Places Details (`regularOpeningHours`) |

**Places-sync (fase 1.5):** `googlePlaceId` på `bars` → Convex action henter Details → cron ukentlig. Oppdaterer rating, ratingCount, openingHours, address — **ikke** `beerPrice`. Env: `GOOGLE_PLACES_API_KEY` i Convex. Scraping forblir ute (ToS/skjørhet). OSM/Yelp forkastet for MVP (svak rating/pris-dekning i NO).

## Avhengigheter vi bevisst utsetter

- Kart-SDK (Google/Mapbox) — lenke ut til Maps per bar er nok; avstand via Haversine.
- Scraping / full automatisk bar-katalog.
- Push-varsler (fase 1.5 starter med in-app; push i fase 4 / PWA).
- Analytics-plattform (kan legges til lett senere).
- Egen poengmotor for konkurranse.
