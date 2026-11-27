import { z } from 'zod'

/**
 * Shared pre-registration field rules — the OPERATOR-LOCKED bridge contract
 * (plan §5 / decision D8).
 *
 * Used by the React island for CLIENT-side validation today, and re-used
 * server-side by `/api/pre-register` in PR-5 (which composes the Turnstile
 * token on top of this base schema). Keep the field set exactly as locked:
 * no RFC, no bank data, no cards, no documents anywhere.
 */

export const ROLE_HINTS = [
  'transportista_empresa',
  'transportista_independiente',
  'forwarder',
  'agencia_aduanal',
] as const

export const VOLUMEN_VALUES = ['1-20', '21-80', '81-200', '200+'] as const

export type RoleHint = (typeof ROLE_HINTS)[number]
export type VolumenValue = (typeof VOLUMEN_VALUES)[number]

export const preRegisterSchema = z
  .object({
    role_hint: z.enum(ROLE_HINTS),
    full_name: z.string().trim().min(2).max(120),
    company_name: z.string().trim().min(1).max(160).optional(),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z
      .string()
      .trim()
      .regex(/^\+?52\s?\d{10}$/)
      .transform((s) => s.replace(/\s/g, '')),
    tractocamiones: z.coerce.number().int().min(0).max(100000).optional(),
    gps: z.boolean().optional(),
    volumen: z.enum(VOLUMEN_VALUES).optional(),
    /** Required consent — the checkbox must be pre-unchecked (LP-1 §5.1). */
    consent_aviso: z.literal(true),
    /** Required consent — pre-unchecked (LP-1 §5.1). */
    consent_terms: z.literal(true),
    /** Optional, separate marketing opt-in — never bundled (LP-1 §5.1). */
    consent_marketing: z.boolean().default(false),
    /** Honeypot — must stay empty (bots that fill it are dropped). */
    honeypot: z.string().max(0).optional(),
    /** Epoch ms time-trap (client-supplied; weak layer only — 🔐L1). */
    form_rendered_at: z.coerce.number().int(),
  })
  .strict()
  .superRefine((v, ctx) => {
    // company_name is required for every role except transportista_independiente
    if (v.role_hint !== 'transportista_independiente' && !v.company_name) {
      ctx.addIssue({
        code: 'custom',
        path: ['company_name'],
        message: 'required',
      })
    }
  })

export type PreRegisterInput = z.input<typeof preRegisterSchema>
export type PreRegister = z.output<typeof preRegisterSchema>
