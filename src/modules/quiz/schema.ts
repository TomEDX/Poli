import { sql } from "drizzle-orm";
import { check, integer, pgPolicy, pgTable, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { candidacies, publicationStatus, sources, subtopics } from "@/modules/reference/schema";

// A statement the visitor agrees or disagrees with. position orders the questions within
// their subtopic; the quiz follows the topic tree, then that order.
export const questions = pgTable(
  "questions",
  {
    id: uuid().primaryKey().defaultRandom(),
    subtopicId: uuid()
      .notNull()
      .references(() => subtopics.id, { onDelete: "restrict" }),
    statement: text().notNull(),
    position: integer().notNull(),
    status: publicationStatus().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    pgPolicy("questions_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`${table.status} = 'published'`,
    }),
  ],
).enableRLS();

// The answer the editors give for a candidacy, from +2 (strongly agree) to -2 (strongly
// disagree); null is "no position", which leaves the question out of its score. A candidacy
// without a row has no position entered yet. The source is optional, and cannot be deleted
// while it backs a position.
export const positions = pgTable(
  "positions",
  {
    id: uuid().primaryKey().defaultRandom(),
    questionId: uuid()
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    candidacyId: uuid()
      .notNull()
      .references(() => candidacies.id, { onDelete: "cascade" }),
    value: smallint(),
    sourceId: uuid().references(() => sources.id, { onDelete: "restrict" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("positions_question_id_candidacy_id_unique").on(table.questionId, table.candidacyId),
    check("positions_value_on_the_scale", sql`${table.value} between -2 and 2`),
    pgPolicy("positions_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from questions where questions.id = ${table.questionId} and questions.status = 'published')
                 and exists (select 1 from candidacies
                             where candidacies.id = ${table.candidacyId} and candidacies.status = 'published')`,
    }),
  ],
).enableRLS();
