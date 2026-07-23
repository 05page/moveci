# Checklist de déploiement — Vroom

> Phase 4 de [`PLAN-RATTRAPAGE.md`](../PLAN-RATTRAPAGE.md). À dérouler avant toute mise en production ou changement d'hébergeur.

## Backend (`vroom-backend/`)

- [ ] `.env` en production : `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` généré (`php artisan key:generate`), toutes les variables de [`.env.example`](../vroom-backend/.env.example) renseignées
- [ ] `BROADCAST_CONNECTION=pusher` (pas `reverb`) en production — voir [`CHOIX-TECHNIQUES.md`](CHOIX-TECHNIQUES.md), Reverb auto-hébergé ne convient qu'au dev local
- [ ] `composer install --no-dev --optimize-autoloader`
- [ ] `php artisan migrate --force` (jamais `migrate:fresh` en prod — perte de données)
- [ ] Seeders : `PlanAbonnementSeeder` (idempotent, à rejouer sans risque) et `AdminSeeder` (idempotent via `updateOrCreate` sur l'email admin — **bug corrigé le 2026-07-23** : mettait `niveau_acces => 1`, valeur invalide pour l'ENUM `{standard, super_admin}`, le seeder plantait). Définir `ADMIN_EMAIL`/`ADMIN_PASSWORD` en variables d'env avant de lancer, sinon un mot de passe aléatoire est généré et affiché une seule fois en console.
- [ ] `php artisan storage:link` — nécessaire pour servir les photos véhicules (`Storage::disk('public')`)
- [ ] `php artisan config:cache && php artisan route:cache && php artisan view:cache`
- [ ] Queue worker actif en continu (`QUEUE_CONNECTION=database`) : `php artisan queue:work` supervisé (systemd/Supervisor), sinon `ValidateVehiculeWithGemini` (modération IA) ne se traite jamais
- [ ] Scheduler actif : cron `* * * * * php artisan schedule:run` — sans lui, `ExpireReservations`, `SendReservationReminders` et `CheckTendances` (`tendances:check`, horaire) ne tournent jamais
- [ ] `php artisan test` vert avant tout déploiement

## Frontend (`Vroom-ci/`)

- [ ] Le projet utilise **pnpm**, pas npm (voir `package.json` → `packageManager`) — `pnpm install`, jamais `npm install`
- [ ] `.env.local` en production : toutes les variables de [`.env.local.example`](../Vroom-ci/.env.local.example), avec `NEXT_PUBLIC_PUSHER_KEY` défini (bascule automatique Reverb→Pusher, voir `src/lib/echo.ts`)
- [ ] `pnpm build` sans erreur
- [ ] `pnpm test` vert (28 tests Vitest — permissions, middleware, validators)
- [ ] `pnpm lint` sans erreur bloquante

## Vérifications transverses

- [ ] `FRONTEND_URL` (backend) et `NEXT_PUBLIC_BACKEND_URL`/`BACKEND_URL` (frontend) pointent bien l'un vers l'autre en prod (pas de `localhost` qui traîne)
- [ ] Callback OAuth Google (`GOOGLE_REDIRECT_URL`) enregistré dans la console Google Cloud pour le domaine de prod
- [ ] Clés `REVERB_*`/`PUSHER_*` identiques des deux côtés (backend/frontend)
- [ ] Aucun secret (`.env`, `.env.local`) commité — vérifier `.gitignore`
