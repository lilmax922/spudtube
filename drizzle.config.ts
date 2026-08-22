import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required — copy .env.example to .env and fill it in')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema',
  out: './server/db/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: databaseUrl,
  },
})
