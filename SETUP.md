# Kom i gang — fase 1

## 1. Convex-deployment

I prosjektmappen:

```bash
npx convex login
npx convex dev
```

Første gang: opprett prosjekt når CLI spør. Dette lager `.env.local` med `NEXT_PUBLIC_CONVEX_URL`.

## 2. Convex Auth-nøkler

I en annen terminal:

```bash
npm i jose
node --input-type=module <<'EOF'
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
console.log(`JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"`);
console.log(`JWKS=${jwks}`);
EOF
```

Sett variablene i Convex (bruk `--from-file` for JWT — shell-quoting ødelegger PEM ellers):

```bash
# Etter scriptet over: lim JWT-linjen inn i jwt.txt og JWKS i jwks.txt, deretter:
npx convex env set JWT_PRIVATE_KEY --from-file jwt.txt
npx convex env set JWKS --from-file jwks.txt
npx convex env set SITE_URL http://localhost:3000
rm jwt.txt jwks.txt
```

## 2b. Google-login (OAuth)

1. Åpne [Google Auth Platform](https://console.cloud.google.com/auth/overview) og opprett/velg prosjekt.
2. Konfigurer OAuth-consent (External) og legg til din e-post som testbruker.
3. **Clients → Create client → Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URI:
     `https://usable-clam-598.eu-west-1.convex.site/api/auth/callback/google`
     (bytt deployment-navn hvis du har et annet — se NEXT_PUBLIC_CONVEX_SITE_URL i `.env.local`)
4. Sett nøkler i Convex:

```bash
npx convex env set AUTH_GOOGLE_ID <client-id>
npx convex env set AUTH_GOOGLE_SECRET <client-secret>
```

## 3. Seed barer

Mens `convex dev` kjører:

```bash
npx convex run seed:seedDatabase
```

## 3b. Google Places sync (valgfritt, fase 1.5)

Oppdaterer `rating`, `ratingCount`, `openingHours` og adresse — **ikke** `beerPrice`.

1. Aktiver [Places API (New)](https://console.cloud.google.com/apis/library/places.googleapis.com) og lag en API-nøkkel.
2. Sett nøkkelen i Convex:

```bash
npx convex env set GOOGLE_PLACES_API_KEY <nøkkel>
```

3. Knytt place id til barer (gjenta per sted):

```bash
npx convex run placesSync:setGooglePlaceId '{"name":"Work-Work","googlePlaceId":"ChIJ…"}'
```

4. Kjør sync manuelt (eller vent på ukentlig cron):

```bash
npx convex run placesSyncActions:syncAll
```

## 4. Frontend

```bash
npm run dev:frontend
```

Åpne http://localhost:3000 — **Klar for kaos** / start kvelden (uten konto).

## Scripts

| Kommando | Hva |
|----------|-----|
| `npm run dev:frontend` | Next.js |
| `npm run dev:backend` | Convex watch |
| `npm run dev` | Begge (krever at Convex allerede er konfigurert) |
