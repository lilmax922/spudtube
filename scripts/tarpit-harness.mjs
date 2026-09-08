#!/usr/bin/env node
// Runnable socket-tarpit harness for the TMDB stall incident.
//
// Spins REAL local sockets (silent accept + dripping body) and drives the
// REAL fetchWithTimeout / fetchJsonWithTimeout against them on REAL timers,
// proving the timeout bound does not depend on abort propagation the way
// promise-double unit tests cannot.
//
// Usage:
//   node scripts/tarpit-harness.mjs
//   pnpm test:tarpit
//
// The suite is server/tmdb/tarpit-harness.test.ts (vitest, node env).
import { execSync } from 'node:child_process'

execSync('pnpm vitest run server/tmdb/tarpit-harness.test.ts', { stdio: 'inherit' })
