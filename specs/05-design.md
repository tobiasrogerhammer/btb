# 05 — Design og UX

## Retning

BtB («Bar-til-bar») skal føles som en **kveld ute**, ikke et admin-dashboard. Mobil-først, tydelig hierarki, lav friksjon midt i en runde.

Tone: uformell, sosial, **20–25 studentliv** — humoristisk uten å bli barnslig, «startup-lilla» eller guttefest-klisje.

## Designprinsipper

1. **Én komposisjon per viewport** — særlig landing og aktiv runde.
2. **Merkevare først på landing** — produktnavnet er hero-signal, ikke bare nav-tekst.
3. **Én jobb per seksjon** — én overskrift, én kort støtte-setning.
4. **Ingen unødvendige cards** — cards kun der de bærer interaksjon (stopp, utfordring-rad).
5. **Hero-budsjett** — landing: merkevare, én headline, én setning, én CTA-gruppe. Ikke stats, lister eller promo-chips i første viewport.
6. **Atmosfære** — bakgrunn med gradient/tekstur/bilde; ikke flat én-farge. Visuell anker: bynatt / bar-atmosfære (ekte foto eller stiliserte scener), ikke abstrakt «AI-gradient» alene.
7. **Bevegelse med mening** — 2–3 bevisste motion-momenter (f.eks. CTA-entrance, stopp-sjekk-inn feedback), ikke støy.

## Unngå (AI-design-klisjeer)

- Lilla-på-hvitt / purple-indigo gradient-tema
- Varm krem-bakgrunn (#F4F1EA) + terracotta + generisk serif-hero
- Avis-/broadsheet-layout med hårfine linjer og tette kolonner
- Overdreven dark mode som default uten bevisst valg
- Glow, multi-layer shadows, rounded-full pill-clusters, emoji-rekker

## UI Skills (agent-craft)

Ved all UI-implementasjon og polish: bruk **[UI Skills](https://www.ui-skills.com/)** via CLI.

```bash
npx ui-skills start
npx ui-skills categories
npx ui-skills list --category <topic>
npx ui-skills get <slug>
```

- Agenten skal hente minste nyttige skill-sett (helst 1, maks 3) før UI-kode.
- Prosjekt-skill: [`.cursor/skills/ui-skills/`](../.cursor/skills/ui-skills/) (routing + prosjekt-overrides).
- Speilet lokalt: `frontend-design`, `landing-page`, `web-design-guidelines`, pluss `baseline-ui.md`.
- **Specs vinner:** farger, Lucide, norsk copy og stack i denne mappen overstyrer generiske skill-defaults.

## Typografi

- Unngå default-stack (Inter, Roboto, Arial, system som eneste uttrykk).
- Velg ett uttrykksfullt display-font til merkevare/headlines + ett lesbart body-font.
- Konkret fontvalg: **Syne** (display) + **DM Sans** (body) — satt i `app/layout.tsx`.

## Ikoner

- Bruk **[Lucide](https://lucide.dev)** (`lucide-react`) for alle UI-ikoner.
- Én stil overalt — ikke bland med andre ikonsetts (Heroicons, Font Awesome, osv.).
- Foretrekk outline/stroke-ikoner i Lucide sin default-vekt; match stroke mot tekstfarge (`--text` / `--muted` / `--brand` ved aktiv tilstand).
- Hold størrelser konsistente (f.eks. 16 / 20 / 24 px) per kontekst (inline vs. CTA).

## Farge (låst)

CSS-variabler ved implementasjon:

| Token | Verdi | Rolle |
|-------|-------|-------|
| `--bg` | `#121212` | Bakgrunn (nær-svart) |
| `--brand` / `--accent` | `#CC3F0C` | Brand / CTA / «huket av» |
| `--surface` | litt løftet fra `#121212` (f.eks. `#1A1A1A`) | Interaktive flater |
| `--text` | nær hvit (f.eks. `#F5F5F5`) | Primærtekst |
| `--muted` | dempet grå | Sekundær tekst |

Brand `#CC3F0C` er den eneste sterke accenten. Ingen lilla. Hold paletten kort.

## Logo

- Fil: [`public/logo.png`](../public/logo.png) — geometrisk merke (bue + prikk) i brand-oransje på mørk bakgrunn.
- Favicon: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` (generert fra `public/logo.png`).
- Bruk i nav (`BrandMark`); landing hero er display-«Bar til bar» uten logo over — logo + wordmark i header.
- **Link-deling:** `public/og-image.png` + eksplisitt `openGraph.images` / `twitter.images` i `app/layout.tsx` (med `metadataBase`). Uten dette faller mange plattformer tilbake til Vercel-default.

## Rutebygger / foreslått runde

Etter forslag eller under manuell bygging (`/routes/new`):

```text
┌─────────────────────────┐
│ [Kart SVG]              │  ← Trondheim-kart (`public/map-hero.svg`)
├─────────────────────────┤
│ Din rute · estimat [⚙][↻]│  ← Options + Ny rute
│ Fre 20–01 · (evt. maks/rating) │  ← alltid filter-oppsummering (inkl. default dag/tid)
│ ⌃    Bar A             [kart][×]│
│ ⌄    ★ · øl · ⚠ 16–01         │  ← åpningstid i varselfarge + varsel-ikon ved mismatch
│ ⌃    Bar B             [kart][×]│
│ ⌄                              │
│      [ −  N  + ]              │
│ ── Andre stopp ─────        │  ← hele katalogen; mismatch → bekreft
│ [Start kvelden]             │
└─────────────────────────┘
```

- Kart over listen: dekorativ Trondheim-SVG, ikke interaktiv; myk fade inn i sidebakgrunn (`--bg`). Innhold under kartet uten egen surface-boks.
- **Options** (Lucide `SlidersHorizontal`) ved siden av «Ny rute»: inline panel uten egen boks/border; maks ølpris, min. rating, **uten-dag** (`<select>`-dropdown, man–søn, default = dagens ukedag i Oslo), tidsvindu (fra–til) — norsk copy.
- Stopp-rad i «Din rute»: flat liste med **separatorer** (ikke egne bokser). Vertikalt sentrert rad: **navn** (primær) · meta under (rating, ølpris, åpningstid) · kart/fjern. Ved mismatch: åpningstid i amber + Lucide `AlertTriangle`.
- **Populære ruter:** popup-meny over knappen (ikke inline-liste); lukkes ved valg / klikk utenfor.
- Katalog («Alle stopp»): samme rad-layout som «Din rute» (navn; under: rating, ølpris, åpningstid). Delvis mismatch → amber + `AlertTriangle`; **helt utenfor** tidsvindu → **rød** åpningstid + `AlertTriangle`. Bekreftelsesdialog ved add som bryter pris/rating/åpningstid.
- Rekkefølge: opp/ned-kontroller (Lucide `ChevronUp` / `ChevronDown`).
- Fjern: tydelig, tommelvennlig — ikke gjemt i swipe-only.
- Estimat i «Din rute»-header oppdateres live.

## Mobil-først: aktiv runde

Hovedskjerm under bruk (`/routes/[instanceId]`):

```text
┌─────────────────────────┐
│ Rundenavn / fremdrift   │
│ Stopp 2 av 5            │
│ ~1,2 km · ~3 t          │  ← estimat (MVP)
├─────────────────────────┤
│ Nåværende bar (navn)    │  ← primært fokus
│ Adresse · pris · åpent  │
│ [Sjekk inn]             │
├─────────────────────────┤
│ Utfordringer            │
│ ☐ ...                   │
│ ☑ ...                   │
├─────────────────────────┤
│ Bilde                   │
│ [Ta / last opp]         │
├─────────────────────────┤
│ Neste stopp →           │
│ [+ Legg til stopp]      │  ← katalog eller nytt sted
└─────────────────────────┘
```

- Tommel-vennlige knapper.
- **Navbar forblir synlig** under aktiv runde (samme shell som resten av appen).
- Avhuk og bilde uten å scrolle bort fra konteksten unødvendig.
- Fullført stopp skal gi tydelig, kort feedback (ikke confetti-storm).
- «Legg til stopp» er sekundær handling (ikke like fremtredende som sjekk-inn), men alltid tilgjengelig på aktiv runde og i rutebygger.

## Landing

- Full-bleed atmosfære (bilde/gradient som plan).
- **BtB** som hero-nivå signal (evt. undertittel «Bar-til-bar»).
- Én headline + én setning + CTA (**«Klar for kaos»** — uten login-krav).
- Visuell anker: bar-scene SVG (`public/bar-scene.svg`), ikke kart.
- Ingen kort-grid, ingen feature-stat-strips i første viewport.

## Dekorative SVG-er (kart + bar-scene)

- **Kart** (`map-hero.svg`) over rutebygger og **bar-scene** på landing er visuelle ankre — de skal synes på mobil (inkl. preview via LAN-IP), ikke bare desktop/`localhost`.
- Kart-animasjoner (rute-dash, pin-float) drives av CSS i `globals.css` på **inline** SVG i DOM (ikke `<img>` — da treffer ikke klassene).
- Bar-scene-animasjoner (bobler, øl, noter) likeså via CSS i `globals.css` (ikke stol kun på `<style>` inne i SVG-filen).
- **Rendering:** bar-scene server-rendres inline (første HTML-paint uten klient-JS). Kart monteres klient-side, men krever at Next.js tillater LAN-origin i dev (`allowedDevOrigins`) — ellers 403 på `/_next/*` og React hydrerer ikke.
- Respekter `prefers-reduced-motion: reduce` (statisk bilde OK; animasjon av).

## Tilgjengelighet (minimum)

- Kontrast som tåler kveldslys / utendørs.
- Fokus-states på interaktive elementer.
- Ikke stol kun på farge for «huket av».

## Copy

- Norsk bokmål i UI.
- **Domeneord (låst):**
  - Merkevare → **BtB** (Bar-til-bar)
  - Starte runde → **Klar for kaos** / **Start kvelden**
  - Barer / katalog → **Utesteder**
  - Oppgaver → **Utfordringer** (ikke «øvinger»)
  - Fullføre → **Vi overlevde**
- **Navbar:** rute-ikon (`/routes/new`, aria-label «Min rute») · martini-ikon (`/bars`, aria-label «Utesteder») · profil-ikon i sirkel (`/me` innlogget / `/sign-in` utlogget, aria-label «Konto»)
- Korte verb ellers: «Sjekk inn», «Huk av», «Neste stopp», «Legg til stopp».
- Recap: «Vi overlevde» + «Gi kvelden et navn» + collage + utfordringer; gjest: «Lagres ikke uten bruker — slettes i morgen».
- **Min profil (`/me`, fase 1.5.1):** én komposisjon — header (avatar + navn + stats) → kveldsfeed (ikke dashboard-grid). Flat liste med separatorer / lette rader; cards kun der rad er trykkbar interaksjon. Copy: «Min profil», «Mine kvelder», «Logg ut», «Slett konto». Ingen follower-UI eller «sosialt nettverk»-chrome.
- Microcopy og builtin-utfordringer: se tone i [01-product.md](01-product.md). Unngå school-/emne-terminologi i utfordringstekster.
- Footer: lenker til ansvar og personvern.
- Kode/API: engelske termer (`challenges`, `routeInstances`, `guestSessions`).

## Min profil — layout (Fase 1.5.1)

```text
┌─────────────────────────┐
│ [avatar]  Navn          │
│ 3 kvelder · 12 stopp · 4 km │  ← stats, én linje muted
├─────────────────────────┤
│ Mine kvelder            │
│ Kveld A · fullført · …  │  ← trykk → recap / aktiv
│ Kveld B · aktiv · …     │
├─────────────────────────┤
│ Logg ut                 │
│ Slett konto             │
└─────────────────────────┘
```

- Ingen hero-stats-strips med store tall-kort; stats er sekundær meta under navn.
- Tom tilstand: «Ingen kvelder ennå» + CTA til `/routes/new`.
- Bekreftelsesdialog før slett konto.

## Når design endres

Oppdater denne filen (fonter, tokens, mønstre) i samme runde som UI-endringen — slik at spec forblir source of truth.
