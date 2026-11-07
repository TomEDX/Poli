import { sql } from "drizzle-orm";
import { date, integer, pgEnum, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { legislatures, publicationStatus, subtopics } from "@/modules/reference/schema";

import { textNatures } from "./text-natures";

export const textNature = pgEnum("text_nature", textNatures);

// The Assemblée numbers every document it receives once per legislature, bills and
// member bills alike, so a number identifies a text within its legislature.
export const texts = pgTable(
  "texts",
  {
    id: uuid().primaryKey().defaultRandom(),
    legislatureId: uuid()
      .notNull()
      .references(() => legislatures.id, { onDelete: "restrict" }),
    nature: textNature().notNull(),
    number: integer().notNull(),
    officialTitle: text().notNull(),
    filedOn: date().notNull(),
    // Null when the editors have no official page to point to.
    officialUrl: text(),
    summary: text().notNull(),
    status: publicationStatus().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("texts_legislature_id_number_unique").on(table.legislatureId, table.number),
    pgPolicy("texts_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`${table.status} = 'published'`,
    }),
  ],
).enableRLS();

// A published text keeps at least one subtopic; the subtopic cannot be deleted while used.
export const textSubtopics = pgTable(
  "text_subtopics",
  {
    id: uuid().primaryKey().defaultRandom(),
    textId: uuid()
      .notNull()
      .references(() => texts.id, { onDelete: "cascade" }),
    subtopicId: uuid()
      .notNull()
      .references(() => subtopics.id, { onDelete: "restrict" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("text_subtopics_text_id_subtopic_id_unique").on(table.textId, table.subtopicId),
    pgPolicy("text_subtopics_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from texts where texts.id = ${table.textId} and texts.status = 'published')`,
    }),
  ],
).enableRLS();

