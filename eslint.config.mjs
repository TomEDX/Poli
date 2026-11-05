import { readdirSync } from "node:fs";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ADR 0004 and 0007: a module may only import itself, the reference module and
// the editors module; the editors module imports no other module.
const modules = readdirSync("./src/modules", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const sharedModules = ["reference", "editors"];

const moduleBoundaries = modules.map((name) => ({
  target: `./src/modules/${name}`,
  from: "./src/modules",
  except:
    name === "editors"
      ? ["./editors"]
      : [...new Set([name, ...sharedModules])].map((allowed) => `./${allowed}`),
  message: "A module may only import itself, reference and editors (ADR 0004, ADR 0007).",
}));

const layerBoundaries = [
  {
    target: "./src/modules",
    from: "./src/app",
    message: "Modules must not import routes (ADR 0004).",
  },
  {
    target: ["./src/components", "./src/lib"],
    from: ["./src/app", "./src/modules"],
    message: "Shared code must not import routes or modules (ADR 0004).",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "import/no-restricted-paths": [
        "error",
        { zones: [...moduleBoundaries, ...layerBoundaries] },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
