import type { APIRoute } from 'astro'

/**
 * Prerendered sitemap — home + the two legal pages only (plan §6.2).
 * The legal pages are `noindex` while `status: draft`, but remain listed so
 * crawlers discover them; the draft banner + noindex meta prevent indexing
 * until counsel approves.
 */

export const prerender = true

const SITE = 'https://www.matchport.com.mx'
const PATHS = ['/', '/aviso-de-privacidad', '/terminos']

export const GET: APIRoute = () => {
  const urls = PATHS.map((path) => `  <url><loc>${SITE}${path}</loc></url>`)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
