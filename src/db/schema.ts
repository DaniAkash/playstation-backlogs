import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const todos = sqliteTable('todos', {
  id: integer({ mode: 'number' }).primaryKey({
    autoIncrement: true,
  }),
  title: text().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const purchasedGames = sqliteTable('purchased_games', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  conceptId: text('concept_id'),
  entitlementId: text('entitlement_id').notNull().unique(),
  imageUrl: text('image_url'),
  isActive: integer('is_active', { mode: 'boolean' }),
  isDownloadable: integer('is_downloadable', { mode: 'boolean' }),
  isPreOrder: integer('is_pre_order', { mode: 'boolean' }),
  membership: text('membership'), // Store as JSON or string
  name: text('name').notNull(),
  platform: text('platform'),
  productId: text('product_id'),
  titleId: text('title_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ).$onUpdate(() => new Date()),
})
