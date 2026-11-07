import { describe, expect, it } from "vitest";

import { createSource, editSource, getSources, removeSource, type SourceInput } from "./sources";

const program = {
  title: "Programme pour l'Horizon 2027",
  organization: "Parti de l'Horizon",
  url: "https://horizon.example.org/programme",
  consultedOn: "2026-10-12",
  kind: "program",
} as const;

async function sourceId(input: SourceInput) {
  const result = await createSource(input);
  if (!result.ok) throw new Error(`Could not create ${input.title}`);
  return result.id;
}

describe("sources", () => {
  it("are listed with everything the Sources page shows", async () => {
    const created = await createSource(program);

    expect(created).toEqual({ ok: true, id: expect.any(String) });
    expect(await getSources()).toEqual([{ id: created.ok && created.id, ...program }]);
  });

  it("change only the fields an edit gives, so an edit never restores another editor's older value", async () => {
    const id = await sourceId(program);

    await editSource(id, { consultedOn: "2026-11-02" });
    expect(await editSource(id, { title: "Programme 2027", kind: "other" })).toEqual({ ok: true });

    expect(await getSources()).toEqual([
      { ...program, id, title: "Programme 2027", kind: "other", consultedOn: "2026-11-02" },
    ]);
  });

  it("report a source deleted meanwhile", async () => {
    const id = await sourceId(program);
    expect(await removeSource(id)).toEqual({ ok: true });
    expect(await getSources()).toEqual([]);

    expect(await editSource(id, { title: "Programme" })).toEqual({ ok: false, reason: "not-found" });
    expect(await removeSource(id)).toEqual({ ok: false, reason: "not-found" });
  });

  it("are listed by organization, then by title", async () => {
    await sourceId({ ...program, organization: "Assemblée nationale", title: "Scrutin n° 412", kind: "vote" });
    await sourceId(program);
    await sourceId({ ...program, organization: "Assemblée nationale", title: "Projet de loi n° 105" });

    expect((await getSources()).map((source) => source.title)).toEqual([
      "Projet de loi n° 105",
      "Scrutin n° 412",
      "Programme pour l'Horizon 2027",
    ]);
  });
});
