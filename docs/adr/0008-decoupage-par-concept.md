# Un module qui réunit plusieurs concepts se range en un dossier par concept

_Complète ADR 0004._

Un module de `src/modules/` qui réunit au moins deux concepts du glossaire se découpe en un dossier par concept : `legislation/texts/`, `votes/` et `amendments/` ; `reference/topics/`, `parties/` (avec les candidatures), `parliamentary-groups/` (avec la législature) et `sources/`. Un module d'un seul concept, comme `programmes`, reste à plat avec les mêmes noms de fichiers. Avant ce découpage, un concept se dispersait en fichiers préfixés (`vote-kinds`, `vote-labels`, `vote-messages`, `vote-validation`…) au milieu de trente autres, et `actions.ts` ou `validation.ts` changeaient à chaque ticket, quel que soit le concept.

Dans un dossier de concept, chaque fichier est nommé d'après son rôle : `queries.ts` pour les lectures et écritures en base, `actions.ts` pour les Server Actions, `validation.ts` pour les schémas Zod, `vocabulary.ts` pour les valeurs, types, libellés français et messages (sans Drizzle, pour que le navigateur puisse s'en servir), `components/` pour les composants, et les tests à côté du fichier qu'ils testent. Le schéma Drizzle reste un seul `schema.ts` par module : il donne la vue d'ensemble des tables et des tables de liaison, et drizzle-kit le trouve par `src/modules/*/schema.ts`.

Le code partagé par plusieurs concepts d'un module va à la racine du module, dans un fichier nommé d'après ce qu'il contient (`form-fields.ts`, `components/row-layout.ts`) ; le code sans notion métier va dans `src/lib/`. Les concepts d'un même module s'importent librement, car la page d'un texte rassemble ses scrutins et ses amendements. Les frontières vérifiées par ESLint restent celles d'ADR 0004, entre modules.

## Considered Options

- Répéter le concept dans le nom des fichiers (`texts/texts.ts`, `texts/text-validation.ts`) : le dossier dit déjà le concept, et les imports, toujours complets faute de fichier `index.ts` (ADR 0004), le répéteraient.
- Un dossier `shared/` par module : il devient vite un fourre-tout où aucun fichier n'a de rôle clair.
- Un schéma Drizzle par concept : les tables de liaison n'ont pas de place évidente, et la configuration de drizzle-kit devrait changer.
- Interdire les imports entre concepts d'un même module : aucune frontière utile à protéger, puisque les pages assemblent ces concepts par nature.

## Conséquences

Le test qui exige que chaque Server Action refuse un visiteur (ADR 0007) parcourt `src/modules/**/actions.ts`.
