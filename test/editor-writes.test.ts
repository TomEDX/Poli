import { describe, expect, it, vi } from "vitest";

// Every write Server Action must check the editor (ADR 0007). Signed out, each one
// called without arguments must refuse before reading them.
vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => null) }));

// The editors module's own actions sign editors in and out, so they are open to visitors.
// A module split into concepts has one actions file per concept (ADR 0008).
const actionFiles = import.meta.glob<Record<string, unknown>>([
  "/src/modules/**/actions.ts",
  "!/src/modules/editors/actions.ts",
]);

describe("every write Server Action", () => {
  it("is found in the content modules", () => {
    expect(Object.keys(actionFiles)).not.toEqual([]);
  });

  it.each(Object.keys(actionFiles))("in %s refuses a visitor", async (file) => {
    const actions = await actionFiles[file]();

    for (const [name, action] of Object.entries(actions)) {
      expect(action, name).toBeTypeOf("function");
      expect(await (action as () => Promise<unknown>)(), name).toEqual({
        ok: false,
        message: "Votre session a expiré : reconnectez-vous.",
      });
    }
  });
});
