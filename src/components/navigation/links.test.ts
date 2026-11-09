import { describe, expect, it } from "vitest";

import { adminGroups, homeLink, isActiveLink, rubriques, sectionOf, transparencyLinks } from "./links";

function activeEntries(pathname: string) {
  const links = [homeLink, ...rubriques, ...transparencyLinks, ...adminGroups.flatMap((group) => group.links)];
  return links.filter((link) => isActiveLink(pathname, link.href)).map((link) => link.href);
}

describe("the active entry", () => {
  it("is the home page only on the home page", () => {
    expect(activeEntries("/")).toEqual(["/"]);
    expect(activeEntries("/quiz")).toEqual(["/quiz"]);
  });

  it("is Textes on a text's page", () => {
    expect(activeEntries("/textes/0b6c1f4e")).toEqual(["/textes"]);
  });

  it("is the administration's Textes on a text's administration page", () => {
    expect(activeEntries("/admin/texts/0b6c1f4e")).toEqual(["/admin/texts"]);
  });

  it("is none on a page whose path only starts like an entry's", () => {
    expect(activeEntries("/textes-adoptes")).toEqual([]);
  });
});

describe("the section open on arrival", () => {
  it("is the administration on its pages", () => {
    expect(sectionOf("/admin")).toBe("admin");
    expect(sectionOf("/admin/texts/0b6c1f4e")).toBe("admin");
  });

  it("is the public site everywhere else", () => {
    expect(sectionOf("/")).toBe("site");
    expect(sectionOf("/textes/0b6c1f4e")).toBe("site");
    expect(sectionOf("/administration")).toBe("site");
  });
});
