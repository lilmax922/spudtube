// Happy-dom tests must never hit the real network: better-auth derives its baseURL
// from window.location.origin (http://localhost:3000 in this environment), so its
// session calls would otherwise escape the @nuxt/test-utils mock and race real
// connections under parallel load. Rewrite localhost URLs to relative paths so the
// mock handles them deterministically (404 for unregistered endpoints).
const ORIGIN = 'http://localhost:3000'

const originalFetch = globalThis.fetch

globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  if (url.startsWith(`${ORIGIN}/`)) {
    return originalFetch(new Request(url.slice(ORIGIN.length), init))
  }
  return originalFetch(input, init)
}
