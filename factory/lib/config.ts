import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ReviewerName = "code" | "ui" | "ux" | "security";

export type Risk = "Faible" | "Moyen" | "Élevé";

export type FactoryConfig = {
  repository: string;
  baseBranch: string;
  queueLabel: string;
  concurrency: number;
  maxRounds: number;
  worktreesDir: string;
  envFiles: string[];
  project: { owner: string; number: number };
  ports: { base: number; step: number };
  protectedPaths: string[];
  alwaysReviewers: ReviewerName[];
  pathReviewers: Partial<Record<ReviewerName, string[]>>;
  riskByReviewer: Partial<Record<ReviewerName, Risk>>;
  screenshotsBranch: string;
};

export const REPO_ROOT = join(import.meta.dirname, "..", "..");
export const FACTORY_DIR = join(REPO_ROOT, "factory");
export const JOBS_DIR = join(FACTORY_DIR, "jobs");

export const config: FactoryConfig = JSON.parse(readFileSync(join(FACTORY_DIR, "config.json"), "utf8"));

export const BASE_REF = `origin/${config.baseBranch}`;
