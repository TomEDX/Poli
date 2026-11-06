# Le module des éditeurs est partagé par tous les modules

Chaque Server Action d'écriture doit vérifier qu'un éditeur est connecté, car l'app écrit en base avec le rôle `postgres`, que les règles d'accès Supabase (RLS) ne concernent pas. Cette vérification vit dans le module `editors` (table des éditeurs, session Supabase Auth, `editorWrite` qui construit toute Server Action d'écriture), que tous les modules peuvent importer, comme le référentiel ; le module `editors` n'importe aucun autre module, pour qu'il n'y ait pas de cycle avec le référentiel. Cela complète la règle d'ADR 0004 : un module n'importe que lui-même, `reference` et `editors`, et ESLint le vérifie.

## Considered Options

- Mettre les éditeurs dans `src/lib/` : `lib` reste réservé au code sans notion métier, alors que l'éditeur est un terme du glossaire avec sa table.
- Les mettre dans le référentiel : le référentiel décrit le contenu (thématiques, partis, législature), pas les personnes qui le saisissent.

## Conséquences

Les règles d'accès Supabase servent de seconde barrière : les rôles `anon` et `authenticated` n'ont aucun droit d'écriture sur les tables, et aucune règle ne leur en donne. Un test appelle sans session chaque action exportée par les fichiers `actions.ts` des modules de contenu et exige un refus : une action écrite sans `editorWrite` fait échouer la CI.
