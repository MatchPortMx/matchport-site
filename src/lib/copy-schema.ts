import { z } from 'zod'

/**
 * Schema for `src/content/copy/landing.es.json` — every user-facing string on
 * the landing page (hero, benefits, form labels, consent checkboxes,
 * messages, footer placeholders).
 *
 * The React island receives this object as serialized props, so it must stay
 * plain JSON. The content collection validates the file at build time; the
 * island imports the inferred TYPE only (type-only import, erased at compile
 * time), keeping `astro:content` out of the client bundle.
 */

const roleOptionSchema = z.object({
  value: z.enum([
    'transportista_empresa',
    'transportista_independiente',
    'forwarder',
    'agencia_aduanal',
  ]),
  label: z.string().min(1),
})

const volumenOptionSchema = z.object({
  value: z.enum(['1-20', '21-80', '81-200', '200+']),
  label: z.string().min(1),
})

export const landingCopySchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  hero: z.object({
    eyebrow: z.string().min(1),
    headline: z.string().min(1),
    /** Word inside the headline rendered in the brand's accent color. */
    highlight: z.string().min(1),
    subheadline: z.string().min(1),
    /** Pre-launch line shown where a live counter would be (LP-1 §7.2). */
    prelaunch: z.string().min(1),
  }),
  benefits: z
    .array(
      z.object({ title: z.string().min(1), description: z.string().min(1) }),
    )
    .min(1),
  form: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    submit: z.string().min(1),
    /** Suffix appended to labels of optional fields. */
    optional: z.string().min(1),
    roles: z.object({
      legend: z.string().min(1),
      options: z.array(roleOptionSchema).min(1),
    }),
    company: z.object({
      label: z.string().min(1),
      /** Label used when role_hint is transportista_independiente (D8). */
      label_independiente: z.string().min(1),
      placeholder: z.string(),
    }),
    full_name: z.object({ label: z.string().min(1), placeholder: z.string() }),
    email: z.object({ label: z.string().min(1), placeholder: z.string() }),
    phone: z.object({
      label: z.string().min(1),
      placeholder: z.string(),
      hint: z.string().min(1),
    }),
    tractocamiones: z.object({
      label: z.string().min(1),
      placeholder: z.string(),
    }),
    gps: z.object({
      legend: z.string().min(1),
      options: z
        .array(z.object({ value: z.boolean(), label: z.string().min(1) }))
        .min(1),
    }),
    volumen: z.object({
      legend: z.string().min(1),
      options: z.array(volumenOptionSchema).min(1),
    }),
    checkboxes: z.object({
      aviso: z.object({ prefix: z.string().min(1), link: z.string().min(1) }),
      terms: z.object({ prefix: z.string().min(1), link: z.string().min(1) }),
      marketing: z.object({
        label: z.string().min(1),
        hint: z.string().min(1),
      }),
    }),
    turnstile: z.object({
      label: z.string().min(1),
      pending: z.string().min(1),
    }),
  }),
  simplified_aviso: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    link_text: z.string().min(1),
    link_note: z.string().min(1),
  }),
  messages: z.object({
    required: z.string().min(1),
    email_invalid: z.string().min(1),
    phone_invalid: z.string().min(1),
    number_invalid: z.string().min(1),
    consent_required: z.string().min(1),
    success: z.string().min(1),
    captcha_failed: z.string().min(1),
    rate_limited: z.string().min(1),
    server_error: z.string().min(1),
    link_invalid: z.string().min(1),
    submit_unavailable_title: z.string().min(1),
    submit_unavailable_body: z.string().min(1),
  }),
  legal_ui: z.object({
    draft_banner: z.string().min(1),
    version_label: z.string().min(1),
    back_home: z.string().min(1),
  }),
  footer: z.object({
    razon_social: z.string().min(1),
    domicilio: z.string().min(1),
    correo_privacidad: z.string().min(1),
    correo_contacto: z.string().min(1),
    whatsapp: z.string().min(1),
    links: z.object({ aviso: z.string().min(1), terminos: z.string().min(1) }),
  }),
})

export type LandingCopy = z.infer<typeof landingCopySchema>
