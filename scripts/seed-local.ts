// Fictional data for the local database, run by `pnpm dev` after the migrations.
// Node runs this file as is, so it imports nothing from src/ (no path aliases).
import { existsSync } from "node:fs";

import postgres from "postgres";

type SeedTopic = { name: string; slug: string; subtopics: { name: string; slug: string }[] };

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

// Returns false without writing anything when the database already has topics,
// so editors' local changes survive a restart.
export async function seedLocalDatabase(client: postgres.Sql): Promise<boolean> {
  return client.begin(async (tx) => {
    const [{ count }] = await tx<{ count: number }[]>`select count(*)::int as count from topics`;
    if (count > 0) return false;

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
  console.log(seeded ? "Local database seeded with a topic tree." : "Local database already has topics: seed skipped.");
}
