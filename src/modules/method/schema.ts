import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { publicationStatus } from "@/modules/reference/schema";

// At most two rows: the draft the editors write, and the version the public reads. Publishing
// copies the draft over the published row, so the page stays online while the next version
// is being written.
export const methodPages = pgTable(
  "method_pages",
  {
    id: uuid().primaryKey().defaultRandom(),
    status: publicationStatus().notNull(),
    candidacyCriteria: text().notNull(),
    textCriteria: text().notNull(),
    scoreFormula: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("method_pages_status_unique").on(table.status),
    pgPolicy("method_pages_public_read_published", {
      for: "select",
      to: ["anon", "authenticated"],
      using: sql`${table.status} = 'published'`,
    }),
  ],
).enableRLS();
