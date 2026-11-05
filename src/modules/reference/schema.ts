import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const topics = pgTable("topics", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  position: integer().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

// Content tables reference subtopics with onDelete "restrict": the database then
// refuses to delete a subtopic that is still used, whatever the module.
export const subtopics = pgTable(
  "subtopics",
  {
    id: uuid().primaryKey().defaultRandom(),
    topicId: uuid()
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    name: text().notNull(),
    slug: text().notNull(),
    position: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique("subtopics_topic_id_slug_unique").on(table.topicId, table.slug)],
).enableRLS();
