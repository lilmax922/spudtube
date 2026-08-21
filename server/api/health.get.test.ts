import { createApp, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import healthHandler from './health.get'

describe('health route', () => {
  it('reports ok', async () => {
    const app = createApp()
    app.use(healthHandler)
    const fetchHealth = toWebHandler(app)

    const response = await fetchHealth(new Request('http://localhost/api/health'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})
