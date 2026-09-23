# Vroom

Plateforme de marketplace véhicule (achat / vente / location) en Côte d'Ivoire, avec un volet formation auto-école. Monorepo à deux applications séparées :

- `Vroom-ci/` — frontend Next.js 16 (TypeScript, App Router)
- `vroom-backend/` — backend Laravel 12 (PHP 8.2+, API REST)

## Démarrage rapide

Les deux serveurs doivent tourner en même temps.

### Backend (`vroom-backend/`)

```bash
cd vroom-backend
composer install
cp .env.example .env      # configurer DB_*, GEMINI_API_KEY, GOOGLE_*, MAIL_*, FRONTEND_URL
php artisan key:generate
php artisan migrate --seed
php artisan serve         # http://localhost:8000
```

Pour les fonctionnalités temps réel (messagerie, notifications live), lancer aussi le serveur Reverb :

```bash
php artisan reverb:start
```

Et le scheduler (expiration des réservations, rappels, détection de tendances) :

```bash
php artisan schedule:work
```

### Frontend (`Vroom-ci/`)

Le frontend est géré avec **pnpm** (pas npm — voir `Vroom-ci/package.json`, champ `packageManager`).

```bash
cd Vroom-ci
cp .env.local.example .env.local   # configurer BACKEND_URL, NEXT_PUBLIC_BACKEND_URL
pnpm install
pnpm dev                            # http://localhost:3000
```

### Tests

```bash
cd vroom-backend && php artisan test    # Pest, backend
cd Vroom-ci && pnpm test                # Vitest, frontend
```

## Rôles utilisateur

Cinq rôles stockés directement sur `users.role` : `client`, `vendeur`, `concessionnaire`, `auto_ecole`, `admin`. Pas de rôle `partenaire` intermédiaire — `concessionnaire`/`auto_ecole` sont regroupés sous `/partenaire` côté frontend par convention d'UI uniquement.

## Documentation

Ce projet a été construit par itérations réactives, sans phase de conception amont — la documentation ci-dessous reconstruit a posteriori ce qui existe réellement (voir [`PLAN-RATTRAPAGE.md`](PLAN-RATTRAPAGE.md) pour le contexte complet) :

- [`PLAN-RATTRAPAGE.md`](PLAN-RATTRAPAGE.md) — plan de rattrapage : état des lieux, chantiers en cours, suivi
- [`docs/MCD-MLD.md`](docs/MCD-MLD.md) — modèle conceptuel et logique de données, reconstruit à partir des migrations
- [`docs/REGLES-METIER.md`](docs/REGLES-METIER.md) — règles métier découvertes en cours de route et jamais écrites
- [`docs/CHOIX-TECHNIQUES.md`](docs/CHOIX-TECHNIQUES.md) — pourquoi chaque techno majeure a été choisie
- [`CLAUDE.md`](CLAUDE.md) — guide technique pour travailler sur le code (architecture, conventions, patterns)

## Conception avant code

Pour toute nouvelle fonctionnalité à partir de maintenant : un paragraphe de conception (impact données, impact rôles, impact API) avant le premier commit de code — voir Phase 3 de `PLAN-RATTRAPAGE.md`.

## Workflow git (depuis le 2026-07-25)

`main` est protégée : un push direct n'est plus possible (même pour un admin du repo), et `git push` déclenche un déploiement backend réel vers la prod (voir [`docs/CHECKLIST-DEPLOIEMENT.md`](docs/CHECKLIST-DEPLOIEMENT.md)). Pour toute feature ou fix :

1. `git checkout -b <type>/<nom-court>` (ex. `feat/favoris-vehicule`)
2. Le paragraphe de conception ci-dessus devient la description de la Pull Request
3. `git push -u origin <branche>` puis `gh pr create` — la CI (`Backend`, `Frontend`) tourne sur la PR, avant tout merge, jamais après
4. Merger seulement une fois les deux checks verts — c'est ce merge vers `main` qui déclenche le déploiement backend automatique
