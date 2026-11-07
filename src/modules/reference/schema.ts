import { integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { publicationStatuses } from "./publication-status";

// Shared by every publishable content table: only published content reaches the public.
export const publicationStatus = pgEnum("publication_status", publicationStatuses);

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

export const parties = pgTable("parties", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  abbreviation: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

// One candidacy per party: before a candidate is declared, two candidacies of the same
// party would share the same label. A party keeps its candidacy until it is deleted first.
export const candidacies = pgTable(
  "candidacies",
  {
    id: uuid().primaryKey().defaultRandom(),
    partyId: uuid()
      .notNull()
      .references(() => parties.id, { onDelete: "restrict" }),
    // Null until a candidate is declared.
    candidateName: text(),
    status: publicationStatus().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique("candidacies_party_id_unique").on(table.partyId)],
).enableRLS();
