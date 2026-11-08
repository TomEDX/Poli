# Les logos des partis vivent dans Supabase Storage et seul le serveur les écrit

Les éditeurs envoient le logo d'un parti depuis sa fiche dans l'administration, pour qu'un changement de logo ne demande pas de déploiement. Le fichier est stocké dans un bucket public de Supabase Storage, lisible par tous, et c'est une Server Action construite avec `editorWrite` qui l'écrit, avec la clé secrète Supabase. On garde ainsi la règle d'ADR 0007 : les clients `anon` et `authenticated` n'ont aucun droit d'écriture, y compris sur Storage.

## Considered Options

- Ranger les logos dans `public/` du dépôt : chaque changement de logo passerait par un commit et un déploiement, alors que tout le reste du contenu est saisi dans l'administration.
- Laisser le navigateur envoyer le fichier directement à Storage avec une règle pour les éditeurs connectés : cela ouvrirait la seule exception à « aucune écriture côté client », et la validation du fichier ne vivrait plus avec celle du formulaire.

## Conséquences

La clé secrète Supabase devient nécessaire en production, côté serveur uniquement ; elle ne servait jusqu'ici qu'à la connexion de test locale. Les fichiers acceptés sont SVG, PNG et WebP jusqu'à 1 Mo, toujours affichés par une balise `<img>` pour qu'un script contenu dans un SVG ne s'exécute jamais. Un nouveau logo remplace l'ancien, dont le fichier est supprimé.
