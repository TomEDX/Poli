import { describe, expect, it } from "vitest";

import { createParty, removeParty } from "../parties/queries";
import {
  createParliamentaryGroup,
  getCurrentLegislature,
  getParliamentaryGroups,
  moveParliamentaryGroup,
  removeParliamentaryGroup,
  saveParliamentaryGroup,
} from "./queries";

async function partyId(name: string, abbreviation: string) {
  const result = await createParty({ name, abbreviation });
  if (!result.ok) throw new Error(`Could not create ${name}: ${result.reason}`);
  return result.id;
}

async function groupId(name: string, abbreviation: string, partyIds: string[] = []) {
  const result = await createParliamentaryGroup({ name, abbreviation, partyIds });
  if (!result.ok) throw new Error(`Could not create ${name}: ${result.reason}`);
  return result.id;
}

describe("the legislature", () => {
  it("exists once the database is set up, without anyone entering it", async () => {
    expect(await getCurrentLegislature()).toMatchObject({ number: 17, startedOn: "2024-07-18", endedOn: null });
  });
});

describe("parliamentary groups", () => {
  it("are listed in the official order, each new group coming last", async () => {
    await createParliamentaryGroup({ name: "Union des territoires", abbreviation: "UDT", partyIds: [] });
    await createParliamentaryGroup({ name: "Écologie et solidarité", abbreviation: "ES", partyIds: [] });
    await createParliamentaryGroup({ name: "Horizon démocrate", abbreviation: "HD", partyIds: [] });

    expect(await getParliamentaryGroups()).toMatchObject([
      { name: "Union des territoires", abbreviation: "UDT", parties: [] },
      { name: "Écologie et solidarité", abbreviation: "ES", parties: [] },
      { name: "Horizon démocrate", abbreviation: "HD", parties: [] },
    ]);
  });

  it("can be linked to several parties, and lose a link when its party is deleted", async () => {
    const union = await partyId("Union des territoires", "UDT");
    const allies = await partyId("Alliance citoyenne", "AC");
    await createParliamentaryGroup({ name: "Union et alliés", abbreviation: "UA", partyIds: [union, allies] });

    expect(await getParliamentaryGroups()).toMatchObject([
      {
        name: "Union et alliés",
        parties: [
          { id: allies, name: "Alliance citoyenne", abbreviation: "AC" },
          { id: union, name: "Union des territoires", abbreviation: "UDT" },
        ],
      },
    ]);

    await removeParty(allies);
    expect(await getParliamentaryGroups()).toMatchObject([{ name: "Union et alliés", parties: [{ id: union }] }]);
  });

  it("change only what an edit gives, its parties included", async () => {
    const union = await partyId("Union des territoires", "UDT");
    const allies = await partyId("Alliance citoyenne", "AC");
    const group = await groupId("Union et alliés", "UA", [union]);

    expect(await saveParliamentaryGroup(group, { abbreviation: "UEA" })).toEqual({ ok: true });
    expect(await saveParliamentaryGroup(group, { partyIds: [allies] })).toEqual({ ok: true });

    expect(await getParliamentaryGroups()).toMatchObject([
      { name: "Union et alliés", abbreviation: "UEA", parties: [{ id: allies }] },
    ]);
  });

  it("refuse a name or an abbreviation already used in the legislature, and then write nothing", async () => {
    const union = await partyId("Union des territoires", "UDT");
    await groupId("Horizon démocrate", "HD");
    const group = await groupId("Union et alliés", "UA");

    expect(await createParliamentaryGroup({ name: "Horizon démocrate", abbreviation: "HDE", partyIds: [] })).toEqual({
      ok: false,
      reason: "name-taken",
    });
    expect(await saveParliamentaryGroup(group, { abbreviation: "HD", partyIds: [union] })).toEqual({
      ok: false,
      reason: "abbreviation-taken",
    });
    expect(await getParliamentaryGroups()).toMatchObject([
      { abbreviation: "HD" },
      { abbreviation: "UA", parties: [] },
    ]);
  });

  it("report a group deleted meanwhile", async () => {
    expect(await saveParliamentaryGroup(crypto.randomUUID(), { name: "Horizon" })).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("report a party deleted meanwhile, and then write nothing", async () => {
    const union = await partyId("Union des territoires", "UDT");
    await removeParty(union);

    expect(await createParliamentaryGroup({ name: "Union et alliés", abbreviation: "UA", partyIds: [union] })).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await getParliamentaryGroups()).toEqual([]);
  });
});

describe("the official order", () => {
  it("follows the groups an editor moves up or down", async () => {
    await groupId("Union des territoires", "UDT");
    const ecology = await groupId("Écologie et solidarité", "ES");
    const horizon = await groupId("Horizon démocrate", "HD");

    expect(await moveParliamentaryGroup(horizon, "up")).toEqual({ ok: true });
    expect(await moveParliamentaryGroup(horizon, "up")).toEqual({ ok: true });
    expect(await moveParliamentaryGroup(ecology, "up")).toEqual({ ok: true });

    expect((await getParliamentaryGroups()).map((group) => group.abbreviation)).toEqual(["HD", "ES", "UDT"]);
  });

  it("is left as is when the first group is moved up or the last one down", async () => {
    const union = await groupId("Union des territoires", "UDT");
    const ecology = await groupId("Écologie et solidarité", "ES");

    expect(await moveParliamentaryGroup(union, "up")).toEqual({ ok: true, unchanged: true });
    expect(await moveParliamentaryGroup(ecology, "down")).toEqual({ ok: true, unchanged: true });
    expect(await moveParliamentaryGroup(crypto.randomUUID(), "up")).toEqual({ ok: false, reason: "not-found" });
    expect((await getParliamentaryGroups()).map((group) => group.abbreviation)).toEqual(["UDT", "ES"]);
  });
});

describe("deleting a group", () => {
  it("keeps the order of the others and leaves nothing to edit or move again", async () => {
    const union = await partyId("Union des territoires", "UDT");
    await groupId("Union des territoires", "UDT");
    const ecology = await groupId("Écologie et solidarité", "ES", [union]);
    await groupId("Horizon démocrate", "HD");

    expect(await removeParliamentaryGroup(ecology)).toEqual({ ok: true });

    expect((await getParliamentaryGroups()).map((group) => group.abbreviation)).toEqual(["UDT", "HD"]);
    expect(await removeParliamentaryGroup(ecology)).toEqual({ ok: false, reason: "not-found" });
    expect(await saveParliamentaryGroup(ecology, { partyIds: [] })).toEqual({ ok: false, reason: "not-found" });
    expect(await moveParliamentaryGroup(ecology, "up")).toEqual({ ok: false, reason: "not-found" });
  });
});
