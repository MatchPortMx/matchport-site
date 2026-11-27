import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://www.matchport.com.mx',
  output: 'static',
  // The landing never issues sessions; prevents the adapter's auto SESSION KV binding.
  session: false,
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
    routing: { prefixDefaultLocale: false },
  },
  // Legal pages are prose — Shiki would emit CSP-incompatible inline styles.
  markdown: { syntaxHighlight: false },
  security: {
    // Astro hashes its inline hydration scripts so the React island hydrates
    // under an enforced CSP (no nonce — a static host has no per-request
    // server). Astro emits the policy as a <meta> tag owning script-src and
    // style-src. Never add a manual CSP <meta> — this is the single source
    // of truth. Turnstile + Cloudflare Insights are allowed below.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        // PR-2 audit: nothing on the page (nor the Turnstile island — its
        // widget renders inside the challenges.cloudflare.com iframe, which
        // has its own policy) uses data: images → data: removed.
        "img-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        'frame-src https://challenges.cloudflare.com',
        "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com",
      ],
      // Overrides Astro's defaults → MUST re-include 'self'.
      scriptDirective: {
        resources: [
          "'self'",
          'https://challenges.cloudflare.com',
          'https://static.cloudflareinsights.com',
        ],
      },
      // Turnstile and React inject RUNTIME inline styles that hashes cannot
      // cover, so style-src carries 'unsafe-inline' (Astro then omits style
      // hashes — a hash/nonce would disable 'unsafe-inline' anyway).
      // style-src cannot execute code; script-src stays hash-based.
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'"],
      },
    },
  },
})
