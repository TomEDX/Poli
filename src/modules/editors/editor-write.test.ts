import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { db } from "@/lib/db";

import { editorWrite } from "./editor-write";
import { editors } from "./schema";
import { getSignedInEmail } from "./session";

vi.mock("./session", () => ({ getSignedInEmail: vi.fn() }));

const run = vi.fn(async (id: string, input: { title: string }) =>
  input.title === "Doublon" ? { ok: false as const, reason: "duplicate" as const } : { ok: true as const, id },
);

const action = editorWrite({
  args: [z.uuid()],
  input: z.object({ title: z.string().min(1, "Saisissez un titre.") }),
  run,
  messages: { duplicate: (_id, input) => `« ${input.title} » existe déjà.` },
});

const id = "6f1c2a4e-8b7d-4c3e-9a1f-2d5e6b7c8d9e";

function signedInAs(email: string | null) {
  vi.mocked(getSignedInEmail).mockResolvedValue(email);
}

describe("editorWrite", () => {
  beforeEach(async () => {
    run.mockClear();
    vi.mocked(revalidatePath).mockClear();
    await db.insert(editors).values({ email: "editrice@example.fr" });
    signedInAs("editrice@example.fr");
  });

  it("asks a visitor or a non-editor to sign in again, without writing", async () => {
    for (const email of [null, "visiteur@example.fr"]) {
      signedInAs(email);
      expect(await action(id, { title: "Santé" })).toEqual({
        ok: false,
        message: "Votre session a expiré : reconnectez-vous.",
      });
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("writes for an editor, whatever the case of the address, then regenerates the public pages", async () => {
    signedInAs("Editrice@Example.fr");

    expect(await action(id, { title: "Santé" })).toEqual({ ok: true });
    expect(run).toHaveBeenCalledWith(id, { title: "Santé" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refuses arguments the interface could not have sent", async () => {
    expect(await action("not-an-id", { title: "Santé" })).toEqual({
      ok: false,
      message: "Requête invalide : rechargez la page.",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("shows the first form error as written for the editor", async () => {
    expect(await action(id, { title: "" })).toEqual({ ok: false, message: "Saisissez un titre." });
  });

  it("turns a failure reason into its message, and leaves the public pages as they are", async () => {
    expect(await action(id, { title: "Doublon" })).toEqual({ ok: false, message: "« Doublon » existe déjà." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("gives a default message to an item deleted meanwhile", async () => {
    const remove = editorWrite({ args: [z.uuid()], run: async () => ({ ok: false, reason: "not-found" }) });

    expect(await remove(id)).toEqual({ ok: false, message: "Cet élément n'existe plus : rechargez la page." });
  });

  it("does not regenerate the public pages when nothing changed", async () => {
    const move = editorWrite({ args: [], run: async () => ({ ok: true, unchanged: true }) });

    expect(await move()).toEqual({ ok: true });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
