import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";

import { createPartyAction } from "../parties/actions";
import { getParties } from "../parties/queries";
import { createParliamentaryGroupAction, saveParliamentaryGroupAction } from "./actions";
import { getParliamentaryGroups } from "./queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

describe("parliamentary group actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
  });

  it("name the name or the abbreviation already taken by another group", async () => {
    await createParliamentaryGroupAction({ name: "Horizon démocrate", abbreviation: "HD" });
    await createParliamentaryGroupAction({ name: "Union et alliés", abbreviation: "UA" });
    const [, union] = await getParliamentaryGroups();

    expect(await createParliamentaryGroupAction({ name: " Horizon démocrate ", abbreviation: "HDE" })).toEqual({
      ok: false,
      message: "Le nom « Horizon démocrate » est déjà pris par un autre groupe parlementaire.",
    });
    expect(await saveParliamentaryGroupAction(union.id, { abbreviation: " HD " })).toEqual({
      ok: false,
      message: "Le sigle « HD » est déjà pris par un autre groupe parlementaire.",
    });
  });

  it("link a group to the parties picked, each once", async () => {
    await createPartyAction({ name: "Union des territoires", abbreviation: "UDT" });
    const [union] = await getParties();

    expect(
      await createParliamentaryGroupAction({ name: "Union et alliés", abbreviation: "UA", partyIds: [union.id, union.id] }),
    ).toEqual({ ok: true });
    expect(await getParliamentaryGroups()).toMatchObject([{ abbreviation: "UA", parties: [{ id: union.id }] }]);
  });
});
