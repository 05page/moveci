# Move CI — Backend (vroom-backend)

API REST Laravel 12 pour le marketplace véhicule Move CI. Consommée exclusivement par `vroom-ci/` via son proxy Next — ce backend ne sert aucune vue, pas de Blade en usage réel (le scaffolding npm/Vite mort a été supprimé, voir historique git `91cf776`).

## Stack

- Laravel 12, PHP 8.2+
- Laravel Sanctum (tokens API, pas de sessions cookie côté backend)
- Laravel Socialite (OAuth Google — login)
- `google/apiclient` (Google Calendar par vendeur, OAuth stocké en DB — utilisé directement dans `GoogleCalendarService.php`, pas via un package Laravel dédié)
- `google-gemini-php/*` — auto-modération des annonces véhicule (`GeminiService.php` / `ValidateVehiculeWithGemini.php`)
- Laravel Reverb (WebSocket, temps réel) — bascule vers Pusher en prod selon les variables d'env définies (voir `src/lib/echo.ts` côté frontend)
- Pest pour les tests (`tests/Feature/`, `tests/Unit/`)

## Démarrage local

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve                # http://localhost:8000
```

Pour les fonctionnalités temps réel (messagerie, notifications live) :

```bash
php artisan reverb:start
```

Variables clés à renseigner dans `.env` (voir `.env.example` pour la liste complète et les commentaires) :

```
FRONTEND_URL=http://localhost:3000   # redirection OAuth Google
DB_DATABASE=vroom
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URL
GEMINI_API_KEY                        # https://aistudio.google.com/app/apikey
REVERB_APP_ID / REVERB_APP_KEY / REVERB_APP_SECRET
```

Rituel avant de signaler un bug (voir aussi `CLAUDE.md` racine, section "Mentor Mode") :

```bash
php -l <fichier>                    # syntaxe PHP
php artisan migrate --pretend       # SQL d'une migration SANS l'exécuter
php artisan route:list --path=<x>   # vérifier qu'une route existe vraiment
php artisan test                    # Pest — tests/Feature/ + tests/Unit/
```

## Architecture

Toutes les routes API sont dans `routes/api.php`, sous `auth:sanctum` sauf les endpoints OAuth. Pas de route web fonctionnelle.

### Rôles

Cinq valeurs directement sur `users.role` : `client`, `vendeur`, `concessionnaire`, `auto_ecole`, `admin`. Pas de colonne `partenaire_type` séparée — le frontend regroupe `concessionnaire`/`auto_ecole` sous `/partenaire` par convention d'affichage uniquement.

### Workflow véhicule

- `status_validation` : `en_attente → validee/rejetee` (aussi `suspendu/restauree/retrait`) — piloté par la modération Gemini automatique à la publication.
- `statut` (disponibilité) : `disponible|vendu|loué|a_venir|réservé|suspendu|banni|en_transaction`.
- **Ces deux colonnes évoluent indépendamment** — aucun garde-fou identifié empêchant un état incohérent (ex. `statut: disponible` alors que `status_validation` n'est pas `validee`). Chantier ouvert, pas de correctif en place.

### Transaction / RDV — double confirmation

Client ET vendeur doivent chacun appeler leur endpoint de confirmation (`TransactionConclueController::confirmerClient()` / `confirmerVendeur()`) pour qu'une transaction soit considérée conclue. C'est une confirmation sur l'honneur, **aucun argent ne transite par la plateforme**.

### Pas de modèle `Interactions` unifié

`Favori`, `Alerte`, `Signalement` sont trois tables/modèles séparés, chacun avec ses propres champs — pas de discriminant `type` partagé, pas de mécanisme `blocage_user`.

### Géolocalisation retirée

`GeolocalisationController.php` a été supprimé et aucune route `/geo/*` ne subsiste dans `routes/api.php` (vérifié au 2026-09-11). Si `docs/MODULES.md` ou du code frontend y font encore référence, c'est obsolète.

## Bugs backend connus, non corrigés (vérifiés dans le code au 2026-09-11)

Repérés en croisant le frontend contre les contrôleurs Laravel. Utile pour ne pas re-découvrir les mêmes symptômes plus tard.

**`VendeurStatsController`**
1. `mesStats()` — dans `$statsMensuel`, la clé `'locations'` n'a pas de `->where('created_by', $user->id)` (contrairement à `'ventes'`/`'vues'` juste à côté, et contrairement à `$statsSemaine` qui est correct) : elle compte les locations de toute la plateforme, pas celles du vendeur connecté.
2. `mesStats()` — `catch (\Exception $e) {}` vide en fin de méthode : toute erreur SQL ressort en `{success: false, message: "Erreur survenue"}` sans aucune trace exploitable.
3. `profil()` — `'nb_avis' => $avis->count()` est calculé après un `take(10)`, plafonné à 10, alors que `note_moyenne` porte sur tous les avis (`Avis::where(...)->avg('note')`). Un vendeur à 37 avis affichera « 4.8 (10 avis) ».

**`VehiculesController`**
4. **Fuite d'email.** `index()` (ligne ~32) et `vehicule()` (ligne ~95) chargent `creator:id,fullname,email,role` / `creator:id,fullname,email` sur des routes **publiques** (pas de `auth:sanctum`). L'email de chaque vendeur est lisible par n'importe quel visiteur anonyme. Retirer `email` du `with()` sur ces deux méthodes (`populaires()` ne charge pas l'email, c'est le bon modèle à suivre).
5. **La forme de `data` change selon le contenu.** `index()` renvoie `data: []` quand le catalogue est vide, `data: { vehicules, statsVehicules }` sinon. Le frontend contourne via `normaliserCatalogue()` — mais un futur endpoint ou consommateur direct s'y ferait piéger.
6. `statsVehicules` (`total_vehicules` notamment) passe par le scope `validee()` sans filtrer `statut`, donc compte aussi les véhicules vendus/loués que la liste elle-même exclut.
7. `index()` n'accepte aucun paramètre : pas de filtre, tri, recherche, ni pagination. Tenable tant que le stock est petit.

**`Conversation` / `ConversationController`**
8. **`scopeForUser()` a un `OR` non parenthésé** (`app/Models/Conversation.php`) : `where('participant_1_id', $userId)->orWhere('participant_2_id', $userId)` sans closure. Combiné à `findOrFail($id)` dans `getConversationForUser()`, le SQL généré est `WHERE participant_1_id = X OR (participant_2_id = X AND id = Y)` — l'`AND` lie plus fort que l'`OR`. La méthode peut renvoyer **une autre conversation de l'utilisateur** que celle demandée (pas une fuite inter-utilisateurs, la première branche impose déjà `participant_1_id = X`). Touche `messages()`, `send()`, `destroyMessage()`. Correctif : envelopper dans `$query->where(function ($q) use ($userId) { ... })`.
9. `findOrCreate()` répond 201 même quand la conversation existait déjà (`firstOrCreate`) — trompeur pour un client qui distingue création/récupération sur le code HTTP.
10. `messages()` : `->get()` sans pagination, toute la conversation part dans une seule réponse.

**`NotificationsController` / `Notifications`**
11. `abonnement` traîne encore dans le CHECK de l'enum `notifications.type` bien que les abonnements aient été supprimés (commit `cdb70b2`) et que le modèle n'ait plus que 8 constantes. D'anciennes lignes peuvent encore porter cette valeur.
12. `$appends = ['is_read']` fait sortir deux champs pour la même donnée : `lu` (colonne) et `is_read` (accesseur).
13. `index()` : `->get()` sans pagination sur tout l'historique, lues comprises.
14. `markAsRead()`/`markAsAllRead()` renvoient un message, pas la notification modifiée — le frontend doit mettre à jour son état lui-même.

**Question de modélisation ouverte** : `transactions_conclues.prix_final` sert à la fois de prix de vente et de tarif de location, sans champ indiquant si le tarif est journalier ou total. Actuellement tranché côté frontend (affichage « / jour » pour une location) — à formaliser côté backend si ça reste ambigu.

**Fait structurant** : il n'existe aucun endpoint de stats client. `/stats/mes-stats` est derrière `role:vendeur,concessionnaire,auto_ecole` ; un client prend un 403. Les compteurs du profil client sont une projection calculée côté frontend depuis `transactions-conclues/mes-demandes`.

## Déploiement & CI

Le vrai pipeline est `.github/workflows/ci.yml` à la racine du monorepo (`docs/WORKFLOW-DEPLOIEMENT.md` décrit le processus Git — branche → PR → merge — pas l'infra de déploiement).

- **Job `backend`** : sur chaque push/PR vers `main`, installe les dépendances Composer et lance `php artisan test` (Pest).
- **Job `deploy-backend`** : seulement sur un push réel vers `main` (jamais sur une PR non mergée). Se connecte en SSH sur **Hostinger** (secrets `HOSTINGER_HOST`/`HOSTINGER_USERNAME`/`HOSTINGER_SSH_KEY`/`HOSTINGER_PORT`/`HOSTINGER_DEPLOY_PATH`) et exécute : `git pull origin main` → `composer install --no-dev` → `php artisan migrate --force` → `storage:link` → cache config/route/vue.
- **Queue Gemini (modération auto)** : pas de worker persistant sur ce plan Hostinger. Le job `ValidateVehiculeWithGemini` est traité par un cron `queue:work --stop-when-empty` (documenté nulle part ailleurs que ce commentaire dans `ci.yml` — `docs/CHECKLIST-DEPLOIEMENT.md`, référencé par ce même fichier et par `PLAN-RATTRAPAGE.md`, **n'existe pas dans le dépôt**). Si le cron n'est pas configuré côté Hostinger (hors de ce repo), la modération auto ne tourne jamais — à vérifier directement sur le serveur, pas dans le code.
- **Aucun déploiement backend hors de ce job** : pas de staging, pas de rollback automatisé — un `git pull` cassé sur `main` part directement en prod.

Le job `frontend` du même fichier CI est actuellement **cassé** (mauvaise casse de dossier + script de test qui n'existe plus) — détails dans `vroom-ci/README.md`, section Déploiement & CI. Ça n'affecte pas le déploiement backend (jobs indépendants), mais un push sur `main` aujourd'hui a de bonnes chances d'afficher ce check en échec — ne pas le confondre avec une vraie régression backend.

## Documentation complémentaire (à vérifier avant de s'y fier)

`docs/ARCHITECTURE.md` et `docs/MODULES.md` (racine du monorepo) datent du 2026-08-11 et décrivent une cible frontend qui n'a pas été suivie après la reconstruction du 08-12/08-17 — ne t'y fie pas pour l'état du frontend. Côté backend, ce README et `CLAUDE.md` (racine) reflètent l'état réel du code vérifié au 2026-09-11 ; `docs/REGLES-METIER.md`, référencé depuis le `README.md` racine et `PLAN-RATTRAPAGE.md`, **n'existe pas dans le dépôt** — dette de documentation à combler si les règles métier (confirmation sur l'honneur, pas de modèle `Interactions`, etc.) doivent être formalisées ailleurs que dans ce README.
