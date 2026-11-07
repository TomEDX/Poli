import { runCli } from "./cli.ts";
import { gateJob } from "./job-commands.ts";
import { checkMigrations } from "./migrations.ts";
import { Refusal } from "./shell.ts";
import { resolveJob } from "./state.ts";

const USAGE = `Usage:
  gate <job>                       merge the base branch into the job's branch, run checks.sh; writes round-N/checks.md
  gate --check-migrations [<dir>]  only check that the migration numbers in <dir> (default drizzle) are unique`;

export async function main(argv: string[]): Promise<void> {
  await runCli("gate", async () => {
    if (argv[0] === "--check-migrations") return checkMigrationsCommand(argv[1] ?? "drizzle");
    if (argv.length !== 1 || argv[0].startsWith("-")) throw new Refusal(USAGE);
    const job = resolveJob(argv[0]);
    const passed = await gateJob(job.id);
    console.log(`GATE: ${passed ? "PASS" : "FAIL"} (${job.id}, round ${job.round}; see round-${job.round}/checks.md)`);
    return passed ? 0 : 1;
  });
}

function checkMigrationsCommand(directory: string): number {
  const problems = checkMigrations(directory);
  for (const problem of problems) console.error(problem);
  if (problems.length === 0) console.log("Migration numbers are unique.");
  return problems.length === 0 ? 0 : 1;
}
