# Poli.

Application neutre qui aide un public non spécialiste à comprendre les programmes de l'élection présidentielle et l'activité parlementaire, sans orienter son choix.

Le vocabulaire du projet est dans [GLOSSARY.md](GLOSSARY.md) et les décisions d'architecture dans [docs/adr/](docs/adr/).

Les environnements (develop, stage, prod), la livraison d'une version et la liste des secrets sont décrits dans [docs/environnements.md](docs/environnements.md).

## Démarrer en local

Prérequis : Node.js 24, pnpm et Docker (lancé).

```sh
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm dev` démarre le Supabase local, applique les migrations Drizzle, puis lance l'app sur http://localhost:3000. Le studio Supabase est sur http://127.0.0.1:54323. `pnpm db:stop` arrête les conteneurs.

## Commandes

| Commande | Rôle |
| --- | --- |
| `pnpm lint` | ESLint, dont la règle qui interdit à un module d'en importer un autre que `reference` |
| `pnpm typecheck` | Vérification des types |
| `pnpm test` | Tests Vitest sur une base `poli_test` recréée à chaque lancement et vidée avant chaque test (le Supabase local doit tourner) |
| `pnpm db:generate` | Génère une migration à partir des schémas `src/modules/*/schema.ts` |
| `pnpm db:migrate` | Applique les migrations sur la base de `DATABASE_URL` |

## Organisation du code

Le code est en anglais. Les routes vivent dans `src/app/` et restent fines ; le code métier est découpé par module dans `src/modules/` (ADR 0004) :

| Dossier | Module |
| --- | --- |
| `reference` | Référentiel : thématiques, partis, candidatures, législature, groupes parlementaires, sources |
| `legislation` | Législatif : textes, amendements, scrutins |
| `programmes` | Programmes : extraits |
| `quiz` | Quiz : questions, positions, score d'accord |

Le code partagé est dans `src/lib/` et `src/components/ui/` (composants shadcn/ui).
