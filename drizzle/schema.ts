import { sqliteTable, AnySQLiteColumn, integer, text } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const todos = sqliteTable("todos", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	title: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
});

