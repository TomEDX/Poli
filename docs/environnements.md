# Environnements et promotion de version

Le code passe par local → develop → prod (ADR 0006). Ce document décrit comment l'ensemble est branché, comment livrer une version et quels secrets existent.

## Vue d'ensemble

| Environnement | Branche | Base Supabase | Déploiement Vercel |
| --- | --- | --- | --- |
| Local | toutes | Supabase local (Docker), lancé par `pnpm dev` | aucun |
| Develop | `develop` | projet `poli-develop` | déploiement Preview de la branche `develop`, sur https://poli-git-develop-tomedx.vercel.app (connexion Vercel requise) |
| Prod | `main` | projet `poli-prod` | déploiement Production, public sur https://poli-topaz.vercel.app |

Le fichier [vercel.json](../vercel.json) ne laisse Vercel construire que `develop` et `main`.

Les autres adresses Vercel (`poli-git-main-…`, `poli-tomedx…`, ou celles qui contiennent un identifiant de déploiement) sont réservées aux personnes connectées au compte Vercel.

## Livrer une version

1. Une branche de fonctionnalité fait une PR vers `develop`. La PR est fusionnée en squash : son titre devient le message du commit et doit suivre le format conventional commits (`feat: …`, `fix: …`, `docs: …`).
2. À chaque push sur `develop`, le workflow **Migrate** applique les migrations Drizzle sur `poli-develop`, Vercel redéploie develop, et release-please met à jour sa PR de version (numéro de version et changelog).
3. Pour figer une version, fusionner la PR de release-please dans `develop`. Elle crée le tag et la release GitHub.
4. Pour mettre en prod, lancer le workflow **Promote** depuis l'onglet Actions. Il avance `main` jusqu'à `develop` en avance rapide, sans créer de commit : la version testée sur develop est celle qui arrive en prod. Le push sur `main` applique les migrations sur `poli-prod` et Vercel déploie la production.

Personne ne pousse directement sur `develop` ni `main` : `develop` n'accepte que des PR dont la CI passe, et seul le workflow Promote peut avancer `main`.

## Secrets

Les secrets vivent dans des environnements GitHub, chacun lisible seulement depuis sa branche. Aucun n'est dans le dépôt ni dans le `.env` local.

| Où | Nom | Lisible depuis | Contenu |
| --- | --- | --- | --- |
| GitHub, environnement `develop` | `DATABASE_URL` | `develop` | Adresse *Session pooler* (port 5432) de `poli-develop` |
| GitHub, environnement `production` | `DATABASE_URL` | `main` | Adresse *Session pooler* (port 5432) de `poli-prod` |
| GitHub, environnement `release` | `RELEASE_PLEASE_TOKEN` | `develop` | Jeton GitHub à grain fin, droits *Contents* et *Pull requests* en écriture sur Poli |
| GitHub, environnement `promotion` | `PROMOTE_SSH_KEY` | `develop` | Clé privée de la clé de déploiement « Poli promotion » |
| Vercel, Production | `DATABASE_URL` | `main` | Adresse *Transaction pooler* (port 6543) de `poli-prod` |
| Vercel, Preview branche `develop` | `DATABASE_URL` | `develop` | Adresse *Transaction pooler* (port 6543) de `poli-develop` |
| Vercel, Production | `SUPABASE_URL` | `main` | `https://<identifiant>.supabase.co` de `poli-prod` |
| Vercel, Production | `SUPABASE_PUBLISHABLE_KEY` | `main` | Clé *publishable* (`sb_publishable_…`) de `poli-prod` |
| Vercel, Preview branche `develop` | `SUPABASE_URL` | `develop` | `https://<identifiant>.supabase.co` de `poli-develop` |
| Vercel, Preview branche `develop` | `SUPABASE_PUBLISHABLE_KEY` | `develop` | Clé *publishable* (`sb_publishable_…`) de `poli-develop` |

Les adresses se trouvent dans Supabase : projet → **Connect** → onglet **Direct**. GitHub Actions utilise le *Session pooler*, car ses machines n'ont que l'IPv4 ; l'app utilise le *Transaction pooler*, adapté aux connexions courtes de Vercel.

L'identifiant du projet est dans **Project Settings → General**, la clé *publishable* dans **Project Settings → API Keys**. Elle peut être publique ; la clé secrète (`sb_secret_…`) n'est utilisée nulle part.

Pour changer un secret GitHub : `gh secret set <NOM> --env <environnement> --repo TomEDX/Poli`, puis coller la valeur. Le jeton de release-please expire : le renouveler avant sa date d'expiration de la même façon.

## Connexion des éditeurs

Les éditeurs se connectent à `/admin` par lien magique (Supabase Auth). Supabase ne sert qu'à l'authentification : la Data API est désactivée et l'app lit et écrit la base par Drizzle. Un éditeur est un compte Supabase Auth dont l'adresse figure dans la table `editors`.

Réglages de chaque projet Supabase, dans **Authentication** :

| Réglage | `poli-develop` | `poli-prod` |
| --- | --- | --- |
| **Sign In / Providers** → *Allow new users to sign up* | désactivé | désactivé |
| **URL Configuration** → *Site URL* | `https://poli-git-develop-tomedx.vercel.app` | `https://poli-topaz.vercel.app` |
| **URL Configuration** → *Redirect URLs* | `https://poli-git-develop-tomedx.vercel.app/auth/confirm` | `https://poli-topaz.vercel.app/auth/confirm` |

Les e-mails partent du service intégré de Supabase, avec le modèle par défaut. Ce service n'écrit qu'aux membres de l'organisation Supabase et limite les envois (quelques e-mails par heure) : chaque éditeur doit être invité dans l'organisation (**Organization Settings → Team → Invite**). Un projet gratuit ne peut pas modifier ses modèles d'e-mail sans SMTP externe ; le lien du modèle par défaut ne fonctionne donc que dans le navigateur où il a été demandé.

### Ajouter un éditeur

1. Inviter la personne dans l'organisation Supabase si ce n'est pas déjà fait (voir ci-dessus).
2. Dans le projet, **Authentication → Users → Add user → Create new user** : son adresse, un mot de passe aléatoire jamais réutilisé (`openssl rand -base64 32`), *Auto Confirm User* coché. La connexion se fait par lien magique, le mot de passe ne sert pas.
3. Dans **SQL Editor**, ajouter l'adresse en minuscules :

   ```sql
   insert into editors (email) values ('prenom.nom@exemple.fr');
   ```

4. La personne demande un lien sur `/sign-in` et l'ouvre dans le même navigateur.

Pour retirer un éditeur, supprimer sa ligne de `editors` (il perd l'accès à l'administration) puis son compte dans **Authentication → Users**.

En local, même procédure dans le studio (http://127.0.0.1:54323) ; les e-mails arrivent dans Mailpit (http://127.0.0.1:54324), sans invitation.

## Réglages du dépôt

- Dépôt public, analyse des secrets et blocage des pushs qui en contiennent activés.
- Les workflows lancés par un contributeur extérieur attendent l'approbation d'un mainteneur.
- Règles de protection : `develop` exige une PR et les contrôles `check` et `commits` ; `main` refuse tout push sauf celui de la clé de déploiement de promotion.

## Limites connues

- Vercel déploie en même temps que le workflow Migrate applique les migrations : pendant une minute, le nouveau code peut tourner sur l'ancien schéma. Les migrations doivent donc rester compatibles avec la version précédente.
- Un projet Supabase gratuit inactif environ 7 jours est mis en pause, ce qui peut toucher `poli-develop` : le relancer depuis le tableau de bord Supabase.
