// Shared TMDB error surface. Kept in its own module so both the API client
// and the TTL cache can raise it without a client<->cache import cycle.
// Routes map status >= 500 to a clean 502 (see discover.get.ts).
export class TmdbApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'TmdbApiError'
  }
}
