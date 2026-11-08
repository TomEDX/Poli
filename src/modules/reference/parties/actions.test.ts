import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { editors } from "@/modules/editors/schema";

import { createPartyAction, removePartyAction, savePartyAction } from "./actions";
import { getParties } from "./queries";

vi.mock("@/modules/editors/session", () => ({ getSignedInEmail: vi.fn(async () => "editrice@example.fr") }));

// Supabase Storage stands in as a map from file name to content type: CI only runs Postgres.
const storedLogos = vi.hoisted(() => new Map<string, string>());

vi.mock("./logo-storage", () => ({
  logoUrl: (path: string) => `https://storage.test/${path}`,
  uploadLogo: vi.fn(async (_bytes: Uint8Array, contentType: string) => {
    const path = crypto.randomUUID();
    storedLogos.set(path, contentType);
    return path;
  }),
  removeLogo: vi.fn(async (path: string) => {
    storedLogos.delete(path);
  }),
}));

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);

const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38]);

const svg = '<?xml version="1.0"?>\n<!-- Logo -->\n<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';

function logoFile(content: BlobPart, type: string) {
  return new File([content], "logo", { type });
}

function storedFile() {
  const [entry] = storedLogos.entries();
  return entry && { url: `https://storage.test/${entry[0]}`, type: entry[1] };
}

describe("party and candidacy actions", () => {
  beforeEach(async () => {
    await db.insert(editors).values({ email: "editrice@example.fr" });
    storedLogos.clear();
  });

  it("name the abbreviation or the name already taken by another party", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH" });
    await createPartyAction({ name: "Union des territoires", abbreviation: "UDT" });
    const [, union] = await getParties();

    expect(await createPartyAction({ name: " Parti de l'Horizon ", abbreviation: "PH" })).toEqual({
      ok: false,
      message: "Le nom « Parti de l'Horizon » est déjà pris par un autre parti.",
    });
    expect(await savePartyAction(union.id, { party: { abbreviation: " PDH " } })).toEqual({
      ok: false,
      message: "Le sigle « PDH » est déjà pris par un autre parti.",
    });
  });

  it("treat a blank candidate name as no candidate declared yet", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH" });
    const [horizon] = await getParties();

    expect(await savePartyAction(horizon.id, { newCandidacy: { candidateName: "  " } })).toEqual({ ok: true });
    const [{ candidacy }] = await getParties();
    expect(candidacy).toMatchObject({ candidateName: null, status: "draft", label: "Parti de l'Horizon" });

    await savePartyAction(horizon.id, { candidacy: { candidateName: " Camille Martin " } });
    expect((await getParties())[0].candidacy).toMatchObject({ label: "Camille Martin (PDH)" });
  });

  it("create a party with its candidacy, a blank candidate meaning none declared yet", async () => {
    expect(
      await createPartyAction({
        name: "Parti de l'Horizon",
        abbreviation: "PDH",
        candidacy: { candidateName: "  ", status: "published" },
      }),
    ).toEqual({ ok: true });

    expect((await getParties())[0].candidacy).toMatchObject({
      candidateName: null,
      status: "published",
      label: "Parti de l'Horizon",
    });
  });

  it("explain why a party with a candidacy cannot be deleted", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH", candidacy: { candidateName: "" } });
    const [horizon] = await getParties();

    expect(await removePartyAction(horizon.id)).toEqual({
      ok: false,
      message: "Ce parti porte une candidature : supprimez-la avant de supprimer le parti.",
    });
  });

  it("store a party's logo, then replace it and delete the file it replaces", async () => {
    expect(
      await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH", logo: logoFile(png, "image/png") }),
    ).toEqual({ ok: true });
    const [horizon] = await getParties();
    expect(storedFile()).toEqual({ url: horizon.logo, type: "image/png" });

    expect(await savePartyAction(horizon.id, { logo: logoFile(svg, "image/svg+xml") })).toEqual({ ok: true });
    expect(storedLogos.size).toBe(1);
    expect(storedFile()).toEqual({ url: (await getParties())[0].logo, type: "image/svg+xml" });

    await savePartyAction(horizon.id, { logo: logoFile(webp, "image/webp") });
    expect(storedFile()).toEqual({ url: (await getParties())[0].logo, type: "image/webp" });
  });

  it("remove a party's logo and its file", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH", logo: logoFile(png, "image/png") });
    const [horizon] = await getParties();

    expect(await savePartyAction(horizon.id, { logo: null })).toEqual({ ok: true });
    expect((await getParties())[0].logo).toBeNull();
    expect(storedLogos.size).toBe(0);
  });

  it("delete a party's logo file with the party", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH", logo: logoFile(png, "image/png") });
    const [horizon] = await getParties();

    expect(await removePartyAction(horizon.id)).toEqual({ ok: true });
    expect(storedLogos.size).toBe(0);
  });

  it("refuse a logo whose content is not an SVG, PNG or WebP image, whatever its declared type", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH" });
    const [horizon] = await getParties();
    const refusal = { ok: false, message: "Choisissez une image SVG, PNG ou WebP." };

    expect(await savePartyAction(horizon.id, { logo: logoFile("<html><script></script></html>", "image/png") })).toEqual(
      refusal,
    );
    expect(await savePartyAction(horizon.id, { logo: logoFile(png, "image/gif") })).toEqual(refusal);
    expect((await getParties())[0].logo).toBeNull();
    expect(storedLogos.size).toBe(0);
  });

  it("refuse a logo over 1 Mo", async () => {
    const tooLarge = new Uint8Array(1024 * 1024 + 1);
    tooLarge.set(png);

    expect(
      await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH", logo: logoFile(tooLarge, "image/png") }),
    ).toEqual({ ok: false, message: "Le logo dépasse 1 Mo." });
    expect(await getParties()).toEqual([]);
  });

  it("delete the new logo file when the save is refused", async () => {
    await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PDH" });
    await createPartyAction({ name: "Union des territoires", abbreviation: "UDT" });
    const [, union] = await getParties();

    expect(
      await savePartyAction(union.id, { party: { abbreviation: "PDH" }, logo: logoFile(png, "image/png") }),
    ).toMatchObject({ ok: false });
    expect(
      await createPartyAction({ name: "Parti de l'Horizon", abbreviation: "PH", logo: logoFile(png, "image/png") }),
    ).toMatchObject({ ok: false });
    expect(storedLogos.size).toBe(0);
    expect((await getParties())[1].logo).toBeNull();
  });
});
