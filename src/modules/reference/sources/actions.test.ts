import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";

import { createSourceAction, editSourceAction, removeSourceAction } from "./actions";
import { getSources } from "./queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

describe("source actions", () => {
  const program = {
    title: " Programme pour l'Horizon 2027 ",
    organization: " Parti de l'Horizon ",
    url: " https://horizon.example.org/programme ",
    consultedOn: "2026-10-12",
    kind: "program",
  };

  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
  });

  it("create, edit and delete a source, without the spaces around what the editor typed", async () => {
    expect(await createSourceAction(program)).toEqual({ ok: true });
    const [source] = await getSources();
    expect(source).toMatchObject({
      title: "Programme pour l'Horizon 2027",
      organization: "Parti de l'Horizon",
      url: "https://horizon.example.org/programme",
    });

    expect(await editSourceAction(source.id, { organization: " Horizon " })).toEqual({ ok: true });
    expect((await getSources())[0]).toMatchObject({ organization: "Horizon", title: "Programme pour l'Horizon 2027" });

    expect(await removeSourceAction(source.id)).toEqual({ ok: true });
    expect(await getSources()).toEqual([]);
  });

  it("explain why a link, a date or a type is refused", async () => {
    expect(await createSourceAction({ ...program, url: "horizon.example.org" })).toEqual({
      ok: false,
      message: "Saisissez un lien complet, qui commence par http:// ou https://.",
    });
    expect(await createSourceAction({ ...program, url: "javascript:alert(1)" })).toEqual({
      ok: false,
      message: "Saisissez un lien complet, qui commence par http:// ou https://.",
    });
    expect(await createSourceAction({ ...program, consultedOn: "12/10/2026" })).toEqual({
      ok: false,
      message: "Saisissez la date de consultation.",
    });
    expect(await createSourceAction({ ...program, title: "  " })).toEqual({ ok: false, message: "Saisissez un titre." });
    expect(await createSourceAction({ ...program, kind: "rumour" })).toEqual({
      ok: false,
      message: "Choisissez un type de source.",
    });
    expect(await getSources()).toEqual([]);
  });
});
