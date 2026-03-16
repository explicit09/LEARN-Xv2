import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './schema'

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
