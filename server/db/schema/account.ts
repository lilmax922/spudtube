import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { user } from './user'

// Better Auth's account model. Deliberately outside the derived-Zod pipeline (ADR 0004);
// the drizzle adapter binds to it as-is. The unique pair (issuer, accountId) is what
// makes a provider identity stable across sign-ins.
export const account = pgTable('account', {
  id: text().primaryKey(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  issuer: text().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  idToken: text(),
  password: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('account_issuer_account_id_unique').on(table.issuer, table.accountId),
])

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))
