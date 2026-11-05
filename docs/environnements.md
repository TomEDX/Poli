# Environnements et promotion de version

Le code passe par local → develop → stage → prod (ADR 0006). Ce document décrit comment l'ensemble est branché, comment livrer une version et quels secrets existent.

## Vue d'ensemble

| Environnement | Branche | Base Supabase | Déploiement Vercel |
| --- | --- | --- | --- |
| Local | toutes | Supabase local (Docker), lancé par `pnpm dev` | aucun |
| Develop | `develop` | projet `poli-develop` | déploiement Preview de la branche `develop` |
| Stage | `stage` | aucune pour l'instant (arrive avec l'offre Pro) | aucun |
| Prod | `main` | projet `poli-prod` | déploiement Production |

Le fichier [vercel.json](../vercel.json) ne laisse Vercel construire que `develop` et `main`.

## Livrer une version

1. Une branche de fonctionnalité fait une PR vers `develop`. La PR est fusionnée en squash : son titre devient le message du commit et doit suivre le format conventional commits (`feat: …`, `fix: …`, `docs: …`).
2. À chaque push sur `develop`, le workflow **Migrate** applique les migrations Drizzle sur `poli-develop`, Vercel redéploie develop, et release-please met à jour sa PR de version (numéro de version et changelog).
3. Pour figer une version, fusionner la PR de release-please dans `develop`. Elle crée le tag et la release GitHub.
4. Pour promouvoir, lancer le workflow **Promote** depuis l'onglet Actions avec la cible `stage`, puis à nouveau avec la cible `main`. Il avance la branche cible en avance rapide, sans créer de commit : la même version arrive en prod. Le push sur `main` applique les migrations sur `poli-prod` et Vercel déploie la production.

Personne ne pousse directement sur `develop`, `stage` ni `main` : `develop` n'accepte que des PR dont la CI passe, et seul le workflow Promote peut avancer `stage` et `main`.

## Secrets

Les secrets vivent dans des environnements GitHub, chacun lisible seulement depuis sa branche. Aucun n'est dans le dépôt ni dans le `.env` local.

| Où | Nom | Lisible depuis | Contenu |
| --- | --- | --- | --- |
| GitHub, environnement `develop` | `DATABASE_URL` | `develop` | Adresse *Session pooler* (port 5432) de `poli-develop` |
| GitHub, environnement `production` | `DATABASE_URL` | `main` | Adresse *Session pooler* (port 5432) de `poli-prod` |
| GitHub, environnement `stage` | `DATABASE_URL` | `stage` | Vide pour l'instant : les migrations sont sautées |
| GitHub, environnement `release` | `RELEASE_PLEASE_TOKEN` | `develop` | Jeton GitHub à grain fin, droits *Contents* et *Pull requests* en écriture sur Poli |
| GitHub, environnement `promotion` | `PROMOTE_SSH_KEY` | `develop` | Clé privée de la clé de déploiement « Poli promotion » |
| Vercel, Production | `DATABASE_URL` | `main` | Adresse *Transaction pooler* (port 6543) de `poli-prod` |
| Vercel, Preview branche `develop` | `DATABASE_URL` | `develop` | Adresse *Transaction pooler* (port 6543) de `poli-develop` |

Les adresses se trouvent dans Supabase : projet → **Connect** → onglet **Direct**. GitHub Actions utilise le *Session pooler*, car ses machines n'ont que l'IPv4 ; l'app utilise le *Transaction pooler*, adapté aux connexions courtes de Vercel.

Pour changer un secret GitHub : `gh secret set <NOM> --env <environnement> --repo TomEDX/Poli`, puis coller la valeur. Le jeton de release-please expire : le renouveler avant sa date d'expiration de la même façon.

## Réglages du dépôt

- Dépôt public, analyse des secrets et blocage des pushs qui en contiennent activés.
- Les workflows lancés par un contributeur extérieur attendent l'approbation d'un mainteneur.
- Règles de protection : `develop` exige une PR et les contrôles `check` et `commits` ; `stage` et `main` refusent tout push sauf celui de la clé de déploiement de promotion.

## Limites connues

- Vercel déploie en même temps que le workflow Migrate applique les migrations : pendant une minute, le nouveau code peut tourner sur l'ancien schéma. Les migrations doivent donc rester compatibles avec la version précédente.
- Un projet Supabase gratuit inactif environ 7 jours est mis en pause, ce qui peut toucher `poli-develop` : le relancer depuis le tableau de bord Supabase.
