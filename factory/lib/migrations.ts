import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type MigrationFiles = { sqlFiles: string[]; journalTags: string[] };

export function checkMigrations(directory: string): string[] {
  return findMigrationProblems(readMigrationFiles(directory));
}

// Two branches that each add the next number do not conflict in git when the file names differ;
// this is the check that catches it after the merge of the base branch.
export function findMigrationProblems({ sqlFiles, journalTags }: MigrationFiles): string[] {
  const problems: string[] = [];
  const byNumber = new Map<string, string[]>();
  for (const file of sqlFiles) {
    const number = file.match(/^(\d+)_/)?.[1];
    if (!number) {
      problems.push(`${file} does not start with a migration number.`);
      continue;
    }
    byNumber.set(number, [...(byNumber.get(number) ?? []), file]);
  }
  for (const [number, files] of byNumber) {
    if (files.length > 1) problems.push(`Migration number ${number} is used by ${files.join(" and ")}.`);
  }

  const tags = new Set(journalTags);
  if (tags.size !== journalTags.length) problems.push("meta/_journal.json lists the same migration twice.");
  const names = new Set(sqlFiles.map((file) => file.replace(/\.sql$/, "")));
  for (const tag of tags) if (!names.has(tag)) problems.push(`meta/_journal.json lists ${tag}, which has no .sql file.`);
  for (const name of names) if (!tags.has(name)) problems.push(`${name}.sql is missing from meta/_journal.json.`);
  return problems;
}

function readMigrationFiles(directory: string): MigrationFiles {
  const sqlFiles = readdirSync(directory).filter((file) => file.endsWith(".sql"));
  const journalPath = join(directory, "meta", "_journal.json");
  const journal = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, "utf8")) : { entries: [] };
  return { sqlFiles, journalTags: (journal.entries as { tag: string }[]).map((entry) => entry.tag) };
}
