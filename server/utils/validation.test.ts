import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseOrThrow } from './validation'

describe('parseOrThrow', () => {
  it('returns the parsed value on success', () => {
    expect(parseOrThrow(z.coerce.number().int().min(1), '3')).toBe(3)
  })

  it('throws an h3 error carrying flattened issues on failure', () => {
    const schema = z.object({ page: z.coerce.number().int().min(1) })

    try {
      parseOrThrow(schema, { page: '0' })
      expect.unreachable()
    }
    catch (error) {
      const httpError = error as { statusCode?: number, data?: { issues?: unknown } }
      expect(httpError.statusCode).toBe(400)
      expect(httpError.data?.issues).toMatchObject({
        fieldErrors: { page: expect.any(Array) },
      })
    }
  })
})
