import { Refusal } from "./shell.ts";

// Runs a script's main function: a refusal prints its message and exits 1, anything else is a bug
// and keeps its stack trace.
export async function runCli(name: string, main: () => Promise<number | void>): Promise<void> {
  try {
    process.exitCode = (await main()) ?? 0;
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    console.error(`${name}: ${error.message}`);
    process.exitCode = 1;
  }
}
