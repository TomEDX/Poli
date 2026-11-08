import { describe, expect, it } from "vitest";

import {
  createCandidacy,
  createParty,
  editCandidacy,
  editParty,
  getParties,
  getPublishedCandidacies,
  removeCandidacy,
  removeParty,
  saveParty,
  setCandidacyStatus,
} from "./queries";

async function partyId(name: string, abbreviation: string) {
  const result = await createParty({ name, abbreviation });
  if (!result.ok) throw new Error(`Could not create ${name}: ${result.reason}`);
  return result.id;
}

async function candidacyId(partyId: string, candidateName: string | null) {
  const result = await createCandidacy(partyId, { candidateName });
  if (!result.ok) throw new Error(`Could not create the candidacy: ${result.reason}`);
  return result.id;
}

async function labels() {
  return (await getParties()).map((party) => party.candidacy?.label);
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

describe("a candidacy", () => {
  it("exists without a candidate, then takes the candidate's name without being entered again", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    const candidacy = await candidacyId(horizon, null);
    expect(await labels()).toEqual(["Parti de l'Horizon"]);

    expect(await editCandidacy(candidacy, { candidateName: "Camille Martin" })).toEqual({ ok: true });
    expect(await getParties()).toMatchObject([
      { candidacy: { id: candidacy, candidateName: "Camille Martin", status: "draft", label: "Camille Martin (PDH)" } },
    ]);
  });

  it("follows its party when the party is renamed", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    await candidacyId(horizon, "Camille Martin");

    await editParty(horizon, { abbreviation: "PH" });
    expect(await labels()).toEqual(["Camille Martin (PH)"]);
  });

  it("is the only one of its party", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    await candidacyId(horizon, null);

    expect(await createCandidacy(horizon, { candidateName: "Camille Martin" })).toEqual({
      ok: false,
      reason: "party-has-candidacy",
    });
  });

  it("can be created already published", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    await createCandidacy(horizon, { candidateName: null, status: "published" });

    expect(await getPublishedCandidacies()).toMatchObject([{ label: "Parti de l'Horizon" }]);
  });

  it("is created with its party in one step", async () => {
    const result = await createParty({
      name: "Parti de l'Horizon",
      abbreviation: "PDH",
      candidacy: { candidateName: "Camille Martin", status: "published" },
    });

    expect(result).toMatchObject({ ok: true });
    expect(await getPublishedCandidacies()).toMatchObject([{ label: "Camille Martin (PDH)" }]);
  });

  it("is not created when its party is refused", async () => {
    await partyId("Parti de l'Horizon", "PDH");

    expect(
      await createParty({ name: "Horizon", abbreviation: "PDH", candidacy: { candidateName: null, status: "draft" } }),
    ).toEqual({ ok: false, reason: "abbreviation-taken" });
    expect(await labels()).toEqual([undefined]);
  });
});

describe("saving a party with its candidacy", () => {
  it("writes the party and its candidacy together", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    await candidacyId(horizon, null);

    expect(
      await saveParty(horizon, {
        party: { abbreviation: "PH" },
        candidacy: { candidateName: "Camille Martin", status: "published" },
      }),
    ).toEqual({ ok: true });
    expect(await getPublishedCandidacies()).toMatchObject([{ label: "Camille Martin (PH)" }]);
  });

  it("creates the candidacy of a party that had none", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");

    expect(await saveParty(horizon, { newCandidacy: { candidateName: null, status: "draft" } })).toEqual({ ok: true });
    expect(await labels()).toEqual(["Parti de l'Horizon"]);
  });

  it("writes nothing when one of the changes is refused", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    await partyId("Union des territoires", "UDT");
    await candidacyId(horizon, null);

    expect(
      await saveParty(horizon, {
        party: { abbreviation: "UDT" },
        candidacy: { candidateName: "Camille Martin", status: "published" },
      }),
    ).toEqual({ ok: false, reason: "abbreviation-taken" });
    expect((await getParties())[0]).toMatchObject({
      abbreviation: "PDH",
      candidacy: { candidateName: null, status: "draft" },
    });
  });

  it("reports a party deleted meanwhile", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    await removeParty(horizon);

    expect(await saveParty(horizon, { party: { name: "Horizon" } })).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("published candidacies", () => {
  it("leave drafts out, and come with their label and party", async () => {
    const horizon = await candidacyId(await partyId("Parti de l'Horizon", "PDH"), "Camille Martin");
    await candidacyId(await partyId("Union des territoires", "UDT"), "Louis Bernard");
    const greens = await candidacyId(await partyId("Mouvement écologie solidaire", "MES"), null);
    await setCandidacyStatus(horizon, "published");
    await setCandidacyStatus(greens, "published");

    expect(await getPublishedCandidacies()).toEqual([
      {
        id: greens,
        label: "Mouvement écologie solidaire",
        candidateName: null,
        party: { id: expect.any(String), name: "Mouvement écologie solidaire", abbreviation: "MES", logo: null },
      },
      {
        id: horizon,
        label: "Camille Martin (PDH)",
        candidateName: "Camille Martin",
        party: { id: expect.any(String), name: "Parti de l'Horizon", abbreviation: "PDH", logo: null },
      },
    ]);
  });

  it("stop being public once set back to draft", async () => {
    const horizon = await candidacyId(await partyId("Parti de l'Horizon", "PDH"), null);
    await setCandidacyStatus(horizon, "published");

    expect(await setCandidacyStatus(horizon, "draft")).toEqual({ ok: true });
    expect(await getPublishedCandidacies()).toEqual([]);
  });
});

describe("deletion", () => {
  it("refuses a party that still has a candidacy, then accepts it once the candidacy is gone", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    const candidacy = await candidacyId(horizon, "Camille Martin");

    expect(await removeParty(horizon)).toEqual({ ok: false, reason: "in-use" });
    expect(await removeCandidacy(candidacy)).toEqual({ ok: true });
    expect(await removeParty(horizon)).toEqual({ ok: true });
    expect(await getParties()).toEqual([]);
  });

  it("leaves nothing to edit, publish or delete again", async () => {
    const horizon = await partyId("Parti de l'Horizon", "PDH");
    const candidacy = await candidacyId(horizon, null);
    await removeCandidacy(candidacy);
    await removeParty(horizon);

    expect(await editCandidacy(candidacy, { candidateName: "Camille Martin" })).toEqual({ ok: false, reason: "not-found" });
    expect(await setCandidacyStatus(candidacy, "published")).toEqual({ ok: false, reason: "not-found" });
    expect(await removeCandidacy(candidacy)).toEqual({ ok: false, reason: "not-found" });
    expect(await editParty(horizon, { name: "Horizon" })).toEqual({ ok: false, reason: "not-found" });
    expect(await removeParty(horizon)).toEqual({ ok: false, reason: "not-found" });
    expect(await createCandidacy(horizon, { candidateName: null })).toEqual({ ok: false, reason: "not-found" });
  });
});
