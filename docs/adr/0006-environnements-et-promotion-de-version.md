# Trois environnements, promotion de la même version, contenu saisi en prod

Le code passe par local → develop → prod. Les branches de fonctionnalité font une PR vers `develop` ; la promotion avance `main` jusqu'à `develop` en avance rapide, pour que la même version passe de develop à prod ; `develop` et `main` sont protégées. GitHub Actions applique les migrations Drizzle sur la base de l'environnement à chaque push, et release-please calcule la version et le changelog à partir de commits au format conventional commits, vérifié en CI.

Le contenu (programmes, textes, votes) est une donnée et ne suit pas la promotion : il est saisi directement en prod, le statut brouillon protégeant le public. Local et develop utilisent un jeu de données fictif versionné dans le dépôt.

## Options écartées

Un environnement stage entre develop et prod a d'abord été retenu, puis abandonné avant sa mise en place : l'offre gratuite de Supabase limite à 2 projets actifs, donc stage n'aurait eu ni base ni déploiement, et n'aurait été qu'une étape vide. On l'ajoutera si un besoin de recette sur une copie de la prod apparaît, avec un troisième projet Supabase en offre Pro.

## Conséquences

Un projet Supabase gratuit inactif environ 7 jours est mis en pause, ce qui peut toucher develop.
