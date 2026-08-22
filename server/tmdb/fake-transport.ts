import type { FetchJson } from './client'

export interface RecordedRequest {
  url: string
  headers: Record<string, string>
  params: Record<string, string>
}

export function createFakeTransport(
  routes: Record<string, unknown>,
): { fetchJson: FetchJson, requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = []
  const fetchJson: FetchJson = async (url, init) => {
    const parsed = new URL(url)
    const payload = routes[parsed.pathname]
    if (!payload)
      throw new Error(`unexpected path ${parsed.pathname}`)
    requests.push({
      url: parsed.origin + parsed.pathname,
      headers: init?.headers ?? {},
      params: Object.fromEntries(parsed.searchParams.entries()),
    })
    return payload
  }
  return { fetchJson, requests }
}
