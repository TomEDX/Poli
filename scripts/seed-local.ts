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

// subtopicSlugs and sourceUrls name seeded subtopics and sources; one missing from the database is skipped.
type SeedText = {
  nature: "government_bill" | "member_bill";
  number: number;
  officialTitle: string;
  filedOn: string;
  officialUrl: string | null;
  summary: string;
  subtopicSlugs: string[];
  sourceUrls?: string[];
  status: "draft" | "published";
};

// textNumber, groupAbbreviation and sourceUrls name seeded rows; a vote on a missing text or group is skipped.
type SeedVote = {
  textNumber: number;
  subject: "whole_text" | "article" | "amendment" | "motion";
  number: number;
  heldOn: string;
  result: "adopted" | "rejected";
  officialUrl: string | null;
  groupVotes: {
    groupAbbreviation: string;
    position: "for" | "against" | "abstention" | "non_voting";
    // For, against, abstention, non-voting; null when only the majority position is known.
    counts: [number, number, number, number] | null;
  }[];
  sourceUrls?: string[];
};

// textNumber and groupAbbreviation name seeded rows; an amendment of a missing text is skipped.
type SeedAmendment = {
  textNumber: number;
  number: number;
  authorLabel: string;
  groupAbbreviation: string | null;
  cosignatories: string | null;
  summary: string;
  fate: "adopted" | "rejected" | "withdrawn" | "not_moved" | "fallen" | "inadmissible";
  governmentOpinion: "favourable" | "unfavourable" | "wisdom" | "none";
  committeeOpinion: "favourable" | "unfavourable" | "wisdom" | "none";
  status: "draft" | "published";
  // Null when it was voted by show of hands, or not put to the vote.
  vote: Omit<SeedVote, "textNumber" | "subject"> | null;
};

// partyAbbreviation, subtopicSlug and sourceUrls name seeded rows; an extract of a missing
// candidacy or subtopic is skipped, a missing source is left out. Listed in the order of each subtopic.
type SeedExtract = {
  partyAbbreviation: string;
  subtopicSlug: string;
  quote: string;
  recordedOn: string;
  sourceUrls?: string[];
  status: "draft" | "published";
};

// subtopicSlug, the keys of positions and sourceUrl name seeded rows; a question of a missing
// subtopic is skipped, as is a position of a missing candidacy. A position is from +2 (strongly
// agree) to -2 (strongly disagree), or null for no position; a candidacy left out has none yet.
// Listed in the order of each subtopic.
type SeedQuestion = {
  subtopicSlug: string;
  statement: string;
  status: "draft" | "published";
  positions: Record<string, { value: -2 | -1 | 0 | 1 | 2 | null; sourceUrl?: string }>;
};

// Which sections were written; a section that already had rows is skipped.
type SeedResult = {
  topics: boolean;
  parties: boolean;
  parliamentaryGroups: boolean;
  sources: boolean;
  texts: boolean;
  votes: boolean;
  amendments: boolean;
  extracts: boolean;
  questions: boolean;
  method: boolean;
};

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

// Fictional texts on example.org, so that no real text is shown during development.
const textList: SeedText[] = [
  {
    nature: "government_bill",
    number: 105,
    officialTitle: "Projet de loi relatif à l'accélération de la production d'énergies renouvelables",
    filedOn: "2026-09-12",
    officialUrl: "https://assemblee.example.org/textes/105",
    summary:
      "Le texte raccourcit les délais d'autorisation des éoliennes et des panneaux solaires, et oblige les grands parkings à se couvrir d'ombrières photovoltaïques.",
    subtopicSlugs: ["energie", "climat"],
    sourceUrls: ["https://assemblee.example.org/textes/105"],
    status: "published",
  },
  {
    nature: "member_bill",
    number: 230,
    officialTitle: "Proposition de loi visant à garantir un rendez-vous de prévention à chaque âge de la vie",
    filedOn: "2026-10-03",
    officialUrl: "https://assemblee.example.org/textes/230",
    summary:
      "Le texte crée trois bilans de prévention gratuits, à 25, 45 et 65 ans, pris en charge à 100 % par l'Assurance maladie.",
    subtopicSlugs: ["prevention", "medecine-de-ville"],
    status: "published",
  },
  {
    nature: "government_bill",
    number: 87,
    officialTitle: "Projet de loi de programmation pour la justice 2027-2031",
    filedOn: "2026-06-24",
    officialUrl: null,
    summary:
      "Le texte fixe le budget de la justice pour cinq ans et prévoit la construction de nouvelles places de prison.",
    subtopicSlugs: ["justice", "prisons"],
    status: "published",
  },
  {
    nature: "member_bill",
    number: 312,
    officialTitle: "Proposition de loi visant à encadrer les loyers dans les zones tendues",
    filedOn: "2026-10-28",
    officialUrl: "https://assemblee.example.org/textes/312",
    summary: "Le texte étend l'encadrement des loyers à toutes les communes où le logement manque.",
    subtopicSlugs: ["logement"],
    status: "draft",
  },
  {
    nature: "member_bill",
    number: 298,
    officialTitle: "Proposition de loi relative au référendum d'initiative citoyenne",
    filedOn: "2026-10-15",
    officialUrl: null,
    summary: "Le texte permet à un million d'électeurs de demander un référendum sur une proposition de loi.",
    subtopicSlugs: [],
    status: "draft",
  },
];

// A fictional scrutin, matching the fictional source on scrutin n° 412.
const voteList: SeedVote[] = [
  {
    textNumber: 105,
    subject: "whole_text",
    number: 412,
    heldOn: "2026-09-30",
    result: "adopted",
    officialUrl: "https://assemblee.example.org/scrutins/412",
    groupVotes: [
      { groupAbbreviation: "HET", position: "for", counts: [98, 0, 2, 1] },
      { groupAbbreviation: "ECS", position: "for", counts: [30, 3, 4, 0] },
      { groupAbbreviation: "ACP", position: "abstention", counts: null },
      { groupAbbreviation: "LIB", position: "against", counts: [5, 40, 2, 0] },
      { groupAbbreviation: "NII", position: "against", counts: null },
    ],
    sourceUrls: ["https://assemblee.example.org/scrutins/412"],
  },
];

// Fictional amendments on the renewable energy bill: one decided by a public scrutin, one
// rejected by show of hands, and a draft.
const amendmentList: SeedAmendment[] = [
  {
    textNumber: 105,
    number: 12,
    authorLabel: "Mme Claire Martin",
    groupAbbreviation: "ECS",
    cosignatories: "M. Paul Durand et 14 autres députés",
    summary:
      "L'amendement étend l'obligation d'ombrières photovoltaïques aux parkings de plus de 1 000 m², au lieu de 1 500 m².",
    fate: "adopted",
    governmentOpinion: "wisdom",
    committeeOpinion: "favourable",
    status: "published",
    vote: {
      number: 398,
      heldOn: "2026-09-29",
      result: "adopted",
      officialUrl: "https://assemblee.example.org/scrutins/398",
      groupVotes: [
        { groupAbbreviation: "HET", position: "abstention", counts: [10, 12, 60, 19] },
        { groupAbbreviation: "ECS", position: "for", counts: [36, 0, 0, 1] },
        { groupAbbreviation: "ACP", position: "for", counts: null },
        { groupAbbreviation: "LIB", position: "against", counts: [2, 41, 1, 3] },
        { groupAbbreviation: "NII", position: "against", counts: null },
      ],
    },
  },
  {
    textNumber: 105,
    number: 47,
    authorLabel: "M. Julien Leroy",
    groupAbbreviation: "LIB",
    cosignatories: null,
    summary: "L'amendement supprime l'article qui raccourcit les délais d'autorisation des éoliennes en mer.",
    fate: "rejected",
    governmentOpinion: "unfavourable",
    committeeOpinion: "unfavourable",
    status: "published",
    vote: null,
  },
  {
    textNumber: 105,
    number: 63,
    authorLabel: "Le Gouvernement",
    groupAbbreviation: null,
    cosignatories: null,
    summary: "L'amendement corrige une erreur de référence dans l'article 4.",
    fate: "adopted",
    governmentOpinion: "none",
    committeeOpinion: "favourable",
    status: "draft",
    vote: null,
  },
];

// Fictional quotes from the fictional programmes; most subtopics are left without any, as
// they would be while the editors are still reading.
const extractList: SeedExtract[] = [
  {
    partyAbbreviation: "PDH",
    subtopicSlug: "prevention",
    quote: "Nous créerons trois bilans de prévention gratuits, à 25, 45 et 65 ans, remboursés à 100 %.",
    recordedOn: "2026-10-12",
    sourceUrls: ["https://horizon.example.org/programme"],
    status: "published",
  },
  {
    partyAbbreviation: "PDH",
    subtopicSlug: "prevention",
    quote: "Chaque collège aura une infirmière scolaire à temps plein.",
    recordedOn: "2026-10-12",
    sourceUrls: ["https://horizon.example.org/programme"],
    status: "published",
  },
  {
    partyAbbreviation: "PDH",
    subtopicSlug: "energie",
    quote: "Nous couvrirons de panneaux solaires tous les parkings de plus de 1 000 m² d'ici 2030.",
    recordedOn: "2026-10-12",
    status: "published",
  },
  {
    partyAbbreviation: "PDH",
    subtopicSlug: "retraites",
    quote: "L'âge légal de départ restera fixé à 64 ans.",
    recordedOn: "2026-10-12",
    status: "draft",
  },
  {
    partyAbbreviation: "UDT",
    subtopicSlug: "prevention",
    quote: "Un médecin de prévention sera présent dans chaque maison France services.",
    recordedOn: "2026-10-20",
    sourceUrls: ["https://territoires.example.org/propositions"],
    status: "published",
  },
  {
    partyAbbreviation: "UDT",
    subtopicSlug: "collectivites-locales",
    quote: "Les communes de moins de 3 500 habitants recevront une dotation de fonctionnement garantie pour cinq ans.",
    recordedOn: "2026-10-20",
    sourceUrls: ["https://territoires.example.org/propositions"],
    status: "published",
  },
  {
    partyAbbreviation: "MES",
    subtopicSlug: "climat",
    quote: "La France atteindra la neutralité carbone en 2045, cinq ans avant l'objectif européen.",
    recordedOn: "2026-10-25",
    status: "draft",
  },
];

// Fictional statements; MES has no position yet on some published questions and AC, a draft
// candidacy, on most, so the administration has missing positions to show.
const questionList: SeedQuestion[] = [
  {
    subtopicSlug: "retraites",
    statement: "L'âge légal de départ à la retraite doit être abaissé à 62 ans.",
    status: "published",
    positions: {
      PDH: { value: -2, sourceUrl: "https://horizon.example.org/programme" },
      UDT: { value: 1, sourceUrl: "https://territoires.example.org/propositions" },
      MES: { value: 2 },
      AC: { value: 0 },
    },
  },
  {
    subtopicSlug: "prevention",
    statement: "Les bilans de prévention doivent être gratuits à tous les âges de la vie.",
    status: "published",
    positions: {
      PDH: { value: 2, sourceUrl: "https://horizon.example.org/programme" },
      UDT: { value: 1, sourceUrl: "https://territoires.example.org/propositions" },
      MES: { value: null },
    },
  },
  {
    subtopicSlug: "energie",
    statement: "La France doit construire de nouveaux réacteurs nucléaires.",
    status: "published",
    positions: { PDH: { value: -1 }, UDT: { value: 2 } },
  },
  {
    subtopicSlug: "collectivites-locales",
    statement: "Les communes rurales doivent recevoir une dotation garantie sur plusieurs années.",
    status: "published",
    positions: {
      PDH: { value: null },
      UDT: { value: 2, sourceUrl: "https://territoires.example.org/propositions" },
      MES: { value: 1 },
    },
  },
  {
    subtopicSlug: "climat",
    statement: "La neutralité carbone doit être atteinte avant 2050.",
    status: "draft",
    positions: { MES: { value: 2 } },
  },
];
// Placeholder criteria for development; the score formula is the one the quiz applies.
const methodPage = {
  candidacyCriteria:
    "Texte d'exemple. Poli. présente chaque candidature annoncée par un parti fictif du jeu de données.\n\nLes candidatures apparaissent dans un ordre tiré au hasard à chaque visite.",
  textCriteria: "Texte d'exemple. Poli. retient les textes fictifs votés sur l'ensemble pendant la législature.",
  scoreFormula:
    "Chaque réponse et chaque position vont de +2 (tout à fait d'accord) à −2 (pas du tout d'accord).\n\nAccord sur une question = 1 − |réponse − position| / 4. Une question sur laquelle la candidature n'a pas de position est exclue de son score.\n\nLe score d'accord est la moyenne des accords, au total et par thématique.",
};

// Each section is written only when its table is empty, so editors' local changes
// survive a restart.
export async function seedLocalDatabase(client: postgres.Sql): Promise<SeedResult> {
  return client.begin(async (tx) => {
    return {
      topics: await seedTopics(tx),
      parties: await seedParties(tx),
      parliamentaryGroups: await seedParliamentaryGroups(tx),
      sources: await seedSources(tx),
      texts: await seedTexts(tx),
      votes: await seedVotes(tx),
      amendments: await seedAmendments(tx),
      extracts: await seedExtracts(tx),
      questions: await seedQuestions(tx),
      method: await seedMethod(tx),
    };
  });
}

if (import.meta.main) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  // The Seed workflow sets SEED_TARGET to fill poli-develop; production is never seeded (ADR 0006).
  const isLocal = ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
  if (!isLocal && process.env.SEED_TARGET !== "develop") {
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
  console.log(seeded.texts ? "Texts seeded." : "Local database already has texts: skipped.");
  console.log(seeded.votes ? "Scrutins seeded." : "Local database already has scrutins: skipped.");
  console.log(seeded.amendments ? "Amendments seeded." : "Local database already has amendments: skipped.");
  console.log(seeded.extracts ? "Programme extracts seeded." : "Local database already has extracts: skipped.");
  console.log(seeded.questions ? "Quiz questions seeded." : "Local database already has questions: skipped.");
  console.log(seeded.method ? "Method page seeded." : "Local database already has a method page: skipped.");
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

// The texts join the legislature inserted by the migrations.
async function seedTexts(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "texts")) return false;
  const [{ id: legislatureId }] = await tx<{ id: string }[]>`
    select id from legislatures order by number desc limit 1`;
  for (const text of textList) {
    const [{ id }] = await tx<{ id: string }[]>`
      insert into texts (legislature_id, nature, number, official_title, filed_on, official_url, summary, status)
      values (${legislatureId}, ${text.nature}, ${text.number}, ${text.officialTitle}, ${text.filedOn},
              ${text.officialUrl}, ${text.summary}, ${text.status})
      returning id`;
    if (text.subtopicSlugs.length > 0) {
      await tx`
        insert into text_subtopics (text_id, subtopic_id)
        select ${id}, id from subtopics where slug in ${tx(text.subtopicSlugs)}`;
    }
    await seedSourceLinks(tx, "text", id, text.sourceUrls);
  }
  return true;
}

async function seedVotes(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "votes")) return false;
  for (const { textNumber, groupVotes, sourceUrls, ...vote } of voteList) {
    const [created] = await tx<{ id: string }[]>`
      insert into votes (text_id, subject, number, held_on, result, official_url)
      select id, ${vote.subject}, ${vote.number}, ${vote.heldOn}, ${vote.result}, ${vote.officialUrl}
      from texts where number = ${textNumber}
      returning id`;
    if (!created) continue;
    await seedGroupVotes(tx, created.id, groupVotes);
    await seedSourceLinks(tx, "vote", created.id, sourceUrls);
  }
  return true;
}

async function seedAmendments(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "amendments")) return false;
  for (const { textNumber, groupAbbreviation, vote, ...amendment } of amendmentList) {
    const [created] = await tx<{ id: string; textId: string }[]>`
      insert into amendments (text_id, number, author_label, author_group_id, cosignatories, summary, fate,
                              government_opinion, committee_opinion, status)
      select id, ${amendment.number}, ${amendment.authorLabel},
             (select id from parliamentary_groups where abbreviation = ${groupAbbreviation}),
             ${amendment.cosignatories}, ${amendment.summary}, ${amendment.fate},
             ${amendment.governmentOpinion}, ${amendment.committeeOpinion}, ${amendment.status}
      from texts where number = ${textNumber}
      returning id, text_id as "textId"`;
    if (!created || !vote) continue;
    const [scrutin] = await tx<{ id: string }[]>`
      insert into votes (text_id, subject, number, held_on, result, official_url, amendment_id)
      values (${created.textId}, 'amendment', ${vote.number}, ${vote.heldOn}, ${vote.result}, ${vote.officialUrl},
              ${created.id})
      returning id`;
    await seedGroupVotes(tx, scrutin.id, vote.groupVotes);
  }
  return true;
}

async function seedGroupVotes(tx: postgres.TransactionSql, voteId: string, groupVotes: SeedVote["groupVotes"]) {
  for (const { groupAbbreviation, position, counts } of groupVotes) {
    const [inFavour, against, abstention, nonVoting] = counts ?? [null, null, null, null];
    await tx`
      insert into group_votes
        (vote_id, group_id, position, for_count, against_count, abstention_count, non_voting_count)
      select ${voteId}, id, ${position}, ${inFavour}, ${against}, ${abstention}, ${nonVoting}
      from parliamentary_groups where abbreviation = ${groupAbbreviation}`;
  }
}

async function seedSourceLinks(
  tx: postgres.TransactionSql,
  content: "text" | "vote" | "extract",
  contentId: string,
  sourceUrls: string[] = [],
) {
  if (sourceUrls.length === 0) return;
  await tx`
    insert into ${tx(`${content}_sources`)} (${tx(`${content}_id`)}, source_id)
    select ${contentId}, id from sources where url in ${tx(sourceUrls)}`;
}

async function seedExtracts(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "extracts")) return false;
  for (const [index, extract] of extractList.entries()) {
    const [created] = await tx<{ id: string }[]>`
      insert into extracts (candidacy_id, subtopic_id, quote, recorded_on, position, status)
      select candidacies.id, subtopics.id, ${extract.quote}, ${extract.recordedOn}, ${index + 1}, ${extract.status}
      from candidacies
      join parties on parties.id = candidacies.party_id
      cross join subtopics
      where parties.abbreviation = ${extract.partyAbbreviation} and subtopics.slug = ${extract.subtopicSlug}
      returning id`;
    if (created) await seedSourceLinks(tx, "extract", created.id, extract.sourceUrls);
  }
  return true;
}

async function seedQuestions(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "questions")) return false;
  for (const [index, question] of questionList.entries()) {
    const [created] = await tx<{ id: string }[]>`
      insert into questions (subtopic_id, statement, position, status)
      select id, ${question.statement}, ${index + 1}, ${question.status}
      from subtopics where slug = ${question.subtopicSlug}
      returning id`;
    if (!created) continue;
    for (const [abbreviation, { value, sourceUrl }] of Object.entries(question.positions)) {
      await tx`
        insert into positions (question_id, candidacy_id, value, source_id)
        select ${created.id}, candidacies.id, ${value}, (select id from sources where url = ${sourceUrl ?? null})
        from candidacies join parties on parties.id = candidacies.party_id
        where parties.abbreviation = ${abbreviation}`;
    }
  }
  return true;
}

// Published, with its draft reading the same, as the editors leave it after publishing.
async function seedMethod(tx: postgres.TransactionSql): Promise<boolean> {
  if (await hasRows(tx, "method_pages")) return false;
  for (const status of ["draft", "published"]) {
    await tx`
      insert into method_pages (status, candidacy_criteria, text_criteria, score_formula)
      values (${status}, ${methodPage.candidacyCriteria}, ${methodPage.textCriteria}, ${methodPage.scoreFormula})`;
  }
  return true;
}

async function hasRows(
  tx: postgres.TransactionSql,
  table:
    | "topics"
    | "parties"
    | "parliamentary_groups"
    | "sources"
    | "texts"
    | "votes"
    | "amendments"
    | "extracts"
    | "questions"
    | "method_pages",
): Promise<boolean> {
  const [{ count }] = await tx<{ count: number }[]>`select count(*)::int as count from ${tx(table)}`;
  return count > 0;
}
