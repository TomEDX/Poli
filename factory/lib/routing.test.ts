import { describe, expect, it } from "vitest";

import { matchesGlob, routeChangedFiles } from "./routing.ts";

const rules = {
  alwaysReviewers: ["code" as const],
  pathReviewers: {
    ui: ["src/app/**", "src/components/**", "src/modules/*/components/**"],
    ux: ["src/app/**", "src/components/**", "src/modules/*/components/**"],
    security: ["drizzle/**", "**/schema.ts", "**/actions.ts", "test/access-rules*"],
  },
  riskByReviewer: { security: "Élevé" as const, ui: "Moyen" as const, ux: "Moyen" as const },
};

describe("matchesGlob", () => {
  it("lets ** cross directories and * stay in one segment", () => {
    expect(matchesGlob("src/modules/quiz/components/card/item.tsx", "src/modules/*/components/**")).toBe(true);
    expect(matchesGlob("src/modules/quiz/queries.ts", "src/modules/*/components/**")).toBe(false);
    expect(matchesGlob("src/modules/quiz/deep/components/x.tsx", "src/modules/*/components/**")).toBe(false);
  });

  it("matches a file name at any depth, including the root", () => {
    expect(matchesGlob("schema.ts", "**/schema.ts")).toBe(true);
    expect(matchesGlob("src/modules/reference/topics/schema.ts", "**/schema.ts")).toBe(true);
    expect(matchesGlob("src/modules/reference/topics/not-schema.ts", "**/schema.ts")).toBe(false);
  });

  it("treats dots literally", () => {
    expect(matchesGlob("test/access-rules.test.ts", "test/access-rules*")).toBe(true);
    expect(matchesGlob("test/access-rulesXtest", "test/access-rules.test.ts")).toBe(false);
  });
});

describe("routeChangedFiles", () => {
  it("always routes the code review and rates a logic-only change as low risk", () => {
    expect(routeChangedFiles(["src/modules/quiz/queries.ts"], rules)).toEqual({ reviewers: ["code"], risk: "Faible" });
  });

  it("adds ui and ux for pages and components", () => {
    const routing = routeChangedFiles(["src/app/textes/page.tsx"], rules);
    expect(routing.reviewers).toEqual(["code", "ui", "ux"]);
    expect(routing.risk).toBe("Moyen");
  });

  it("adds security for migrations, schemas, actions and access rules, and rates the change high", () => {
    for (const file of ["drizzle/0013_x.sql", "src/modules/quiz/schema.ts", "src/modules/quiz/actions.ts", "test/access-rules.test.ts"]) {
      const routing = routeChangedFiles([file], rules);
      expect(routing.reviewers).toEqual(["code", "security"]);
      expect(routing.risk).toBe("Élevé");
    }
  });
});
