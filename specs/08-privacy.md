# 08 — Personvernerklæring

Denne erklæringen gjelder **BTB** («Bar-til-bar»). Den beskriver hvilke personopplysninger vi behandler, hvorfor, og hvilke rettigheter du har.

Behandlingsansvarlig: eier av prosjektet (navn/kontakt fylles inn ved offentlig launch).

## 1. Hva vi samler inn

### Med brukerkonto

| Data | Formål |
|------|--------|
| E-post, navn (og evt. profilbilde fra auth) | Konto, innlogging, eierskap til kvelder |
| Emner (ruter), stopp, tidsstempler | Historikk, replay, estimater |
| Øvinger du huker av / lager | Gamification og historikk |
| Bilder du laster opp på stopp | Recap og minne fra kvelden |
| Tekniske logger (feil, ytelse) | Drift og feilretting |

### Uten konto (gjesterunde)

| Data | Formål |
|------|--------|
| Midlertidig gjeste-ID (tilfeldig token i nettleser) | Knytte runden din sammen |
| Samme type runde-data som over (stopp, utfordringer, bilder) | Gjennomføre runden + recap |
| Utløpstidspunkt | Automatisk sletting |

Vi ber ikke om navn/e-post for å starte en gjesterunde.

## 2. Rettslig grunnlag (oversikt)

- **Avtale / forespurt tjeneste** — for å levere runden, historikk og recap.
- **Berettiget interesse** — sikkerhet, misbruksforebygging, grov feilretting.
- Ved offentlig lansering i EU/EØS: behandlingen skal være forenlig med GDPR; denne teksten oppdateres med formelt kontaktpunkt.

## 3. Lagring og sletting

| Type | Lagring |
|------|---------|
| **Gjestedata** | Slettes automatisk **dagen etter** at runden er fullført (eller senest ~36 timer etter `completedAt` / siste aktivitet — se features). Bilder i fil-storage slettes sammen med runden. |
| **Brukerkonto** | Beholdes til du sletter kontoen, eller til prosjektet avvikles. |
| **Auth-sesjoner** | Etter innloggingsleverandørens regler (Convex Auth). |

Ved «opprett bruker for å lagre» overføres gjestedata til kontoen din før utløp; deretter gjelder kontoreglene.

## 4. Deling med andre

Vi selger ikke personopplysninger.

Data kan behandles av underleverandører som er nødvendige for driften, typisk:

- **Convex** — database, fil-storage, backend
- **Vercel** (eller tilsvarende) — hosting av webappen
- Auth-leverandør via Convex Auth

Disse behandler data etter egne avtaler / databehandleravtaler.

## 5. Bilder

- Bilder lastes opp frivillig.
- Du bør ikke laste opp bilder av andre uten samtykke.
- Gjeste-bilder slettes med gjesterunden; konto-bilder slettes ved kontosletting eller manuelt (MVP: slett via slett konto).

## 6. Dine rettigheter

Du kan be om innsyn, retting, sletting og begrensning, og klage til Datatilsynet.

- **Gjester:** data forsvinner automatisk ved utløp; du kan også avbryte og be om umiddelbar sletting i UI (MVP: «Slett denne runden»).
- **Konto:** slett konto i innstillinger (implementeres senest ved offentlig launch).

## 7. Informasjonskapsler / lokal lagring

Vi bruker lokal lagring for gjeste-token og innlogging. Ikke unødvendige markedsføringscookies i MVP.

## 8. Endringer

Vi kan oppdatere denne erklæringen. Vesentlige endringer varsles i appen eller på nettsiden. Dato nederst oppdateres.

## 9. Kontakt

E-post til behandlingsansvarlig oppgis i app-footer ved launch.

*Sist oppdatert: 2026-09-22*
