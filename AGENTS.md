# AGENTS.md — matchport-site

Public landing + pre-registration site for Matchport (www.matchport.com.mx). Astro + one React island, deployed to Cloudflare Workers with static assets; leads in Neon Postgres; Turnstile; Resend.

- Spanish-first (es-MX). User-facing copy and legal texts come from `src/content/` files — never hardcode legal text in components.
- No secrets in the repo, ever (public repository; gitleaks is a hard gate). Local secrets live in `.dev.vars` (gitignored).
- The pre-registration form collects only the approved field set; no RFC, bank data, cards or documents.
- Legal pages ship as `status: draft` until counsel approves; the `legal-gate` CI check blocks launch until then.
- Never deploy to production from a PR (`wrangler deploy` is production-only); previews never touch the production database or send real email.
- Operator context (approved plan, legal drafts, design snapshot) lives in `.private/` — gitignored, never committed.
