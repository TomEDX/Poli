# Le code est découpé par module métier, aux frontières vérifiées

_Complété par ADR 0007 : le module `editors` est, comme le référentiel, importable par tous les modules._

Le code métier vit dans `src/modules/`, un dossier par module (`reference` pour le référentiel, `legislation` pour le législatif, `programmes`, `quiz`, puis les modules à venir ; le code est écrit en anglais), chacun avec son schéma Drizzle, ses requêtes, ses Server Actions, sa validation et ses composants ; `src/app/` ne contient que des routes fines. Les dépendances vont dans un seul sens : `app` → modules → `reference` et code partagé (`components/ui`, `lib`). Un module n'importe jamais un autre module, sauf le référentiel, et ne lit pas les tables d'un autre ; quand une page a besoin de deux modules, c'est elle qui les assemble. La règle est vérifiée par ESLint (`import/no-restricted-paths`).

Les sources appartiennent au référentiel plutôt qu'à un module à part : tous les modules doivent pouvoir s'y relier, et le référentiel est la seule dépendance commune autorisée. La page Sources est une route qui lit le référentiel.

## Considered Options

- Découpage technique (`components/`, `lib/`, `db/`) : simple au début, mais chaque fonctionnalité se disperse dans tout le projet.
- Couches repository / service / controller : ajoutent des fichiers sans isolation réelle avec les Server Components et Drizzle ; on n'en ajoute une que si un module le justifie.
- Fichier `index.ts` qui réexporte chaque module : écarté, ces « barrel files » ralentissent la compilation Next.js ; on importe le fichier utile et ESLint garde les frontières.
