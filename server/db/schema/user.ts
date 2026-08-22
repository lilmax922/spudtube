import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Better Auth's core user model. Deliberately outside the derived-Zod pipeline (ADR 0004);
// ticket 08 binds Better Auth's drizzle adapter to this table.
export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull(),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
