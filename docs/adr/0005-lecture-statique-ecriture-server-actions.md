# Pages publiques pré-générées, écritures par Server Actions, sans API séparée

_Précisé par ADR 0007 : l'app écrit avec le rôle `postgres`, que la RLS ne concerne pas. Chaque Server Action d'écriture vérifie l'éditeur avec `editorAction`, et les règles d'accès Supabase refusent toute écriture aux clients (`anon`, `authenticated`)._

Les pages publiques lisent la base côté serveur via les requêtes des modules et sont pré-générées puis régénérées à chaque publication, ce qui absorbe le pic de trafic attendu avant l'élection pour un contenu qui change peu. L'administration écrit uniquement par des Server Actions validées par des schémas Zod partagés avec les formulaires, et la sécurité Supabase (RLS) refuse toute écriture qui ne vient pas d'un éditeur connecté. Il n'y a pas d'API séparée tant qu'aucun autre client (app mobile, partenaire) n'en a besoin.

## Conséquences

La table des législatures existe dès le départ avec une seule ligne, et les groupes parlementaires et les textes y sont rattachés, pour pouvoir ajouter une autre législature sans migrer les données saisies.
