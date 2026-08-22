import { createApp, defineEventHandler, readBody, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { apiValidationError } from './api-validation'

const demoSchema = z.object({
  label: z.enum(['AWESOME', 'GOOD', 'SUCKS']),
})

function demoRoute() {
  return defineEventHandler(async (event) => {
    const parsed = demoSchema.safeParse(await readBody(event))
    if (!parsed.success)
      return apiValidationError(event, parsed.error)
    return parsed.data
  })
}

async function postDemo(body: unknown): Promise<Response> {
  const app = createApp()
  app.use('/demo', demoRoute())
  const request = toWebHandler(app)
  return await request(new Request('http://localhost/demo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

describe('route validation failures', () => {
  it('return 400 { issues } through the shared helper', async () => {
    const response = await postDemo({ label: 'MEH' })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      issues: {
        formErrors: [],
        fieldErrors: { label: ['Invalid option: expected one of "AWESOME"|"GOOD"|"SUCKS"'] },
      },
    })
  })

  it('leave valid requests untouched', async () => {
    const response = await postDemo({ label: 'GOOD' })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ label: 'GOOD' })
  })
})
