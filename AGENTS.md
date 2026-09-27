# AGENTS.md — BTB (Bar-til-bar)

Du jobber i et **spec-drevet** prosjekt. Les specs før du skriver kode.

## Source of truth

Alt under [`specs/`](specs/README.md):

1. [Product](specs/01-product.md)
2. [Tech stack](specs/02-tech-stack.md)
3. [Data model](specs/03-data-model.md)
4. [Features](specs/04-features.md)
5. [Design](specs/05-design.md)
6. [Roadmap](specs/06-roadmap.md)
7. [Disclaimer](specs/07-disclaimer.md)
8. [Privacy](specs/08-privacy.md)

## Regler for agenten

1. **Følg nåværende fase** i roadmap (fase 1 = solo MVP). Ikke implementer gruppe/konkurranse «fordi det er greit å ha».
2. **Endre spec før scope-creep** — hvis brukeren ber om noe utenfor fase, oppdater spec/roadmap først (eller spør).
3. **Stack er låst:** Next.js + Convex + Convex Auth + Tailwind.
4. **Datamodell:** tidsstempler, `mode`, `guestSessions` + utløp, estimat-felter — fra start.
5. **Design:** [05-design.md](specs/05-design.md) — **BTB**, Lucide, «Vi overlevde», unngå AI-klisjeer.
6. **UI Skills:** før UI-arbeid, `npx ui-skills` via [`.cursor/skills/ui-skills`](.cursor/skills/ui-skills). Specs overstyrer skill-defaults.
7. **Convex-praksis:** validators, auth **eller** gyldig gjeste-token, indekser, await, ingen `Date.now()` i queries.
8. **Språk i UI:** norsk bokmål. Domene: BTB, utfordringer, «Vi overlevde» / «Klar for kaos» — ikke school-/øving-tema.
9. **Tone:** inkluderende studenthumor (20–25); se product-spec.
10. **Gjest:** kan fullføre uten konto; recap; data slettes dagen etter; lagring = claim til bruker.

## Når du er usikker

Prioriter: product-prinsipper → features-scope → data-model → design. Spør brukeren heller enn å gjette utenfor fase.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
