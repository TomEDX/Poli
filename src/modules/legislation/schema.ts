import { sql } from "drizzle-orm";
import { check, date, integer, pgEnum, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { legislatures, parliamentaryGroups, publicationStatus, subtopics } from "@/modules/reference/schema";

import { textNatures } from "./text-natures";
import { groupPositions, voteResults, voteSubjects } from "./vote-kinds";

export const textNature = pgEnum("text_nature", textNatures);

export const voteSubject = pgEnum("vote_subject", voteSubjects);

export const voteResult = pgEnum("vote_result", voteResults);

export const groupPosition = pgEnum("group_position", groupPositions);

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

// A scrutin follows the publication of its text. An amendment scrutin will point to its
// amendment once amendments exist (#11), through an optional column added then.
export const votes = pgTable(
  "votes",
  {
    id: uuid().primaryKey().defaultRandom(),
    textId: uuid()
      .notNull()
      .references(() => texts.id, { onDelete: "cascade" }),
    subject: voteSubject().notNull(),
    number: integer().notNull(),
    heldOn: date().notNull(),
    result: voteResult().notNull(),
    // Null when the editors have no official page to point to.
    officialUrl: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("votes_text_id_number_unique").on(table.textId, table.number),
    pgPolicy("votes_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from texts where texts.id = ${table.textId} and texts.status = 'published')`,
    }),
  ],
).enableRLS();

// The count is optional: null everywhere when only the majority position is known.
export const groupVotes = pgTable(
  "group_votes",
  {
    id: uuid().primaryKey().defaultRandom(),
    voteId: uuid()
      .notNull()
      .references(() => votes.id, { onDelete: "cascade" }),
    groupId: uuid()
      .notNull()
      .references(() => parliamentaryGroups.id, { onDelete: "restrict" }),
    position: groupPosition().notNull(),
    forCount: integer(),
    againstCount: integer(),
    abstentionCount: integer(),
    nonVotingCount: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("group_votes_vote_id_group_id_unique").on(table.voteId, table.groupId),
    check(
      "group_votes_counts_not_negative",
      sql`${table.forCount} >= 0 and ${table.againstCount} >= 0
          and ${table.abstentionCount} >= 0 and ${table.nonVotingCount} >= 0`,
    ),
    pgPolicy("group_votes_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from votes join texts on texts.id = votes.text_id
                         where votes.id = ${table.voteId} and texts.status = 'published')`,
    }),
  ],
).enableRLS();

