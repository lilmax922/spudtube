import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'

// Helpers to mimic what @nuxtjs/sitemap and @nuxtjs/robots would emit
// based on nuxt.config's sitemap/robots options. These are intentionally
// minimal but faithful to the spec: sitemap contains only "/" and
// robots points at /sitemap.xml and disallows /search and /my-list.

function buildSitemapXml(siteUrl: string, urls: string[]): string {
  const entries = urls.map(url => `  <url><loc>${siteUrl.replace(/\/$/, '')}${url}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`
}

function buildRobotsTxt(siteUrl: string, sitemapPath: string, disallow: string[]): string {
  const lines = ['User-agent: *', 'Allow: /']
  for (const p of disallow) lines.push(`Disallow: ${p}`)
  lines.push(`Sitemap: ${siteUrl.replace(/\/$/, '')}${sitemapPath}`)
  return `${lines.join('\n')}\n`
}

function readNuxtConfigText(): string {
  // avoid static import of nuxt.config to keep `nuxt typecheck` green
  // (site/sitemap/robots augmentations are runtime-only)
  const p = resolve(import.meta.dirname ?? '.', '../nuxt.config.ts')
  try {
    return readFileSync(p, 'utf8')
  }
  catch {
    return readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf8')
  }
}

describe('sEO: nuxt.config sitemap & robots', () => {
  const text = readNuxtConfigText()

  it('sitemap is static-min: only "/"', () => {
    expect(text).toContain('urls: [\'/\']')
    expect(text).toContain('excludeAppSources: true')
  })

  it('sitemap excludes /search and /my-list (and wildcards)', () => {
    expect(text).toContain('\'/search\'')
    expect(text).toContain('\'/search/**\'')
    expect(text).toContain('\'/my-list\'')
    expect(text).toContain('\'/my-list/**\'')
    expect(text).toMatch(/exclude:\s*\[.*\/search.*\/my-list/s)
  })

  it('robots points at /sitemap.xml', () => {
    expect(text).toContain('sitemap: \'/sitemap.xml\'')
  })

  it('robots disallows /search and /my-list', () => {
    expect(text).toMatch(/disallow:\s*\[.*\/search.*\/my-list/s)
    expect(text).not.toMatch(/disallow:\s*\[.*'\/'.*\]/)
  })

  it('routeRules mark /search and /my-list as noindex,nofollow', () => {
    expect(text).toContain('\'/search\': { robots: \'noindex, nofollow\' }')
    expect(text).toContain('\'/search/**\': { robots: \'noindex, nofollow\' }')
    expect(text).toContain('\'/my-list\': { robots: \'noindex, nofollow\' }')
    expect(text).toContain('\'/my-list/**\': { robots: \'noindex, nofollow\' }')
  })

  it('site url is set for canonical generation', () => {
    expect(text).toMatch(/site:\s*\{[^}]*url:/)
    expect(text).toMatch(/https:\/\/spudtube\.pages\.dev/)
  })
})

describe('sEO HTTP seam: /sitemap.xml and /robots.txt', () => {
  const siteUrl = 'https://spudtube.pages.dev'
  const sitemapUrls = ['/']
  const robotsDisallow = ['/search', '/my-list']
  const robotsSitemap = '/sitemap.xml'

  const sitemapXml = buildSitemapXml(siteUrl, sitemapUrls)
  const robotsTxt = buildRobotsTxt(siteUrl, robotsSitemap, robotsDisallow)

  const app = createApp()
  app.use('/sitemap.xml', defineEventHandler((event) => {
    event.node.res.setHeader('content-type', 'application/xml')
    return sitemapXml
  }))
  app.use('/robots.txt', defineEventHandler((event) => {
    event.node.res.setHeader('content-type', 'text/plain')
    return robotsTxt
  }))
  const fetch = toWebHandler(app)

  it('gET /sitemap.xml contains only "/" and excludes /search and /my-list', async () => {
    const res = await fetch(new Request('http://localhost/sitemap.xml'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/xml/)
    const body = await res.text()
    // must contain canonical homepage
    expect(body).toContain(`${siteUrl.replace(/\/$/, '')}/`)
    expect(body).toContain('<loc>')
    // must not contain disallowed routes
    expect(body).not.toContain('/search')
    expect(body).not.toContain('/my-list')
    // only one url entry for minimal sitemap
    const locCount = (body.match(/<loc>/g) ?? []).length
    expect(locCount).toBe(1)
  })

  it('gET /sitemap.xml is valid XML urlset', async () => {
    const res = await fetch(new Request('http://localhost/sitemap.xml'))
    const body = await res.text()
    expect(body).toMatch(/<\?xml/)
    expect(body).toMatch(/<urlset/)
    expect(body).toMatch(/<\/urlset>/)
  })

  it('gET /robots.txt contains Sitemap: /sitemap.xml', async () => {
    const res = await fetch(new Request('http://localhost/robots.txt'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/plain/)
    const body = await res.text()
    // should point at absolute sitemap url with site origin
    expect(body).toMatch(/Sitemap:\s*https?:\/\/.*\/sitemap\.xml/)
    // relative form also acceptable if present
    expect(body.includes('Sitemap:') && body.includes('/sitemap.xml')).toBe(true)
  })

  it('gET /robots.txt disallows /search and /my-list, allows public', async () => {
    const res = await fetch(new Request('http://localhost/robots.txt'))
    const body = await res.text()
    expect(body).toMatch(/User-agent:\s*\*/)
    expect(body).toMatch(/Allow:\s*\//)
    expect(body).toMatch(/Disallow:\s*\/search/)
    expect(body).toMatch(/Disallow:\s*\/my-list/)
    // must not blanket disallow
    expect(body).not.toMatch(/Disallow:\s*\/\s*\n/)
  })
})
