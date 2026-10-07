---
name: ui-skills
description: >-
  Before UI-related work, route via npx ui-skills to the smallest useful skill
  set. Use when building, polishing, or reviewing frontend UI in this project.
---

# UI Skills (project)

Before UI-related work in this repo, route through [UI Skills](https://www.ui-skills.com/).

## Project overrides (always win)

Project specs beat generic skill defaults:

- Colors: `--bg #121212`, `--brand #CC3F0C` — see `specs/05-design.md`
- Brand: **BtB** (Bar-til-bar); copy: utfordringer / «Vi overlevde» / «Klar for kaos»
- Icons: Lucide (`lucide-react`) only
- Stack: Next.js App Router + Tailwind + Convex
- Copy: norsk bokmål in UI
- Guest OK without account; recap; data deleted next day unless claimed

If a fetched skill suggests conflicting tokens, fonts, or icon libraries, follow `specs/` instead.

## Protocol

1. Decide if the task is UI-related. If not: no skill needed.
2. If the goal is unclear, ask one short question.
3. Identify category → inspect CLI → pick the smallest useful skill set (prefer 1, max 3).
4. Load skill(s) with `npx ui-skills get <slug>`, then implement.

## CLI

```bash
npx ui-skills start
npx ui-skills categories
npx ui-skills list --category <category>
npx ui-skills get <slug>
```

## Defaults for this app

| Situasjon | Start her |
|-----------|-----------|
| Rask polish / anti-slop | lokal `baseline-ui.md` eller `npx ui-skills get baseline-ui` |
| Ny UI / estetikk | lokal skill `frontend-design` |
| Landing | lokal skill `landing-page` |
| A11y / UX-review | lokal skill `web-design-guidelines` |
| Motion | `npx ui-skills list --category motion` |
| Usikker | `npx ui-skills start` og følg routing |

## Speilet lokalt

| Skill | Path |
|-------|------|
| Routing + overrides | `.cursor/skills/ui-skills/` |
| baseline-ui | `.cursor/skills/ui-skills/baseline-ui.md` |
| frontend-design | `.cursor/skills/frontend-design/` |
| landing-page | `.cursor/skills/landing-page/` |
| web-design-guidelines | `.cursor/skills/web-design-guidelines/` |

