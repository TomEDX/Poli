import { sourceKindLabels } from "../source-kinds";
import type { Source } from "./queries";

const header = ["Titre", "Organisme", "Type", "Lien", "Date de consultation"];

// Excel set to French reads semicolons as the column separator, and needs the byte order
// mark to read the file as UTF-8 rather than mangle the accents.
const separator = ";";
const byteOrderMark = "\uFEFF";

export function sourcesCsv(sources: Source[]): string {
  const rows = sources.map((source) => [
    source.title,
    source.organization,
    sourceKindLabels[source.kind],
    source.url,
    frenchDate(source.consultedOn),
  ]);
  return byteOrderMark + [header, ...rows].map((row) => row.map(cell).join(separator) + "\r\n").join("");
}

// A cell starting with one of these would run as a formula in a spreadsheet: the leading
// apostrophe makes the spreadsheet show it as text.
function cell(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Day first, as Excel set to French reads a date.
function frenchDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
