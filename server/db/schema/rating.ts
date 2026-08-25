import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { user } from './auth'
import { kindEnum } from './kind'

// Canonical Rating labels (CONTEXT.md). The enum cannot share the table's name
// (Postgres tables reserve a composite type of the same name).
export const ratingLabelEnum = pgEnum('rating_label', ['AWESOME', 'GOOD', 'SUCKS'])

export const rating = pgTable('rating', {
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  kind: kindEnum().notNull(),
  tmdbId: integer().notNull(),
  label: ratingLabelEnum().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.userId, table.kind, table.tmdbId] }),
])

export const ratingRelations = relations(rating, ({ one }) => ({
  user: one(user, { fields: [rating.userId], references: [user.id] }),
}))

export type RatingLabel = (typeof ratingLabelEnum.enumValues)[number]

export type Rating = typeof rating.$inferSelect
export type InsertRating = typeof rating.$inferInsert

export const InsertRatingSchema = createInsertSchema(rating, {
  tmdbId: schema => schema.int().positive(),
})
  .omit({ createdAt: true, updatedAt: true, userId: true })

export const SelectRatingSchema = createSelectSchema(rating)

export const UpdateRatingSchema = createUpdateSchema(rating)
  .omit({ createdAt: true, updatedAt: true, userId: true, kind: true, tmdbId: true })

export const UpdateRatingBodySchema = UpdateRatingSchema.pick({ label: true }).required()
