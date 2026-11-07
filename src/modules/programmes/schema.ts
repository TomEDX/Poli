import { sql } from "drizzle-orm";
import { date, integer, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { candidacies, publicationStatus, sources, subtopics } from "@/modules/reference/schema";

// position orders the extracts of a candidacy within one subtopic, where the comparator
// shows them together. An edit overwrites the extract: there is no history. An extract shows
// only when it is published and so is its candidacy.
export const extracts = pgTable(
  "extracts",
  {
    id: uuid().primaryKey().defaultRandom(),
    candidacyId: uuid()
      .notNull()
      .references(() => candidacies.id, { onDelete: "cascade" }),
    subtopicId: uuid()
      .notNull()
      .references(() => subtopics.id, { onDelete: "restrict" }),
    quote: text().notNull(),
    recordedOn: date().notNull(),
    position: integer().notNull(),
    status: publicationStatus().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    pgPolicy("extracts_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`${table.status} = 'published'
                 and exists (select 1 from candidacies
                             where candidacies.id = ${table.candidacyId} and candidacies.status = 'published')`,
    }),
  ],
).enableRLS();

// Sources are optional. A source cannot be deleted while it backs an extract, which would
// lose the trace of where the quote comes from.
export const extractSources = pgTable(
  "extract_sources",
  {
    id: uuid().primaryKey().defaultRandom(),
    extractId: uuid()
      .notNull()
      .references(() => extracts.id, { onDelete: "cascade" }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("extract_sources_extract_id_source_id_unique").on(table.extractId, table.sourceId),
    pgPolicy("extract_sources_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from extracts join candidacies on candidacies.id = extracts.candidacy_id
                         where extracts.id = ${table.extractId} and extracts.status = 'published'
                           and candidacies.status = 'published')`,
    }),
  ],
).enableRLS();
