import { runCli } from "./cli.ts";
import { routeJob } from "./job-commands.ts";
import { Refusal } from "./shell.ts";
import { resolveJob } from "./state.ts";

export async function main(argv: string[]): Promise<void> {
  await runCli("route", async () => {
    if (argv.length !== 1) throw new Refusal("Usage: route <job>");
    const job = resolveJob(argv[0]);
    const routing = routeJob(job.id);
    console.log(`${job.id}: reviewers ${routing.reviewers.join(" ")}, risk ${routing.risk}`);
  });
}
