import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Better Auth's verification model (email/token verification records). Deliberately
// outside the derived-Zod pipeline (ADR 0004); the drizzle adapter binds to it as-is.
export const verification = pgTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
