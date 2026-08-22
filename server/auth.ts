import process from 'node:process'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth/minimal'
import { getDb } from './db'
import * as authSchema from './db/schema/auth'

// The one Better Auth instance. Google is the only provider (spec: no email/password,
// no other OAuth). Credentials come from env only and are never committed. trustHost is
// required for serverless/SSR where the request host differs from a configured baseURL.
// The generated auth schema (server/db/schema/auth.ts) is bound explicitly so the
// adapter uses the exact tables this app migrates.
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustHost: true,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), { provider: 'pg', schema: authSchema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
})
