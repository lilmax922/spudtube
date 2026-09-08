import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fetchJsonWithTimeout, fetchWithTimeout } from './fetch-timeout'

// Runnable socket-tarpit harness for the production incident shapes (see
// scripts/tarpit-harness.mjs). Unlike fetch-timeout.test.ts, which uses
// promise-double fetchers, this file opens REAL local sockets and drives
// them with the REAL global fetch on REAL timers, so an abort that fails
// to settle a hung socket cannot hide behind a faithful double.
// Budgets stay small (sub-second) so the suite stays fast; wall-clock
// assertions prove the bound instead of trusting it.
describe('socket tarpit harness', () => {
  let server: Server
  let origin: string

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/silent') {
        // Tarpit shape 1: accept the socket, never respond.
        return
      }
      if (req.url === '/drip') {
        // Tarpit shape 2: headers fast, then bytes trickle forever, so
        // response.json() never settles even though fetch resolved.
        res.writeHead(200, { 'content-type': 'application/json' })
        res.write('{"page":')
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"page":1}')
    })
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const { port } = server.address() as AddressInfo
    origin = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    // Tarpit sockets stay open by design, so plain close() would wait
    // forever: destroy all connections first, then close the listener.
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error)
          reject(error)
        else resolve()
      })
    })
  })

  it('serves the happy path (proves the harness itself works)', async () => {
    const result = await fetchJsonWithTimeout(`${origin}/ok`, {}, fetch, 2_000)
    expect(result).toEqual({ status: 200, ok: true, body: { page: 1 } })
  })

  it('bounds a silent socket within budget', async () => {
    const startedAt = Date.now()
    await expect(
      fetchWithTimeout(`${origin}/silent`, {}, fetch, 400),
    ).rejects.toThrow(/timeout/i)
    expect(Date.now() - startedAt).toBeLessThan(10_000)
  })

  it('bounds a dripping body within budget', async () => {
    const startedAt = Date.now()
    await expect(
      fetchJsonWithTimeout(`${origin}/drip`, {}, fetch, 400),
    ).rejects.toThrow(/timeout/i)
    expect(Date.now() - startedAt).toBeLessThan(10_000)
  })
})
