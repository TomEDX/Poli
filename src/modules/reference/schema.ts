import { date, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { publicationStatuses } from "./publication-status";
import { sourceKinds } from "./source-kinds";

// Shared by every publishable content table: only published content reaches the public.
export const publicationStatus = pgEnum("publication_status", publicationStatuses);

export const sourceKind = pgEnum("source_kind", sourceKinds);

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

// One row, inserted by the migration that creates the table (ADR 0005): groups and texts
// belong to a legislature so that another one can be added without migrating them.
export const legislatures = pgTable("legislatures", {
  id: uuid().primaryKey().defaultRandom(),
  number: integer().notNull().unique(),
  startedOn: date().notNull(),
  // Null while the legislature is running.
  endedOn: date(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

// position is the official order of the Assemblée, which every public list follows.
export const parliamentaryGroups = pgTable(
  "parliamentary_groups",
  {
    id: uuid().primaryKey().defaultRandom(),
    legislatureId: uuid()
      .notNull()
      .references(() => legislatures.id, { onDelete: "restrict" }),
    name: text().notNull(),
    abbreviation: text().notNull(),
    position: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("parliamentary_groups_legislature_id_name_unique").on(table.legislatureId, table.name),
    unique("parliamentary_groups_legislature_id_abbreviation_unique").on(table.legislatureId, table.abbreviation),
  ],
).enableRLS();

// Optional links: deleting a group or a party only removes its links.
export const parliamentaryGroupParties = pgTable(
  "parliamentary_group_parties",
  {
    id: uuid().primaryKey().defaultRandom(),
    groupId: uuid()
      .notNull()
      .references(() => parliamentaryGroups.id, { onDelete: "cascade" }),
    partyId: uuid()
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique("parliamentary_group_parties_group_id_party_id_unique").on(table.groupId, table.partyId)],
).enableRLS();

// Not publishable: the Sources page lists every source, as soon as it is entered.
export const sources = pgTable("sources", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  organization: text().notNull(),
  url: text().notNull(),
  consultedOn: date().notNull(),
  kind: sourceKind().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();
