import { sql } from "drizzle-orm";
import { check, date, integer, pgEnum, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { legislatures, parliamentaryGroups, publicationStatus, sources, subtopics } from "@/modules/reference/schema";

import { amendmentFates, amendmentOpinions } from "./amendments/vocabulary";
import { textNatures } from "./texts/vocabulary";
import { groupPositions, voteResults, voteSubjects } from "./votes/vocabulary";

export const textNature = pgEnum("text_nature", textNatures);

export const voteSubject = pgEnum("vote_subject", voteSubjects);

export const voteResult = pgEnum("vote_result", voteResults);

export const groupPosition = pgEnum("group_position", groupPositions);

export const amendmentFate = pgEnum("amendment_fate", amendmentFates);

export const amendmentOpinion = pgEnum("amendment_opinion", amendmentOpinions);

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

// The Assemblée numbers amendments once per text. An amendment shows only when it is
// published and so is its text.
export const amendments = pgTable(
  "amendments",
  {
    id: uuid().primaryKey().defaultRandom(),
    textId: uuid()
      .notNull()
      .references(() => texts.id, { onDelete: "cascade" }),
    number: integer().notNull(),
    authorLabel: text().notNull(),
    authorGroupId: uuid().references(() => parliamentaryGroups.id, { onDelete: "restrict" }),
    cosignatories: text(),
    summary: text().notNull(),
    fate: amendmentFate().notNull(),
    governmentOpinion: amendmentOpinion().notNull().default("none"),
    committeeOpinion: amendmentOpinion().notNull().default("none"),
    status: publicationStatus().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("amendments_text_id_number_unique").on(table.textId, table.number),
    pgPolicy("amendments_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`${table.status} = 'published'
                 and exists (select 1 from texts where texts.id = ${table.textId} and texts.status = 'published')`,
    }),
  ],
).enableRLS();

// A scrutin follows the publication of its text, and of its amendment when it points to one.
// An amendment has at most one public scrutin; deleting the amendment keeps the scrutin.
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
    amendmentId: uuid().references(() => amendments.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("votes_text_id_number_unique").on(table.textId, table.number),
    unique("votes_amendment_id_unique").on(table.amendmentId),
    check("votes_amendment_id_on_amendment_only", sql`${table.amendmentId} is null or ${table.subject} = 'amendment'`),
    pgPolicy("votes_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from texts where texts.id = ${table.textId} and texts.status = 'published')
                 and (${table.amendmentId} is null
                      or exists (select 1 from amendments
                                 where amendments.id = ${table.amendmentId} and amendments.status = 'published'))`,
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
                         left join amendments on amendments.id = votes.amendment_id
                         where votes.id = ${table.voteId} and texts.status = 'published'
                           and (votes.amendment_id is null or amendments.status = 'published'))`,
    }),
  ],
).enableRLS();

// Sources are optional: no content needs one to be published. A source cannot be deleted
// while it backs a content, which would lose the trace of where the content comes from.
export const textSources = pgTable(
  "text_sources",
  {
    id: uuid().primaryKey().defaultRandom(),
    textId: uuid()
      .notNull()
      .references(() => texts.id, { onDelete: "cascade" }),
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
    unique("text_sources_text_id_source_id_unique").on(table.textId, table.sourceId),
    pgPolicy("text_sources_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from texts where texts.id = ${table.textId} and texts.status = 'published')`,
    }),
  ],
).enableRLS();

export const amendmentSources = pgTable(
  "amendment_sources",
  {
    id: uuid().primaryKey().defaultRandom(),
    amendmentId: uuid()
      .notNull()
      .references(() => amendments.id, { onDelete: "cascade" }),
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
    unique("amendment_sources_amendment_id_source_id_unique").on(table.amendmentId, table.sourceId),
    pgPolicy("amendment_sources_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from amendments join texts on texts.id = amendments.text_id
                         where amendments.id = ${table.amendmentId}
                           and amendments.status = 'published' and texts.status = 'published')`,
    }),
  ],
).enableRLS();

export const voteSources = pgTable(
  "vote_sources",
  {
    id: uuid().primaryKey().defaultRandom(),
    voteId: uuid()
      .notNull()
      .references(() => votes.id, { onDelete: "cascade" }),
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
    unique("vote_sources_vote_id_source_id_unique").on(table.voteId, table.sourceId),
    pgPolicy("vote_sources_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`exists (select 1 from votes join texts on texts.id = votes.text_id
                         left join amendments on amendments.id = votes.amendment_id
                         where votes.id = ${table.voteId} and texts.status = 'published'
                           and (votes.amendment_id is null or amendments.status = 'published'))`,
    }),
  ],
).enableRLS();

