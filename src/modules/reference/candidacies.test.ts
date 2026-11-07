import { describe, expect, it } from "vitest";

import {
  createCandidacy,
  editCandidacy,
  getPublishedCandidacies,
  removeCandidacy,
  setCandidacyStatus,
} from "./candidacies";
import { createParty, editParty, getParties, removeParty } from "./parties";

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
        party: { id: expect.any(String), name: "Mouvement écologie solidaire", abbreviation: "MES" },
      },
      {
        id: horizon,
        label: "Camille Martin (PDH)",
        candidateName: "Camille Martin",
        party: { id: expect.any(String), name: "Parti de l'Horizon", abbreviation: "PDH" },
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
