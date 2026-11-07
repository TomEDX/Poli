import { describe, expect, it } from "vitest";

import { createParty, editParty, getParties } from "./queries";

async function partyId(name: string, abbreviation: string) {
  const result = await createParty({ name, abbreviation });
  if (!result.ok) throw new Error(`Could not create ${name}: ${result.reason}`);
  return result.id;
}

describe("parties", () => {
  it("are listed by name with their abbreviation", async () => {
    await createParty({ name: "Union des territoires", abbreviation: "UDT" });
    await createParty({ name: "Parti de l'Horizon", abbreviation: "PDH" });

    expect(await getParties()).toMatchObject([
      { name: "Parti de l'Horizon", abbreviation: "PDH", candidacy: null },
      { name: "Union des territoires", abbreviation: "UDT", candidacy: null },
    ]);
  });

  it("refuses a name or an abbreviation already used by another party", async () => {
    await partyId("Parti de l'Horizon", "PDH");
    const union = await partyId("Union des territoires", "UDT");

    expect(await createParty({ name: "Parti de l'Horizon", abbreviation: "PH" })).toEqual({
      ok: false,
      reason: "name-taken",
    });
    expect(await createParty({ name: "Horizon", abbreviation: "PDH" })).toEqual({
      ok: false,
      reason: "abbreviation-taken",
    });
    expect(await editParty(union, { abbreviation: "PDH" })).toEqual({ ok: false, reason: "abbreviation-taken" });
    expect(await getParties()).toMatchObject([{ abbreviation: "PDH" }, { abbreviation: "UDT" }]);
  });

  it("change only the field an edit gives, so an edit never restores another editor's older value", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");

    await editParty(horizon, { abbreviation: "PH" });
    expect(await editParty(horizon, { name: "Parti de l'Horizon commun" })).toEqual({ ok: true });

    expect(await getParties()).toMatchObject([{ name: "Parti de l'Horizon commun", abbreviation: "PH" }]);
  });
});
