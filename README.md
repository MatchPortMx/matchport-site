# matchport-site

Public landing + pre-registration site for [Matchport](https://www.matchport.com.mx)
(B2B container-freight logistics in Mexico). Spanish-first (es-MX).

**Stack:** Astro (static output, on-demand API routes) deployed to
**Cloudflare Workers with static assets** via `@astrojs/cloudflare`, one React
island, Tailwind v4, Neon Postgres, Resend, Cloudflare Turnstile.

## Requirements

- Node 22 LTS (see `.nvmrc`)
- npm

## Setup

```sh
npm ci
```

## Scripts

| Command           | What it does                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| `npm run dev`     | local dev server                                                       |
| `npm run build`   | production build → `dist/` (incl. the `dist/_worker.js` Worker bundle) |
| `npm run preview` | preview the built site locally                                         |
| `npm run check`   | `astro check` (type checks)                                            |
| `npm run lint`    | Biome lint + format check                                              |
| `npm run format`  | Biome format (writes)                                                  |

## Secrets

Secrets never live in this repository — it is public and gitleaks runs as a
hard CI gate.

- **Local dev:** copy `.dev.vars.example` → `.dev.vars` (gitignored) and fill
  it in. `.dev.vars` is read by the local dev server only.
- **Production / preview:** the Worker's encrypted environment variables and
  secrets (Cloudflare dashboard or `wrangler secret put`). Production values
  are set at the top level of the Worker's env; preview values live in the
  Previews scope (`previews` block) — previews never touch the production
  database or send real email.

## Deploying

**`wrangler deploy` is production-only** — it uploads _and promotes_ the
Worker to production traffic. Never deploy to production from a PR. Preview
environments come from branch-isolated Workers Previews / Workers Builds.
