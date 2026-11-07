import { describe, expect, it } from "vitest";

import type { Source } from "./queries";
import { sourcesCsv } from "./csv";

const program: Source = {
  id: "6f1c2a4e-8b7d-4c3e-9a1f-2d5e6b7c8d9e",
  title: "Programme pour l'Horizon 2027",
  organization: "Parti de l'Horizon",
  url: "https://horizon.example.org/programme",
  consultedOn: "2026-10-12",
  kind: "program",
};

describe("the Sources spreadsheet", () => {
  it("is a semicolon-separated file Excel opens in French, accents included", () => {
    expect(sourcesCsv([program])).toBe(
      "\uFEFFTitre;Organisme;Type;Lien;Date de consultation\r\n" +
        "Programme pour l'Horizon 2027;Parti de l'Horizon;Programme;https://horizon.example.org/programme;12/10/2026\r\n",
    );
  });

  it("keeps semicolons, quotes and line breaks inside their cell", () => {
    const csv = sourcesCsv([{ ...program, title: 'Loi « climat » ; article 3, dit "le grand"\nversion 2' }]);

    expect(csv.split("\r\n")[1]).toBe(
      '"Loi « climat » ; article 3, dit ""le grand""\nversion 2";Parti de l\'Horizon;Programme;https://horizon.example.org/programme;12/10/2026',
    );
  });

  it("never lets a cell run as a formula when the file is opened", () => {
    const csv = sourcesCsv([{ ...program, title: "=HYPERLINK(\"https://example.org\")", organization: "+33 Assemblée" }]);

    expect(csv.split("\r\n")[1]).toMatch(/^"'=HYPERLINK\(""https:\/\/example\.org""\)";'\+33 Assemblée;/);
  });
});
