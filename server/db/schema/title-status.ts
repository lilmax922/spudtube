import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod'
import { WATCH_STATUSES } from '../../../shared/personal-tracking/personal-tracking'
import { user } from './auth'
import { kindEnum } from './kind'

// Canonical WatchStatus values (CONTEXT.md). The enum cannot share the table's name
// (Postgres tables reserve a composite type of the same name).
// The value list lives in shared; this table only adds the Postgres enum.
export const watchStatusEnum = pgEnum('watch_status', [...WATCH_STATUSES])

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

export type { WatchStatus } from '../../../shared/personal-tracking/personal-tracking'

export type TitleStatus = typeof titleStatus.$inferSelect
export type InsertTitleStatus = typeof titleStatus.$inferInsert

export const InsertTitleStatusSchema = createInsertSchema(titleStatus, {
  tmdbId: schema => schema.int().positive(),
})
  .omit({ createdAt: true, updatedAt: true, userId: true })

export const SelectTitleStatusSchema = createSelectSchema(titleStatus)

export const UpdateTitleStatusSchema = createUpdateSchema(titleStatus)
  .omit({ createdAt: true, updatedAt: true, userId: true, kind: true, tmdbId: true })

// The column stays nullable (clearing sets NULL in place per ADR 0003), but the
// PUT body accepts only real statuses — NULL is reachable solely via DELETE.
export const UpdateTitleStatusBodySchema = z.object({
  status: z.enum(WATCH_STATUSES),
})
