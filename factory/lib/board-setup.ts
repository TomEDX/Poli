import { config } from "./config.ts";
import { gh, ghJson, runOrRefuse } from "./shell.ts";

type Field = { id: string; name: string; options?: { id: string; name: string }[] };

type StatusOption = { id?: string; name: string; color: string; description: string };

const PROJECT = String(config.project.number);
const OWNER = config.project.owner;

// The default options keep their id and take a new name, so the cards that carry them stay put.
const RENAMED_DEFAULTS: Record<string, string> = { Todo: "Prêt", "In Progress": "Build", Done: "Mergé" };

const STATUS_OPTIONS: StatusOption[] = [
  { name: "Bloqué", color: "RED", description: "Un ticket qui le bloque est encore ouvert" },
  { name: "Prêt", color: "GRAY", description: "Peut démarrer" },
  { name: "Build", color: "BLUE", description: "Le builder travaille" },
  { name: "Gate", color: "YELLOW", description: "Lint, types, tests, commits, migrations" },
  { name: "Review", color: "PURPLE", description: "Reviewers en parallèle" },
  { name: "À valider", color: "GREEN", description: "PR prête, reviews PASS : à relire et fusionner" },
  { name: "Needs human", color: "ORANGE", description: "La factory attend une décision" },
  { name: "Mergé", color: "PINK", description: "PR fusionnée" },
];

const UPDATE_FIELD = `mutation($input: UpdateProjectV2FieldInput!) {
  updateProjectV2Field(input: $input) {
    projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } }
  }
}`;

// Idempotent: adds the fields the factory fills and the Status options of its pipeline.
export function setupBoard(): string[] {
  const notes: string[] = [];
  createMissingFields(notes);
  replaceStatusOptions(notes);
  return notes.length > 0 ? notes : ["the board is already set up"];
}

function createMissingFields(notes: string[]): void {
  const names = new Set(listFields().map((field) => field.name));
  const create = (name: string, type: string, extra: string[] = []): void => {
    if (names.has(name)) return;
    gh("project", "field-create", PROJECT, "--owner", OWNER, "--name", name, "--data-type", type, ...extra);
    notes.push(`field ${name} created`);
  };
  create("Round", "NUMBER");
  create("Risque", "SINGLE_SELECT", ["--single-select-options", "Faible,Moyen,Élevé"]);
  create("Reviews", "TEXT");
}

function replaceStatusOptions(notes: string[]): void {
  const status = listFields().find((field) => field.name === "Status");
  if (!status?.options) throw new Error("The board has no Status field.");
  const present = new Set(status.options.map((option) => option.name));
  if (STATUS_OPTIONS.every((option) => present.has(option.name))) return;

  const options = STATUS_OPTIONS.map((option) => {
    const legacy = status.options?.find((existing) => RENAMED_DEFAULTS[existing.name] === option.name);
    return legacy ? { ...option, id: legacy.id } : option;
  });
  const body = JSON.stringify({
    query: UPDATE_FIELD,
    variables: { input: { fieldId: status.id, singleSelectOptions: options } },
  });
  const output = runOrRefuse("gh", ["api", "graphql", "--input", "-"], { input: body });
  if (output.includes('"errors"')) throw new Error(output);
  notes.push("Status options replaced");
}

function listFields(): Field[] {
  return ghJson<{ fields: Field[] }>("project", "field-list", PROJECT, "--owner", OWNER, "--limit", "50", "--format", "json").fields;
}
