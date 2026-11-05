import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";

import { EditorAccessDeniedError, editorAction } from "./authorization";
import { editors } from "./schema";
import { getSignedInEmail } from "./session";

vi.mock("./session", () => ({ getSignedInEmail: vi.fn() }));

const signedInAs = (email: string | null) => vi.mocked(getSignedInEmail).mockResolvedValue(email);

describe("editorAction", () => {
  const write = vi.fn(async (editor: { email: string }, title: string) => `${title} par ${editor.email}`);
  const action = editorAction(write);

  beforeEach(async () => {
    write.mockClear();
    await db.insert(editors).values({ email: "editrice@example.fr" });
  });

  it("refuses a visitor who is not signed in", async () => {
    signedInAs(null);

    await expect(action("Santé")).rejects.toBeInstanceOf(EditorAccessDeniedError);
    expect(write).not.toHaveBeenCalled();
  });

  it("refuses a signed-in account that is not an editor", async () => {
    signedInAs("visiteur@example.fr");

    await expect(action("Santé")).rejects.toBeInstanceOf(EditorAccessDeniedError);
    expect(write).not.toHaveBeenCalled();
  });

  it("runs the write for a signed-in editor, whatever the case of the address", async () => {
    signedInAs("Editrice@Example.fr");

    await expect(action("Santé")).resolves.toBe("Santé par editrice@example.fr");
  });
});
