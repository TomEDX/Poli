import { readFileSync } from "node:fs";

import { setupBoard } from "./board-setup.ts";
import { runCli } from "./cli.ts";
import { BASE_REF, FACTORY_DIR } from "./config.ts";
import { jobEnvironment } from "./databases.ts";
import {
  advanceJob,
  cleanupJob,
  closeJob,
  createJob,
  describeJobs,
  reworkJob,
  syncJob,
} from "./job-commands.ts";
import { Refusal } from "./shell.ts";
import { jobDirectory, listJobs, resolveJob } from "./state.ts";
import type { Stage } from "./transitions.ts";

const USAGE = `Usage:
  job create <issue>               new job for an open ready-for-agent issue; prints the job id
  job advance <job> <stage>        move a job to <stage> (build, gate, review, to-validate, needs-human, merged), or refuse
  job rework <job>                 to-validate or needs-human -> build, with the maintainer's note on stdin
  job sync <job>                   read the agents' files, post new reviews on the PR, refresh the card
  job env <job>                    export lines for the job: DATABASE_URL, TEST_DATABASE_URL, PORT, FACTORY_DIR
  job header <job>                 the header line every agent prompt starts with
  job status [<job>...]            table of jobs
  job close <job>                  abandon a job: remove its worktree and databases
  job cleanup <job>                remove a job's worktree and databases
  job board-setup                  add the factory's fields and Status options to the GitHub Project (idempotent)

<job> is a job id (12-dark-mode) or an issue number (12).`;

const STAGES: Stage[] = ["build", "gate", "review", "to-validate", "needs-human", "merged", "closed"];

export async function main(argv: string[]): Promise<void> {
  await runCli("job", () => dispatch(argv));
}

async function dispatch(argv: string[]): Promise<void> {
  const [command, ...args] = argv;
  if (command === "create" && args.length === 1) {
    console.log(createJob(parseIssue(args[0])).id);
  } else if (command === "advance" && args.length === 2) {
    const job = await advanceJob(resolveJob(args[0]).id, parseStage(args[1]));
    console.log(`${job.id}: ${job.stage} (round ${job.round}/${job.roundLimit})`);
  } else if (command === "rework" && args.length === 1) {
    const job = reworkJob(resolveJob(args[0]).id, readFileSync(0, "utf8"));
    console.log(`${job.id}: build (round ${job.round}/${job.roundLimit})`);
  } else if (command === "sync" && args.length === 1) {
    console.log(describeJobs([syncJob(resolveJob(args[0]).id)]));
  } else if (command === "env" && args.length === 1) {
    printEnvironment(resolveJob(args[0]).id);
  } else if (command === "header" && args.length === 1) {
    console.log(agentHeader(resolveJob(args[0]).id));
  } else if (command === "status") {
    console.log(describeJobs(args.length > 0 ? args.map((arg) => resolveJob(arg)) : listJobs()));
  } else if (command === "close" && args.length === 1) {
    console.log(`${(await closeJob(resolveJob(args[0]).id)).id}: closed`);
  } else if (command === "cleanup" && args.length === 1) {
    await cleanupJob(resolveJob(args[0]).id);
  } else if (command === "board-setup" && args.length === 0) {
    for (const note of setupBoard()) console.log(note);
  } else {
    throw new Refusal(`bad arguments: ${argv.join(" ")}\n\n${USAGE}`);
  }
}

function printEnvironment(id: string): void {
  const job = resolveJob(id);
  if (job.port === null) throw new Refusal(`${job.id} has no port: it is not building.`);
  const variables = { ...jobEnvironment(job), FACTORY_DIR };
  for (const [name, value] of Object.entries(variables)) {
    console.log(`export ${name}='${value.replaceAll("'", "'\\''")}'`);
  }
}

function agentHeader(id: string): string {
  const job = resolveJob(id);
  return [
    `Job: ${job.id}.`,
    `Issue: #${job.issue}.`,
    `Job folder: ${jobDirectory(job.id)}/.`,
    `Worktree: ${job.worktree}.`,
    `Branch: ${job.branch}.`,
    `Base: ${BASE_REF}.`,
    `Round: ${job.round}/${job.roundLimit}.`,
    `Factory: ${FACTORY_DIR}.`,
    `Port: ${job.port ?? "-"}.`,
  ].join(" ");
}

function parseIssue(value: string): number {
  if (!/^\d+$/.test(value)) throw new Refusal(`"${value}" is not an issue number.`);
  return Number(value);
}

function parseStage(value: string): Stage {
  if (!STAGES.includes(value as Stage)) throw new Refusal(`"${value}" is not a stage (${STAGES.join(", ")}).`);
  return value as Stage;
}
