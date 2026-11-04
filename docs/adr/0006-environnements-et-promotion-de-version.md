# Quatre environnements, promotion de la même version, contenu saisi en prod

Le code passe par local → develop → stage → prod. Les branches de fonctionnalité font une PR vers `develop` ; la promotion fusionne `develop` dans `stage` puis `stage` dans `main` en avance rapide, pour que la même version traverse les environnements ; `develop`, `stage` et `main` sont protégées. GitHub Actions applique les migrations Drizzle sur la base de l'environnement à chaque push, et release-please calcule la version et le changelog à partir de commits au format conventional commits, vérifié en CI.

Le contenu (programmes, textes, votes) est une donnée et ne suit pas la promotion : il est saisi directement en prod, le statut brouillon protégeant le public. Local et develop utilisent un jeu de données fictif versionné dans le dépôt.

## Conséquences

Pour rester dans l'offre gratuite de Supabase (2 projets actifs), seuls develop et prod ont une base au départ ; stage est prévu dans le pipeline et recevra son projet au passage en offre Pro, à l'approche du lancement. Un projet gratuit inactif environ 7 jours est mis en pause, ce qui peut toucher develop.
