import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { user } from './auth'
import { kindEnum } from './kind'

// Canonical WatchStatus values (CONTEXT.md). The enum cannot share the table's name
// (Postgres tables reserve a composite type of the same name).
export const watchStatusEnum = pgEnum('watch_status', ['WATCHLISTED', 'WATCHED'])

export const titleStatus = pgTable('title_status', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  kind: kindEnum().notNull(),
  tmdbId: integer().notNull(),
  // NULL means no state; clearing sets NULL in place rather than deleting the row (ADR 0003).
  status: watchStatusEnum(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.userId, table.kind, table.tmdbId] }),
])

export const titleStatusRelations = relations(titleStatus, ({ one }) => ({
  user: one(user, { fields: [titleStatus.userId], references: [user.id] }),
}))

export type WatchStatus = (typeof watchStatusEnum.enumValues)[number]

export type TitleStatus = typeof titleStatus.$inferSelect
export type InsertTitleStatus = typeof titleStatus.$inferInsert

export const InsertTitleStatusSchema = createInsertSchema(titleStatus, {
  tmdbId: schema => schema.int().positive(),
})
  .omit({ createdAt: true, updatedAt: true, userId: true })

export const SelectTitleStatusSchema = createSelectSchema(titleStatus)

export const UpdateTitleStatusSchema = createUpdateSchema(titleStatus)
  .omit({ createdAt: true, updatedAt: true, userId: true, kind: true, tmdbId: true })
