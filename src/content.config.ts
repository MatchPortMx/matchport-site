import { defineCollection, z } from 'astro:content'
import { file, glob } from 'astro/loaders'
import { landingCopySchema } from './lib/copy-schema'

/**
 * Content collections (Spanish-first, §6.3): all user-facing copy and the
 * legal documents live here so text swaps without code changes.
 *
 * - `legal` — aviso de privacidad + términos, seeded from the LP-1 draft
 *   (`status: draft` until counsel approves; the legal-gate CI check blocks
 *   launch while any doc is not `approved`).
 * - `copy` — the landing page strings (`landing.es.json`).
 * - `email` — transactional email bodies (Resend templates, wired in PR-6).
 */

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string().min(1),
    /** e.g. AP-INT-2026-11-v0.1 — stamped into the consent record. */
    version: z.string().min(1),
    status: z.enum(['draft', 'approved']),
    approved_by: z.string().optional(),
    approved_date: z.string().optional(),
  }),
})

const copy = defineCollection({
  loader: file('src/content/copy/landing.es.json'),
  schema: landingCopySchema,
})

const email = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/email' }),
  schema: z.object({
    title: z.string().min(1),
    /** e.g. EMAIL-2026-11-v0.1. */
    version: z.string().min(1),
    status: z.enum(['draft', 'approved']),
    subject: z.string().min(1),
  }),
})

export const collections = { legal, copy, email }
