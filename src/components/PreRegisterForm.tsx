import { Turnstile } from '@marsidev/react-turnstile'
import type { FormEvent } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import type { LandingCopy } from '../lib/copy-schema'
import { preRegisterSchema, type RoleHint } from '../lib/schema'

/**
 * Pre-registration form island (plan §7 PR-2).
 *
 * - Field set per the OPERATOR-LOCKED bridge contract (§5 / D8) — no RFC, no
 *   bank data, no cards, no documents.
 * - Client-side validation mirrors the shared zod schema (src/lib/schema.ts);
 *   PR-5 re-uses the same module server-side and composes the Turnstile token.
 * - PR-2 has NO network submit: the button runs validation only and shows a
 *   neutral "envío disponible próximamente" state (no fetch anywhere).
 * - Honeypot + hidden form_rendered_at are rendered and validated, ready for
 *   the server-side abuse checks (PR-5).
 *
 * All visible copy comes from landing.es.json via props — no hardcoded text.
 */

/** Cloudflare's documented always-pass test sitekey (developers.cloudflare.com/turnstile/troubleshooting/testing). */
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'

const CARRIER_ROLES: RoleHint[] = [
  'transportista_empresa',
  'transportista_independiente',
]

interface FormValues {
  role_hint: string
  company_name: string
  full_name: string
  email: string
  phone: string
  tractocamiones: string
  gps: boolean | undefined
  volumen: string
  consent_aviso: boolean
  consent_terms: boolean
  consent_marketing: boolean
  honeypot: string
}

type FieldErrors = Partial<Record<string, string>>

const FIELD_ORDER = [
  'role_hint',
  'company_name',
  'full_name',
  'email',
  'phone',
  'tractocamiones',
  'gps',
  'volumen',
  'consent_aviso',
  'consent_terms',
] as const

const INITIAL_VALUES: FormValues = {
  role_hint: '',
  company_name: '',
  full_name: '',
  email: '',
  phone: '',
  tractocamiones: '',
  gps: undefined,
  volumen: '',
  consent_aviso: false,
  consent_terms: false,
  consent_marketing: false,
  honeypot: '',
}

/**
 * Turnstile sitekey: the env value when set; in dev, Cloudflare's documented
 * always-pass test key when unset; unset in a non-dev build → the visible
 * "configuración pendiente" notice (the production fail-closed guard is PR-5).
 */
function resolveTurnstileSiteKey(): string | undefined {
  const key = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY
  if (typeof key === 'string' && key !== '') return key
  if (import.meta.env.DEV) return TURNSTILE_TEST_SITE_KEY
  return undefined
}

export default function PreRegisterForm({ copy }: { copy: LandingCopy }) {
  const form = copy.form
  const messages = copy.messages

  const uid = useId()
  const fid = (name: string) => `${uid}-${name}`
  const errId = (field: string) => `${uid}-${field}-error`

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [validated, setValidated] = useState(false)
  const statusRef = useRef<HTMLDivElement | null>(null)
  const renderedAtRef = useRef(Date.now())
  const turnstileTokenRef = useRef<string | undefined>(undefined)
  const siteKey = resolveTurnstileSiteKey()

  useEffect(() => {
    if (validated) statusRef.current?.focus()
  }, [validated])

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const isIndependiente = values.role_hint === 'transportista_independiente'
  const isCarrier = CARRIER_ROLES.includes(values.role_hint as RoleHint)
  const companyLabel = isIndependiente
    ? form.company.label_independiente
    : form.company.label

  function messageFor(field: string): string {
    switch (field) {
      case 'email':
        return values.email === '' ? messages.required : messages.email_invalid
      case 'phone':
        return values.phone.replace(/\D/g, '') === ''
          ? messages.required
          : messages.phone_invalid
      case 'tractocamiones':
        return messages.number_invalid
      case 'consent_aviso':
      case 'consent_terms':
        return messages.consent_required
      default:
        return messages.required
    }
  }

  function buildPayload(): Record<string, unknown> {
    const phoneDigits = values.phone.replace(/\D/g, '')
    return {
      role_hint: values.role_hint === '' ? undefined : values.role_hint,
      full_name: values.full_name,
      company_name:
        isIndependiente && values.company_name === ''
          ? undefined
          : values.company_name,
      email: values.email,
      phone: phoneDigits === '' ? values.phone : `+52${phoneDigits}`,
      tractocamiones:
        values.tractocamiones === '' ? undefined : values.tractocamiones,
      gps: values.gps,
      volumen: values.volumen === '' ? undefined : values.volumen,
      consent_aviso: values.consent_aviso,
      consent_terms: values.consent_terms,
      consent_marketing: values.consent_marketing,
      honeypot: values.honeypot,
      form_rendered_at: renderedAtRef.current,
    }
  }

  function fieldInputId(field: string): string {
    const firstRole = form.roles.options[0]?.value ?? ''
    const firstGps = String(form.gps.options[0]?.value ?? '')
    const firstVolumen = form.volumen.options[0]?.value ?? ''
    switch (field) {
      case 'role_hint':
        return `${fid('role')}-${firstRole}`
      case 'company_name':
        return fid('company')
      case 'full_name':
        return fid('full-name')
      case 'email':
        return fid('email')
      case 'phone':
        return fid('phone')
      case 'tractocamiones':
        return fid('tractocamiones')
      case 'gps':
        return `${fid('gps')}-${firstGps}`
      case 'volumen':
        return `${fid('volumen')}-${firstVolumen}`
      case 'consent_aviso':
        return fid('consent-aviso')
      case 'consent_terms':
        return fid('consent-terms')
      default:
        return fid(field)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = preRegisterSchema.safeParse(buildPayload())
    if (!result.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && nextErrors[key] === undefined) {
          nextErrors[key] = messageFor(key)
        }
      }
      setErrors(nextErrors)
      setValidated(false)
      const first = FIELD_ORDER.find((field) => nextErrors[field] !== undefined)
      if (first !== undefined) {
        document.getElementById(fieldInputId(first))?.focus()
      }
      return
    }
    setErrors({})
    setValidated(true)
  }

  function inputProps(field: string) {
    return {
      'aria-invalid': errors[field] !== undefined ? true : undefined,
      'aria-describedby':
        errors[field] !== undefined ? errId(field) : undefined,
    }
  }

  function fieldError(field: string, className?: string) {
    if (errors[field] === undefined) return null
    return (
      <p
        className={className ?? 'field-error'}
        id={errId(field)}
        aria-live="polite"
      >
        {errors[field]}
      </p>
    )
  }

  const cb = form.checkboxes

  return (
    <form className="form-island" noValidate onSubmit={handleSubmit}>
      {/* honeypot — off-screen, hidden from AT, never announced */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor={fid('hp')}>No completar este campo</label>
        <input
          id={fid('hp')}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.honeypot}
          onChange={(e) => setField('honeypot', e.currentTarget.value)}
        />
      </div>
      {/* time-trap epoch ms (client-supplied; weak layer only) */}
      <input
        type="hidden"
        name="form_rendered_at"
        value={renderedAtRef.current}
      />

      {/* tipo de participante (D8 role_hint) */}
      <fieldset
        className="field"
        aria-describedby={
          errors.role_hint !== undefined ? errId('role_hint') : undefined
        }
      >
        <legend>
          {form.roles.legend}{' '}
          <span className="req" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="tipo-group">
          {form.roles.options.map((option) => {
            const icon =
              option.value === 'transportista_empresa' ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              ) : option.value === 'transportista_independiente' ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              ) : option.value === 'forwarder' ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              )
            return (
              <div className="tipo-option" key={option.value}>
                <input
                  type="radio"
                  name="role_hint"
                  id={`${fid('role')}-${option.value}`}
                  value={option.value}
                  checked={values.role_hint === option.value}
                  onChange={() => setField('role_hint', option.value)}
                />
                <label htmlFor={`${fid('role')}-${option.value}`}>
                  {icon}
                  {option.label}
                </label>
              </div>
            )
          })}
        </div>
        {fieldError('role_hint')}
      </fieldset>

      {/* empresa / razón social + contacto */}
      <div className="field-row">
        <div className="field">
          <label htmlFor={fid('company')}>
            {companyLabel}{' '}
            {isIndependiente ? (
              <span className="opt">{form.optional}</span>
            ) : (
              <span className="req" aria-hidden="true">
                *
              </span>
            )}
          </label>
          <div className="input-wrap">
            <span className="icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"></path>
              </svg>
            </span>
            <input
              type="text"
              id={fid('company')}
              autoComplete="organization"
              placeholder={form.company.placeholder}
              value={values.company_name}
              {...inputProps('company_name')}
              onChange={(e) => setField('company_name', e.currentTarget.value)}
            />
          </div>
          {fieldError('company_name')}
        </div>

        <div className="field">
          <label htmlFor={fid('full-name')}>
            {form.full_name.label}{' '}
            <span className="req" aria-hidden="true">
              *
            </span>
          </label>
          <div className="input-wrap">
            <span className="icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <input
              type="text"
              id={fid('full-name')}
              autoComplete="name"
              placeholder={form.full_name.placeholder}
              value={values.full_name}
              {...inputProps('full_name')}
              onChange={(e) => setField('full_name', e.currentTarget.value)}
            />
          </div>
          {fieldError('full_name')}
        </div>
      </div>

      {/* correo */}
      <div className="field">
        <label htmlFor={fid('email')}>
          {form.email.label}{' '}
          <span className="req" aria-hidden="true">
            *
          </span>
        </label>
        <div className="input-wrap">
          <span className="icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </span>
          <input
            type="email"
            id={fid('email')}
            autoComplete="email"
            placeholder={form.email.placeholder}
            value={values.email}
            {...inputProps('email')}
            onChange={(e) => setField('email', e.currentTarget.value)}
          />
        </div>
        {fieldError('email')}
      </div>

      {/* teléfono (+52, WhatsApp) */}
      <div className="field">
        <label htmlFor={fid('phone')}>
          {form.phone.label}{' '}
          <span className="req" aria-hidden="true">
            *
          </span>
        </label>
        <div className="input-wrap">
          <span className="icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17.92z"></path>
            </svg>
          </span>
          <div className="phone-group">
            <span className="phone-prefix">+52</span>
            <input
              type="tel"
              id={fid('phone')}
              autoComplete="tel-national"
              placeholder={form.phone.placeholder}
              value={values.phone}
              {...inputProps('phone')}
              onChange={(e) => setField('phone', e.currentTarget.value)}
            />
          </div>
        </div>
        <p className="wa-note">
          <span className="wa-dot" aria-hidden="true"></span>
          {form.phone.hint}
        </p>
        {fieldError('phone')}
      </div>

      {/* tractocamiones (carriers only, D8) + GPS */}
      {isCarrier && (
        <div className="field-row">
          <div className="field">
            <label htmlFor={fid('tractocamiones')}>
              {form.tractocamiones.label}{' '}
              <span className="opt">{form.optional}</span>
            </label>
            <div className="input-wrap">
              <span className="icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </span>
              <input
                type="number"
                id={fid('tractocamiones')}
                inputMode="numeric"
                min="0"
                max="100000"
                step="1"
                placeholder={form.tractocamiones.placeholder}
                value={values.tractocamiones}
                {...inputProps('tractocamiones')}
                onChange={(e) =>
                  setField('tractocamiones', e.currentTarget.value)
                }
              />
            </div>
            {fieldError('tractocamiones')}
          </div>

          <fieldset
            className="field"
            aria-describedby={
              errors.gps !== undefined ? errId('gps') : undefined
            }
          >
            <legend>
              {form.gps.legend} <span className="opt">{form.optional}</span>
            </legend>
            <div className="gps-group">
              {form.gps.options.map((option) => (
                <div className="gps-option" key={String(option.value)}>
                  <input
                    type="radio"
                    name="gps"
                    id={`${fid('gps')}-${String(option.value)}`}
                    value={String(option.value)}
                    checked={values.gps === option.value}
                    onChange={() => setField('gps', option.value)}
                  />
                  <label htmlFor={`${fid('gps')}-${String(option.value)}`}>
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            {fieldError('gps')}
          </fieldset>
        </div>
      )}

      {!isCarrier && (
        <fieldset
          className="field"
          aria-describedby={errors.gps !== undefined ? errId('gps') : undefined}
        >
          <legend>
            {form.gps.legend} <span className="opt">{form.optional}</span>
          </legend>
          <div className="gps-group">
            {form.gps.options.map((option) => (
              <div className="gps-option" key={String(option.value)}>
                <input
                  type="radio"
                  name="gps"
                  id={`${fid('gps')}-${String(option.value)}`}
                  value={String(option.value)}
                  checked={values.gps === option.value}
                  onChange={() => setField('gps', option.value)}
                />
                <label htmlFor={`${fid('gps')}-${String(option.value)}`}>
                  {option.label}
                </label>
              </div>
            ))}
          </div>
          {fieldError('gps')}
        </fieldset>
      )}

      {/* volumen de viajes/mes */}
      <fieldset
        className="field"
        aria-describedby={
          errors.volumen !== undefined ? errId('volumen') : undefined
        }
      >
        <legend>
          {form.volumen.legend} <span className="opt">{form.optional}</span>
        </legend>
        <div className="volumen-group">
          {form.volumen.options.map((option) => (
            <div className="volumen-option" key={option.value}>
              <input
                type="radio"
                name="volumen"
                id={`${fid('volumen')}-${option.value}`}
                value={option.value}
                checked={values.volumen === option.value}
                onChange={() => setField('volumen', option.value)}
              />
              <label htmlFor={`${fid('volumen')}-${option.value}`}>
                {option.label}
              </label>
            </div>
          ))}
        </div>
        {fieldError('volumen')}
      </fieldset>

      {/* consent checkboxes (LP-1 §5.1 — required aviso + terms, optional marketing, all pre-unchecked) */}
      <div className="checkbox-group">
        <div className="checkbox-field">
          <input
            id={fid('consent-aviso')}
            type="checkbox"
            checked={values.consent_aviso}
            {...inputProps('consent_aviso')}
            onChange={(e) => setField('consent_aviso', e.currentTarget.checked)}
          />
          <label htmlFor={fid('consent-aviso')}>
            {cb.aviso.prefix} <a href="/aviso-de-privacidad">{cb.aviso.link}</a>
            .
          </label>
        </div>
        {fieldError('consent_aviso', 'checkbox-error')}

        <div className="checkbox-field">
          <input
            id={fid('consent-terms')}
            type="checkbox"
            checked={values.consent_terms}
            {...inputProps('consent_terms')}
            onChange={(e) => setField('consent_terms', e.currentTarget.checked)}
          />
          <label htmlFor={fid('consent-terms')}>
            {cb.terms.prefix} <a href="/terminos">{cb.terms.link}</a>.
          </label>
        </div>
        {fieldError('consent_terms', 'checkbox-error')}

        <div className="checkbox-field">
          <input
            id={fid('consent-marketing')}
            type="checkbox"
            checked={values.consent_marketing}
            onChange={(e) =>
              setField('consent_marketing', e.currentTarget.checked)
            }
          />
          <label htmlFor={fid('consent-marketing')}>{cb.marketing.label}</label>
        </div>
        <p className="checkbox-hint">{cb.marketing.hint}</p>
      </div>

      {/* Turnstile — script + iframe come from challenges.cloudflare.com (CSP-allowed) */}
      <div className="turnstile-wrap">
        <span className="turnstile-label">{form.turnstile.label}</span>
        {siteKey !== undefined ? (
          <Turnstile
            siteKey={siteKey}
            options={{ language: 'es', theme: 'light' }}
            onSuccess={(token: string) => {
              // PR-5 will submit this token with the payload; PR-2 stores it only.
              turnstileTokenRef.current = token
            }}
          />
        ) : (
          <p className="turnstile-pending" role="note">
            {form.turnstile.pending}
          </p>
        )}
      </div>

      <button type="submit" className="btn-submit">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        {form.submit}
      </button>

      {/* PR-2: validation-only submit — neutral state, NO fetch */}
      {validated && (
        <div
          className="form-status"
          role="status"
          tabIndex={-1}
          ref={statusRef}
        >
          <p className="form-status-title">
            {messages.submit_unavailable_title}
          </p>
          <p className="form-status-body">{messages.submit_unavailable_body}</p>
        </div>
      )}
    </form>
  )
}
