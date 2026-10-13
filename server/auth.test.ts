import { beforeEach, describe, expect, it } from 'vitest'
import { resolveAuthEnv } from './auth'

function makeEvent(env: Record<string, unknown>): unknown {
  return { context: { cloudflare: { env } } }
}

beforeEach(() => {
  delete process.env.BETTER_AUTH_URL
  delete process.env.BETTER_AUTH_SECRET
  delete process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_SECRET
})

describe('resolveAuthEnv', () => {
  it('reads from process.env when no event is given', () => {
    process.env.BETTER_AUTH_SECRET = 'local-secret'
    process.env.GOOGLE_CLIENT_ID = 'local-id'
    const resolved = resolveAuthEnv()
    expect(resolved.BETTER_AUTH_SECRET).toBe('local-secret')
    expect(resolved.GOOGLE_CLIENT_ID).toBe('local-id')
    expect(resolved.BETTER_AUTH_URL).toBeUndefined()
  })

  it('prefers the Cloudflare binding over process.env', () => {
    process.env.BETTER_AUTH_SECRET = 'local-secret'
    const event = makeEvent({ BETTER_AUTH_SECRET: 'platform-secret' })
    const resolved = resolveAuthEnv(event as never)
    expect(resolved.BETTER_AUTH_SECRET).toBe('platform-secret')
  })

  it('falls back to process.env when the binding is missing or empty', () => {
    process.env.BETTER_AUTH_SECRET = 'local-secret'
    const missing = resolveAuthEnv(makeEvent({}) as never)
    expect(missing.BETTER_AUTH_SECRET).toBe('local-secret')
    const empty = resolveAuthEnv(makeEvent({ BETTER_AUTH_SECRET: '' }) as never)
    expect(empty.BETTER_AUTH_SECRET).toBe('local-secret')
  })

  it('returns undefined when neither binding nor process.env is present', () => {
    const resolved = resolveAuthEnv(makeEvent({}) as never)
    expect(resolved.BETTER_AUTH_SECRET).toBeUndefined()
    expect(resolved.GOOGLE_CLIENT_SECRET).toBeUndefined()
  })

  it('ignores non-string binding values', () => {
    process.env.BETTER_AUTH_SECRET = 'local-secret'
    const resolved = resolveAuthEnv(makeEvent({ BETTER_AUTH_SECRET: 123 }) as never)
    expect(resolved.BETTER_AUTH_SECRET).toBe('local-secret')
  })
})
