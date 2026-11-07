// Writes the local Supabase secret key to .env.development.local, which Next.js loads only
// under `next dev`. The key enables the one-click test editor sign-in and stays out of the
// repository: GitHub push protection rejects it, even as the local default.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const DEV_ENV_FILE = ".env.development.local";

const status = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
) as { SECRET_KEY?: string };
if (!status.SECRET_KEY) throw new Error("The local Supabase did not report its secret key. Is it running?");

writeFileSync(
  DEV_ENV_FILE,
  `# Written by \`pnpm dev\` from \`supabase status\`; rewritten on every start.\nSUPABASE_SECRET_KEY=${status.SECRET_KEY}\n`,
);
console.log(`Local Supabase secret key written to ${DEV_ENV_FILE}.`);
