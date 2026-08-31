import { describe, expect, it } from 'vitest'
import {
  createDb,
  getHyperdriveConnectionString,
  resolveDatabaseUrl,
} from './index'

function makePool(databaseUrl: string) {
  const db = createDb(databaseUrl)
  const pool = db.$client
  return pool
}

function makeEvent(connectionString: string | undefined): unknown {
  if (connectionString === undefined) {
    return { context: { cloudflare: { env: {} } } }
  }
  return {
    context: {
      cloudflare: {
        env: { HYPERDRIVE: { connectionString } },
      },
    },
  }
}

describe('getHyperdriveConnectionString', () => {
  it('extracts connectionString from event.context.cloudflare.env.HYPERDRIVE', () => {
    const event = makeEvent('postgres://hyperdrive:5432/db')
    expect(getHyperdriveConnectionString(event as unknown as Parameters<typeof getHyperdriveConnectionString>[0])).toBe('postgres://hyperdrive:5432/db')
  })

  it('returns undefined for misplaced direct binding (must be env.HYPERDRIVE)', () => {
    const event = {
      context: { cloudflare: { HYPERDRIVE: { connectionString: 'postgres://direct:5432/db' } } },
    }
    expect(getHyperdriveConnectionString(event as unknown as Parameters<typeof getHyperdriveConnectionString>[0])).toBeUndefined()
  })

  it('returns undefined when no hyperdrive binding present', () => {
    expect(getHyperdriveConnectionString(makeEvent(undefined) as unknown as Parameters<typeof getHyperdriveConnectionString>[0])).toBeUndefined()
    expect(getHyperdriveConnectionString(undefined)).toBeUndefined()
    expect(getHyperdriveConnectionString({} as unknown as Parameters<typeof getHyperdriveConnectionString>[0])).toBeUndefined()
  })

  it('ignores non-string connectionString', () => {
    const event = {
      context: { cloudflare: { env: { HYPERDRIVE: { connectionString: 123 } } } },
    }
    expect(getHyperdriveConnectionString(event as unknown as Parameters<typeof getHyperdriveConnectionString>[0])).toBeUndefined()
  })
})

describe('resolveDatabaseUrl', () => {
  it('prefers hyperdrive binding over DATABASE_URL', () => {
    const prev = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgres://local:5432/db'
    const event = makeEvent('postgres://hyperdrive:5432/db')
    expect(resolveDatabaseUrl(event as unknown as Parameters<typeof resolveDatabaseUrl>[0])).toBe('postgres://hyperdrive:5432/db')
    process.env.DATABASE_URL = prev
  })

  it('falls back to DATABASE_URL when no hyperdrive binding', () => {
    const prev = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgres://fallback:5432/db'
    expect(resolveDatabaseUrl(makeEvent(undefined) as unknown as Parameters<typeof resolveDatabaseUrl>[0])).toBe('postgres://fallback:5432/db')
    expect(resolveDatabaseUrl(undefined)).toBe('postgres://fallback:5432/db')
    process.env.DATABASE_URL = prev
  })

  it('throws when neither hyperdrive nor DATABASE_URL present', () => {
    const prev = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    expect(() => resolveDatabaseUrl(makeEvent(undefined) as unknown as Parameters<typeof resolveDatabaseUrl>[0])).toThrow('DATABASE_URL is required')
    process.env.DATABASE_URL = prev
  })
})

// Regression guard: production sign-in broke (POST /api/auth/sign-in/social → 500 with an
// empty body) because the production pooler would silently swallow a write's reply — the
// INSERT committed on the server while the Worker hung on the query await until Cloudflare
// canceled the request. A Pool without client-side timeouts never surfaces that mistake:
// requests hang for the full platform timeout and the empty 500 carries no error to read.
// These tests pin the fail-fast timeouts every Pool (direct and Hyperdrive) must carry.
describe('createDb pool fail-fast timeouts', () => {
  it('sets connectionTimeoutMillis so a stuck pooler connection fails fast', () => {
    const pool = makePool('postgres://nevermind:5432/db')
    expect(pool.options.connectionTimeoutMillis).toBeGreaterThan(0)
  })

  it('sets a client-side query_timeout so a swallowed query reply cannot hang the request', () => {
    const pool = makePool('postgres://nevermind:5432/db')
    expect(pool.options.query_timeout).toBeGreaterThan(0)
  })

  it('applies timeouts to Hyperdrive-backed pools too (production path)', () => {
    const event = makeEvent('postgres://hyperdrive:5432/db')
    const db = createDb(getHyperdriveConnectionString(event as unknown as Parameters<typeof getHyperdriveConnectionString>[0])!)
    const pool = db.$client
    expect(pool.options.connectionTimeoutMillis).toBeGreaterThan(0)
    expect(pool.options.query_timeout).toBeGreaterThan(0)
  })
})
