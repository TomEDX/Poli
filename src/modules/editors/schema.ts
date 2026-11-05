import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const editorRole = pgEnum("editor_role", ["editor"]);

export const editors = pgTable(
  "editors",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Matched against the address of the Supabase Auth account, stored lowercase.
    email: text().notNull().unique(),
    role: editorRole().notNull().default("editor"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("editors_email_lowercase", sql`${table.email} = lower(${table.email})`)],
).enableRLS();

export type Editor = typeof editors.$inferSelect;
