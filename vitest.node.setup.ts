import process from 'node:process'

// Node-project setup: auth modules read env at import time, so the fixture secret and a
// DATABASE_URL fallback must exist before any test module loads.
process.env.DATABASE_URL ??= 'postgresql://spudtube:spudtube@localhost:5432/spudtube'
process.env.BETTER_AUTH_SECRET ??= 'spudtube-test-secret-with-more-than-thirty-two-characters'
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'
