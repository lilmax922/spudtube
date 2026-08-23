import { describe, expect, it } from 'vitest'
import {
  getHyperdriveConnectionString,
  resolveDatabaseUrl,
} from './index'

function makeEvent(connectionString: string | undefined, variant: 'env' | 'direct' = 'env'): unknown {
  if (connectionString === undefined) {
    return { context: { cloudflare: { env: {} } } }
  }
  if (variant === 'env') {
    return {
      context: {
        cloudflare: {
          env: { HYPERDRIVE: { connectionString } },
        },
      },
    }
  }
  return {
    context: {
      cloudflare: {
        HYPERDRIVE: { connectionString },
      },
    },
  }
}

describe('getHyperdriveConnectionString', () => {
  it('extracts connectionString from event.context.cloudflare.env.HYPERDRIVE', () => {
    const event = makeEvent('postgres://hyperdrive:5432/db', 'env')
    expect(getHyperdriveConnectionString(event as Parameters<typeof getHyperdriveConnectionString>[0])).toBe('postgres://hyperdrive:5432/db')
  })

  it('extracts from event.context.cloudflare.HYPERDRIVE (direct binding)', () => {
    const event = makeEvent('postgres://direct:5432/db', 'direct')
    expect(getHyperdriveConnectionString(event as Parameters<typeof getHyperdriveConnectionString>[0])).toBe('postgres://direct:5432/db')
  })

  it('returns undefined when no hyperdrive binding present', () => {
    expect(getHyperdriveConnectionString(makeEvent(undefined) as Parameters<typeof getHyperdriveConnectionString>[0])).toBeUndefined()
    expect(getHyperdriveConnectionString(undefined)).toBeUndefined()
    expect(getHyperdriveConnectionString({} as Parameters<typeof getHyperdriveConnectionString>[0])).toBeUndefined()
  })

  it('ignores non-string connectionString', () => {
    const event = {
      context: { cloudflare: { env: { HYPERDRIVE: { connectionString: 123 } } } },
    }
    expect(getHyperdriveConnectionString(event as Parameters<typeof getHyperdriveConnectionString>[0])).toBeUndefined()
  })
})

describe('resolveDatabaseUrl', () => {
  it('prefers hyperdrive binding over DATABASE_URL', () => {
    const prev = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgres://local:5432/db'
    const event = makeEvent('postgres://hyperdrive:5432/db', 'env')
    expect(resolveDatabaseUrl(event as Parameters<typeof resolveDatabaseUrl>[0])).toBe('postgres://hyperdrive:5432/db')
    process.env.DATABASE_URL = prev
  })

  it('falls back to DATABASE_URL when no hyperdrive binding', () => {
    const prev = process.env.DATABASE_URL
    process.env.DATABASE_URL = 'postgres://fallback:5432/db'
    expect(resolveDatabaseUrl(makeEvent(undefined) as Parameters<typeof resolveDatabaseUrl>[0])).toBe('postgres://fallback:5432/db')
    expect(resolveDatabaseUrl(undefined)).toBe('postgres://fallback:5432/db')
    process.env.DATABASE_URL = prev
  })

  it('throws when neither hyperdrive nor DATABASE_URL present', () => {
    const prev = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    expect(() => resolveDatabaseUrl(makeEvent(undefined) as Parameters<typeof resolveDatabaseUrl>[0])).toThrow('DATABASE_URL is required')
    process.env.DATABASE_URL = prev
  })
})
