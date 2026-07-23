# Plan de rattrapage — Vroom

> Doc de travail, pas un rapport figé. On coche, on complète, on corrige au fur et à mesure. Objectif : passer d'un projet codé par itérations réactives à un projet documenté, modélisé et livrable.

## Pourquoi ce doc existe

Constat posé le 2026-07-22 : le projet a été construit sans phase de conception amont (pas de cahier des charges, pas de MCD avant les migrations, pas de doc d'architecture avant le code). Résultat visible dans l'historique git : beaucoup de commits `fix(...)` et `refactor(...)` sur des choses déjà construites, un schéma de données élargi après coup (`élargissement des ENUM MySQL`, `compatibilité SQLite`), et une stack accumulée package par package plutôt que choisie comme un ensemble cohérent (3 intégrations Google différentes : `google-gemini-php`, `google/apiclient`, `spatie/laravel-google-calendar`).

Ce doc ne réécrit pas le projet. Il reconstruit la conception qui manque, a posteriori, et fixe une trajectoire vers un état livrable.

## État des lieux (chiffres, pas d'opinion)

- 28 modèles Eloquent dans `vroom-backend/app/Models/`
- 50 fichiers de migration dans `vroom-backend/database/migrations/`
- `routes/api.php` : 258 lignes
- Tests backend réels : 1 seul fichier de feature test métier (`RendezVousTest.php`) + 2 fichiers `ExampleTest.php` par défaut de Laravel (non substantiels)
- Tests frontend : 0 (aucun framework de test dans `Vroom-ci/package.json`)
- Aucun `README.md` ni dossier `docs/` à la racine avant ce fichier
- 265 commits, aucun ne correspond à une étape de modélisation ou de spec écrite avant du code

## Phase 0 — Photographier l'existant

Objectif : avoir un document de référence qui décrit ce qui existe réellement, pas ce qu'on croit avoir codé.

- [x] MCD/MLD reconstruit à partir des 50 migrations actuelles (entités, relations, clés étrangères) — voir [`docs/MCD-MLD.md`](docs/MCD-MLD.md)
- [x] Lister les règles métier découvertes en cours de route et jamais écrites — voir [`docs/REGLES-METIER.md`](docs/REGLES-METIER.md) (aucune transaction financière sur la plateforme, RDV ≠ accord commercial, Reservation limitée aux véhicules "à venir", pas de modèle `Interactions` unifié ni de rôle `partenaire` malgré le `CLAUDE.md`)
- [~] Identifier les modèles qui se recoupent ou semblent redondants parmi les 28 : `Messages` vs `Conversation` résolu (colonnes mortes supprimées, frontière documentée). `Reservation` vs `RendezVous` vs `TransactionConclue` clarifié fonctionnellement (voir `docs/MCD-MLD.md` point d'attention 7) mais **décision produit encore ouverte** : que se passe-t-il quand une `Reservation` expire sans jamais déboucher sur rien ? À trancher avec ton collègue.
- [x] Suppression du code mort (2026-07-23) : modèles `Catalogue`, `PosteVendeur`, `StatistiqueVendeur` (jamais branchés à un controller/route) + colonnes `messages.vehicule_id`/`messages.rdv_id` (jamais lues/écrites depuis l'introduction de `Conversation`). Migrations `drop` dédiées + relations retirées des modèles `User`/`Vehicules`/`Abonnement`. Tests (12/12) verts après coup.
- [x] Bug corrigé (2026-07-23) : `reservations` avait une contrainte `UNIQUE(vehicule_id, client_id)` permanente au lieu d'être limitée aux réservations actives — après une seule annulation, un client ne pouvait plus jamais re-réserver le même véhicule (crash SQL masqué en erreur générique). Remplacée par `UNIQUE(vehicule_id, active_key)` avec `active_key` nullifié à l'annulation/expiration. Vérifié en conditions réelles via transaction DB annulée (create → cancel → re-create, et double réservation active toujours bloquée).

## Phase 1 — Consolider la stack

Objectif : que chaque dépendance ait une raison d'être unique, pas une raison historique.

- [x] Unifier les intégrations Google (2026-07-23) : audit révèle 4 packages, pas 3 — `laravel/socialite` (OAuth login, absent du `CLAUDE.md`), `google/apiclient` (utilisé directement dans `GoogleCalendarService.php`, OAuth par vendeur stocké en DB — **conservé, justifié**), `spatie/laravel-google-calendar` (installé, jamais utilisé une seule fois, `storage/app/google-calendar/` jamais créé — **supprimé via `composer remove` + `config/google-calendar.php`**), `google-gemini-php/*` (IA prix, sans rapport). Tests (12/12) verts après coup.
- [x] Documenter pourquoi chaque techno majeure a été choisie — voir [`docs/CHOIX-TECHNIQUES.md`](docs/CHOIX-TECHNIQUES.md). Au passage : Gemini sert à l'**auto-modération** des annonces (cohérence photo/description, kilométrage via tableau de bord), pas juste à suggérer un prix comme le dit `CLAUDE.md` ; `resend/resend-laravel` était installé mais jamais utilisé (mail réel via SMTP Hostinger) — retiré (2026-07-23)
- [x] Statuer sur les versions bleeding-edge (Next 16.2.9, React 19.2.3, Tailwind v4) — décision : upgrade assumé (aucune instabilité constatée), pas de gel. Voir [`docs/CHOIX-TECHNIQUES.md`](docs/CHOIX-TECHNIQUES.md).
- [x] Vérifier `zod` — sous-exploité, confirmé : seulement `registerValidator`/`loginValidator` l'utilisent, ~10 formulaires valident à la main (`addVehicle` en tête). Reporté comme chantier dédié — voir [`docs/CHOIX-TECHNIQUES.md`](docs/CHOIX-TECHNIQUES.md).

## Phase 2 — Couvrir les zones critiques par des tests

Objectif : ne plus découvrir les bugs en prod. Priorité aux flows où une régression coûte cher.

- [~] Auth — `tests/Feature/AuthTest.php` créé (2026-07-23) : login valide, login refusé (mauvais mot de passe, compte suspendu), register valide (4 tests). **Pas couvert** : OAuth Google (nécessite de mocker Socialite), cookie httpOnly + `middleware.ts` (aucune infra de test frontend — chantier séparé, voir Phase 1 zod).
- [x] Workflow véhicule — `tests/Feature/VehiculeWorkflowTest.php` créé (2026-07-23) : validation/rejet admin (`status_validation`), rejet sans motif refusé, non-admin bloqué, non-régression réservation (`statut` disponibilité). 2 bugs trouvés et corrigés au passage : `UserFactory::admin()` mettait `niveau_acces => 1` (ENUM invalide, jamais testé avant) ; `ReservationController::cancel()`/`ExpireReservations` remettaient un véhicule "à venir" directement en `disponible` sans vérifier `date_disponibilite`. Pas couvert : auto-modération Gemini (nécessite de mocker l'API, laissé de côté).
- [x] Transactions et RDV (double confirmation) — `tests/Feature/TransactionConclueTest.php` créé (2026-07-23) : confirmation client puis vendeur, ordre obligatoire (vendeur ne peut pas confirmer avant le client), mauvais code rejeté, finalisation → véhicule vendu, refus client et refus vendeur (avec signalement auto + compteur `nb_refus_transaction`). RDV déjà couvert par `RendezVousTest.php` (12 tests).
- [x] Permissions par rôle — `tests/Feature/PermissionsTest.php` créé (2026-07-23) : 401 non-authentifié, 403 mauvais rôle (CRM réservé vendeur/concessionnaire/auto_ecole, formations réservées auto_ecole), accès autorisé pour les bons rôles. Échantillon représentatif, pas exhaustif sur les 258 lignes de `routes/api.php`.
- [x] Frontend — infra Vitest + Testing Library installée (2026-07-23, via `pnpm` — voir note ci-dessous). 28 tests : `permission.test.ts` (logique d'accès par rôle), `middleware.test.ts` (redirections réelles via `NextRequest`), `validators.test.ts` (schémas zod login/register). **Pas couvert** : le formulaire `app/auth/page.tsx` lui-même (800 lignes, couplé à router/context) — chantier séparé. Découverte au passage : ce formulaire n'utilise même pas `registerValidator`/`loginValidator` (fetch brut + erreurs backend affichées telles quelles) — renforce le constat "zod sous-exploité" de la Phase 1.

## Phase 3 — Documentation vivante

- [x] `README.md` racine créé (2026-07-23) — projet, démarrage des deux serveurs (+ Reverb/scheduler), rôles, liens vers la doc
- [x] Cahier des charges rétroactif — voir [`docs/CAHIER-DES-CHARGES.md`](docs/CAHIER-DES-CHARGES.md) : matrice de permissions par rôle, 5 parcours utilisateurs critiques
- [x] Règle adoptée et écrite dans `README.md` : paragraphe de conception avant le premier commit de toute nouvelle feature

## Phase 4 — Prêt pour livraison

- [x] Variables d'environnement documentées et vérifiées (2026-07-23) : `vroom-backend/.env.example` était le boilerplate Laravel jamais mis à jour (`APP_NAME=Laravel`, pas de `FRONTEND_URL`/`GOOGLE_*`/`REVERB_*`, `BROADCAST_CONNECTION=log`) — corrigé. `Vroom-ci/.env.local.example` n'existait pas du tout — créé. Découverte au passage : le WebSocket bascule Reverb (dev) / Pusher (prod) selon les variables définies (`src/lib/echo.ts`), documenté dans `CHOIX-TECHNIQUES.md`.
- [x] Checklist de déploiement — voir [`docs/CHECKLIST-DEPLOIEMENT.md`](docs/CHECKLIST-DEPLOIEMENT.md). Bug trouvé et corrigé au passage : `AdminSeeder.php` mettait aussi `niveau_acces => 1` (même bug ENUM que `UserFactory::admin()` en Phase 2) — le seeder plantait. Vérifié en le rejouant réellement (`php artisan db:seed --class=AdminSeeder`). Bonus : `.gitignore` de `Vroom-ci` avait un pattern `.env*` sans exception — `.env.local.example` n'aurait jamais été commité, corrigé.
- [x] CI minimale — `.github/workflows/ci.yml` créé (2026-07-23) : job backend (`php artisan test`) + job frontend (`pnpm lint` non-bloquant/`pnpm test`/`pnpm build`). En la mettant en place, `pnpm build` s'est révélé **cassé en production** — creusé et corrigé :
  1. **11 pages `/admin/*`** avaient `"use client"` + `export const dynamic = "force-dynamic"` — option invalide en Client Component, provoquait un crash de prerendering. Retiré partout (aucune de ces pages n'a besoin de forcer le rendu dynamique, tout est fetché côté client).
  2. **Cause plus profonde** : des fichiers de lock parasites (`pnpm-lock.yaml`, `package-lock.json`, `bun.lock`) traînaient dans `C:\Users\jd\` (hors projet), faisant remonter Next.js vers la mauvaise racine de "monorepo" — bug connu de Next.js/Turbopack (vercel/next.js#87719, #90669). Supprimés.
  3. **Puis** : désaccord de casse Windows entre le dossier `Vroom-ci` et son symlink pnpm résolu en `vroom-ci` — cassait la résolution de modules Turbopack. Corrigé par une réinstallation propre de `node_modules`.
  4. Après ces fixes, un `pnpm build` local a échoué une fois sur un **out-of-memory** pendant le check TypeScript — probablement la machine saturée après cette très longue session (nombreux builds/tests enchaînés), pas un bug du code. CI configurée avec `NODE_OPTIONS=--max-old-space-size=6144` en marge de sécurité. **À revalider** : lancer `pnpm build` toi-même sur une machine au repos pour confirmer que ça passe proprement.
  - **Reste à faire manuellement** : supprimer `Vroom-ci/node_modules-stale-to-delete/` et `Vroom-ci/.next-stale-cache-to-delete/` (bloqués par la sandbox, pas trackés par git mais visibles dans `git status`) ; envisager `pnpm approve-builds` pour `sharp`/`unrs-resolver` si l'optimisation d'image devient nécessaire (actuellement `images.unoptimized: true`).
  5. **Bonus trouvé en revalidant Vitest après la réinstallation** : `vitest.config.ts` avait un pattern `include: ['**/__tests__/**/*.test.{ts,tsx}']` trop permissif — Vitest exécutait aussi les suites de tests internes des dépendances (`zod`, `@testing-library/jest-dom`...) trouvées dans `node_modules` : 203 fichiers / 1946 tests au lieu des 3 fichiers du projet, ~430s au lieu de ~10s. L'exclusion `node_modules` par défaut ne suffisait pas avec la structure symlinkée de pnpm. Corrigé avec des patterns ancrés à la racine (`src/**/__tests__/...`, `app/**/__tests__/...`, `__tests__/...` sans `**` en tête). Revérifié : 3/3 fichiers, 28/28 tests, ~12s.

## Suivi

| Date | Étape avancée | Note |
|------|----------------|------|
| 2026-07-22 | Doc créé, diagnostic initial posé | Phase 0 (MCD) prévue pour demain |
| 2026-07-23 | Phase 0 quasi close : MCD/MLD, règles métier, code mort supprimé, 1 bug corrigé (`reservations` UNIQUE) | Reste ouvert : pénalité si `Reservation` expire sans transaction. Passage en Phase 1. |
| 2026-07-23 | Phase 1 close : Google (spatie/resend morts retirés), choix techniques documentés, versions bleeding-edge assumées, zod audité (sous-exploité, reporté). `CLAUDE.md` racine corrigé sur 5 inexactitudes. | `Vroom-ci/CLAUDE.md` repéré comme sévèrement obsolète (décrit un état prototype révolu) — pas encore traité. |
| 2026-07-23 | Phase 2 close : `AuthTest` (4), `VehiculeWorkflowTest` (5, 2 bugs corrigés), `PermissionsTest` (6), `TransactionConclueTest` (6), suite backend à 33/33 ; infra Vitest côté frontend + 28 tests (permission/middleware/validators). `package.json` de `Vroom-ci` verrouillé sur pnpm (`npm install` cassait la résolution de dépendances). | Passage en Phase 3 (documentation vivante). |
