// Fictional data for the local database, run by `pnpm dev` after the migrations.
// Node runs this file as is, so it imports nothing from src/ (no path aliases).
import { existsSync } from "node:fs";

import postgres from "postgres";

type SeedTopic = { name: string; slug: string; subtopics: { name: string; slug: string }[] };

type SeedParty = {
  name: string;
  abbreviation: string;
  candidacy?: { candidateName: string | null; status: "draft" | "published" };
};

// partyAbbreviations names seeded parties; one missing from the database is skipped.
type SeedGroup = { name: string; abbreviation: string; partyAbbreviations: string[] };

type SeedSource = {
  title: string;
  organization: string;
  url: string;
  consultedOn: string;
  kind: "program" | "vote" | "official_text" | "other";
};

// Which sections were written; a section that already had rows is skipped.
type SeedResult = { topics: boolean; parties: boolean; parliamentaryGroups: boolean; sources: boolean };

const topicTree: SeedTopic[] = [
  {
    name: "Économie et emploi",
    slug: "economie-et-emploi",
    subtopics: [
      { name: "Emploi et chômage", slug: "emploi-et-chomage" },
      { name: "Pouvoir d'achat", slug: "pouvoir-d-achat" },
      { name: "Fiscalité", slug: "fiscalite" },
      { name: "Entreprises et industrie", slug: "entreprises-et-industrie" },
    ],
  },
  {
    name: "Protection sociale",
    slug: "protection-sociale",
    subtopics: [
      { name: "Retraites", slug: "retraites" },
      { name: "Famille", slug: "famille" },
      { name: "Logement", slug: "logement" },
    ],
  },
  {
    name: "Santé",
    slug: "sante",
    subtopics: [
      { name: "Hôpital", slug: "hopital" },
      { name: "Médecine de ville", slug: "medecine-de-ville" },
      { name: "Prévention", slug: "prevention" },
      { name: "Grand âge et dépendance", slug: "grand-age-et-dependance" },
    ],
  },
  {
    name: "Éducation",
    slug: "education",
    subtopics: [
      { name: "École", slug: "ecole" },
      { name: "Enseignement supérieur", slug: "enseignement-superieur" },
      { name: "Formation professionnelle", slug: "formation-professionnelle" },
    ],
  },
  {
    name: "Écologie et énergie",
    slug: "ecologie-et-energie",
    subtopics: [
      { name: "Climat", slug: "climat" },
      { name: "Énergie", slug: "energie" },
      { name: "Biodiversité", slug: "biodiversite" },
      { name: "Transports", slug: "transports" },
    ],
  },
  {
    name: "Sécurité et justice",
    slug: "securite-et-justice",
    subtopics: [
      { name: "Police et gendarmerie", slug: "police-et-gendarmerie" },
      { name: "Justice", slug: "justice" },
      { name: "Prisons", slug: "prisons" },
    ],
  },
  {
    name: "Immigration",
    slug: "immigration",
    subtopics: [
      { name: "Asile", slug: "asile" },
      { name: "Intégration", slug: "integration" },
      { name: "Contrôle des frontières", slug: "controle-des-frontieres" },
    ],
  },
  {
    name: "Institutions et démocratie",
    slug: "institutions-et-democratie",
    subtopics: [
      { name: "Fonctionnement des institutions", slug: "fonctionnement-des-institutions" },
      { name: "Collectivités locales", slug: "collectivites-locales" },
      { name: "Participation citoyenne", slug: "participation-citoyenne" },
    ],
  },
  {
    name: "Europe et international",
    slug: "europe-et-international",
    subtopics: [
      { name: "Union européenne", slug: "union-europeenne" },
      { name: "Défense", slug: "defense" },
      { name: "Politique étrangère", slug: "politique-etrangere" },
    ],
  },
];

// Fictional parties, so that no real party is shown or favoured during development.
const partyList: SeedParty[] = [
  { name: "Parti de l'Horizon", abbreviation: "PDH", candidacy: { candidateName: "Camille Martin", status: "published" } },
  { name: "Union des territoires", abbreviation: "UDT", candidacy: { candidateName: "Louis Bernard", status: "published" } },
  { name: "Mouvement écologie solidaire", abbreviation: "MES", candidacy: { candidateName: null, status: "published" } },
  { name: "Alliance citoyenne", abbreviation: "AC", candidacy: { candidateName: "Hélène Rousseau", status: "draft" } },
  { name: "Collectif progrès social", abbreviation: "CPS", candidacy: { candidateName: null, status: "draft" } },
  { name: "Parti des libertés", abbreviation: "PDL" },
];

// Fictional groups, listed in their official order.
const groupList: SeedGroup[] = [
  { name: "Horizon et territoires", abbreviation: "HET", partyAbbreviations: ["PDH", "UDT"] },
  { name: "Écologie solidaire", abbreviation: "ECS", partyAbbreviations: ["MES"] },
  { name: "Alliance citoyenne et progrès", abbreviation: "ACP", partyAbbreviations: ["AC", "CPS"] },
  { name: "Libertés", abbreviation: "LIB", partyAbbreviations: ["PDL"] },
  { name: "Non-inscrits indépendants", abbreviation: "NII", partyAbbreviations: [] },
];

// Fictional sources on example.org, so that no real page is cited during development.
const sourceList: SeedSource[] = [
  {
    title: "Programme pour l'Horizon 2027",
    organization: "Parti de l'Horizon",
    url: "https://horizon.example.org/programme",
    consultedOn: "2026-10-12",
    kind: "program",
  },
  {
    title: "Nos 100 propositions",
    organization: "Union des territoires",
    url: "https://territoires.example.org/propositions",
    consultedOn: "2026-10-20",
    kind: "program",
  },
  {
    title: "Scrutin public n° 412 sur l'ensemble du projet de loi relatif à l'énergie",
    organization: "Assemblée nationale",
    url: "https://assemblee.example.org/scrutins/412",
    consultedOn: "2026-09-30",
    kind: "vote",
  },
  {
    title: "Projet de loi n° 105 relatif à l'énergie, texte adopté",
    organization: "Assemblée nationale",
    url: "https://assemblee.example.org/textes/105",
    consultedOn: "2026-09-30",
    kind: "official_text",
  },
  {
    title: "Calendrier de l'élection présidentielle",
    organization: "Conseil constitutionnel",
    url: "https://conseil.example.org/presidentielle/calendrier",
    consultedOn: "2026-11-02",
    kind: "other",
  },
];

// Each section is written only when its table is empty, so editors' local changes
// survive a restart.
export async function seedLocalDatabase(client: postgres.Sql): Promise<SeedResult> {
  return client.begin(async (tx) => {
    return {
      topics: await seedTopics(tx),
      parties: await seedParties(tx),
      parliamentaryGroups: await seedParliamentaryGroups(tx),
      sources: await seedSources(tx),
    };
  });
}

if (import.meta.main) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("Refusing to seed a database that is not the local one.");
  }

  const client = postgres(url, { max: 1, onnotice: () => {} });
  const seeded = await seedLocalDatabase(client);
  await client.end();
  console.log(seeded.topics ? "Topic tree seeded." : "Local database already has topics: skipped.");
  console.log(seeded.parties ? "Parties and candidacies seeded." : "Local database already has parties: skipped.");
  console.log(
    seeded.parliamentaryGroups
      ? "Parliamentary groups seeded."
      : "Local database already has parliamentary groups: skipped.",
  );
  console.log(seeded.sources ? "Sources seeded." : "Local database already has sources: skipped.");
}

async function seedTopics(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "topics")) return false;
  for (const [topicIndex, topic] of topicTree.entries()) {
    const [{ id }] = await tx<{ id: string }[]>`
      insert into topics (name, slug, position)
      values (${topic.name}, ${topic.slug}, ${topicIndex + 1})
      returning id`;
    for (const [subtopicIndex, subtopic] of topic.subtopics.entries()) {
      await tx`
        insert into subtopics (topic_id, name, slug, position)
        values (${id}, ${subtopic.name}, ${subtopic.slug}, ${subtopicIndex + 1})`;
    }
  }
  return true;
}

async function seedParties(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "parties")) return false;
  for (const party of partyList) {
    const [{ id }] = await tx<{ id: string }[]>`
      insert into parties (name, abbreviation) values (${party.name}, ${party.abbreviation}) returning id`;
    if (party.candidacy) {
      await tx`
        insert into candidacies (party_id, candidate_name, status)
        values (${id}, ${party.candidacy.candidateName}, ${party.candidacy.status})`;
    }
  }
  return true;
}

// The groups join the legislature inserted by the migrations.
async function seedParliamentaryGroups(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "parliamentary_groups")) return false;
  const [{ id: legislatureId }] = await tx<{ id: string }[]>`
    select id from legislatures order by number desc limit 1`;
  for (const [index, group] of groupList.entries()) {
    const [{ id }] = await tx<{ id: string }[]>`
      insert into parliamentary_groups (legislature_id, name, abbreviation, position)
      values (${legislatureId}, ${group.name}, ${group.abbreviation}, ${index + 1})
      returning id`;
    if (group.partyAbbreviations.length > 0) {
      await tx`
        insert into parliamentary_group_parties (group_id, party_id)
        select ${id}, id from parties where abbreviation in ${tx(group.partyAbbreviations)}`;
    }
  }
  return true;
}

async function seedSources(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "sources")) return false;
  for (const source of sourceList) {
    await tx`
      insert into sources (title, organization, url, consulted_on, kind)
      values (${source.title}, ${source.organization}, ${source.url}, ${source.consultedOn}, ${source.kind})`;
  }
  return true;
}

async function hasRows(
  tx: postgres.TransactionSql,
  table: "topics" | "parties" | "parliamentary_groups" | "sources",
): Promise<boolean> {
  const [{ count }] = await tx<{ count: number }[]>`select count(*)::int as count from ${tx(table)}`;
  return count > 0;
}
