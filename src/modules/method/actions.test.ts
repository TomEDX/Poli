import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";

import { publishMethodAction, saveMethodDraftAction, unpublishMethodAction } from "./actions";
import { getEditableMethod, getPublishedMethod } from "./queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

// What the method form sends: every section as typed.
const form = {
  candidacyCriteria: "  Toutes les candidatures annoncées par un parti représenté à l'Assemblée.\n",
  textCriteria: "Les textes votés en séance publique sur l'ensemble.",
  scoreFormula: "Accord = 1 − |réponse − position| / 4.",
};

const revisedTextCriteria = "Les textes adoptés ou rejetés depuis juillet 2024.";

describe("method actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
    vi.mocked(revalidatePath).mockClear();
  });

  it("keep a draft out of the public page, even an incomplete one", async () => {
    expect(await saveMethodDraftAction({ ...form, scoreFormula: "" })).toEqual({ ok: true });

    expect(await getPublishedMethod()).toBeNull();
    expect(await getEditableMethod()).toEqual({
      draft: { candidacyCriteria: form.candidacyCriteria.trim(), textCriteria: form.textCriteria, scoreFormula: "" },
      publication: "none",
      publishedAt: null,
    });
  });

  it("publish the page as typed and regenerate the public pages", async () => {
    expect(await publishMethodAction(form)).toEqual({ ok: true });

    expect(await getPublishedMethod()).toEqual({
      candidacyCriteria: form.candidacyCriteria.trim(),
      textCriteria: form.textCriteria,
      scoreFormula: form.scoreFormula,
      publishedAt: expect.any(Date),
    });
    expect(await getEditableMethod()).toMatchObject({ publication: "up-to-date" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("keep the published page online while its next version is a draft, until it is published", async () => {
    await publishMethodAction(form);

    await saveMethodDraftAction({ ...form, textCriteria: revisedTextCriteria });
    expect(await getPublishedMethod()).toMatchObject({ textCriteria: form.textCriteria });
    expect(await getEditableMethod()).toMatchObject({
      draft: { textCriteria: revisedTextCriteria },
      publication: "outdated",
    });

    await publishMethodAction({ ...form, textCriteria: revisedTextCriteria });
    expect(await getPublishedMethod()).toMatchObject({ textCriteria: revisedTextCriteria });
    expect(await getEditableMethod()).toMatchObject({ publication: "up-to-date" });
  });

  it("refuse to publish a page with an empty section", async () => {
    expect(await publishMethodAction({ ...form, scoreFormula: "   " })).toEqual({
      ok: false,
      message: "Rédigez la formule du score d’accord.",
    });
    expect(await getPublishedMethod()).toBeNull();
  });

  it("take the page offline and keep its text to publish it again", async () => {
    await publishMethodAction(form);

    expect(await unpublishMethodAction()).toEqual({ ok: true });
    expect(await getPublishedMethod()).toBeNull();
    expect(await getEditableMethod()).toMatchObject({ draft: { scoreFormula: form.scoreFormula }, publication: "none" });

    vi.mocked(revalidatePath).mockClear();
    expect(await unpublishMethodAction()).toEqual({ ok: true });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
