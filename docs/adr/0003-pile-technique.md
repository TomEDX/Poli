# Next.js, shadcn/ui, Drizzle et Supabase, avec une administration faite maison

Poli. est un seul projet Next.js en TypeScript, hébergé sur Vercel, avec shadcn/ui pour l'interface, Supabase pour Postgres et l'authentification des éditeurs, et Drizzle pour décrire et migrer le schéma. Next.js plutôt qu'une app Vite entièrement dans le navigateur, pour que les pages des textes soient indexées et que les liens de résultat partagés affichent un aperçu. L'administration est un ensemble de pages protégées dans l'app, construites avec shadcn/ui, plutôt qu'un outil de gestion de contenu à héberger et synchroniser à côté.

## Conséquences

Les données législatives sont saisies à la main par les éditeurs au départ ; un import automatique depuis les données ouvertes de l'Assemblée pourra venir plus tard.
