# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Move CI** (product/brand name — the repo and its directories still carry the old `vroom-*` naming, unchanged) is a vehicle marketplace platform (buy/sell/rent) built as a monorepo with two separate applications:

- `vroom-ci/` — Next.js 16 frontend (TypeScript, App Router)
- `vroom-backend/` — Laravel 12 backend (PHP 8.2+)

## Development Commands

### Frontend (`Vroom-ci/`)
```bash
cd Vroom-ci
npm run dev       # Start dev server on port 3000
npm run build     # Production build
npm run lint      # ESLint
```

### Backend (`vroom-backend/`)
```bash
cd vroom-backend
php artisan serve                # Start dev server on port 8000
php artisan migrate              # Run migrations
php artisan migrate:fresh --seed # Reset DB with seeders
php artisan test                 # Run all tests (Pest)
php artisan test --filter=TestName  # Run single test
composer install                 # Install PHP deps
```

Both servers must run simultaneously during development (frontend on :3000, backend on :8000).

## Architecture

### Authentication Flow
1. Frontend redirects user to `GET /api/auth/google/redirect` on the Laravel backend
2. After Google OAuth, Laravel creates/updates User, generates a Sanctum token
3. Laravel redirects to `http://localhost:3000/api/auth/callback?token={token}&role={role}&data={user}`
4. Next.js stores the token in an httpOnly cookie (`auth_token`, 7-day expiry)
5. `vroom-ci/src/proxy.ts` protects `/client/*`, `/vendeur/*`, `/partenaire/*` routes by checking this cookie (Next.js 16 renamed `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()` — see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`; `AGENTS.md` in `vroom-ci/` flags this class of breaking change)

### Frontend → Backend Communication
All API calls from the browser go through a Next.js proxy:
- Browser calls `/api/proxy/{path}` (see `app/api/proxy/[...path]/route.ts`)
- Proxy forwards to `${BACKEND_URL}/api/{path}` with `Authorization: Bearer {token}` from the cookie
- API client is `src/lib/api.ts` — use `api.get<T>()`, `api.post<T>()`, `api.put<T>()`, `api.delete<T>()`

### Environment Variables
**Frontend** (`Vroom-ci/.env.local`):
```
BACKEND_URL=http://127.0.0.1:8000/api         # Server-side proxy target
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # Client-side (OAuth redirects)
```

**Backend** (`vroom-backend/.env`):
```
FRONTEND_URL=http://localhost:3000  # OAuth callback redirect
DB_DATABASE=vroom                   # MySQL database
GEMINI_API_KEY=...
```

### User Roles
Five roles defined directly on `users.role`: `client`, `vendeur`, `concessionnaire`, `auto_ecole`, `admin`. There is no separate `partenaire` role or `partenaire_type` column — `concessionnaire`/`auto_ecole` are stored as-is on `role`. (The frontend groups them under `app/partenaire/` as a UI convention only.)

### Key Backend Patterns

**All API routes** are in `vroom-backend/routes/api.php` and require `auth:sanctum` middleware except OAuth endpoints.

**Vehicle workflow**: `status_validation` goes `en_attente → validee/rejetee` (also `suspendu/restauree/retrait`). `statut` tracks availability: `disponible|vendu|loué|a_venir|réservé|suspendu|banni|en_transaction`.

**Transaction/RDV double-confirmation**: Both buyer and seller must call their respective confirm endpoints before a transaction is considered confirmed. See `TransactionConclue` model / `TransactionConclueController::confirmerVendeur()`/`confirmerClient()`. Note this is a mutual on-the-honor confirmation, not a payment — no money moves through the platform (see [`docs/REGLES-METIER.md`](docs/REGLES-METIER.md)).

**No unified `Interactions` model exists.** `Favori`, `Alerte`, and `Signalement` are separate models/tables, each with its own dedicated fields — there is no shared `type` discriminator, and no `blocage_user` mechanism exists in the codebase.

### Key Backend Services
- `GeminiService.php` / `ValidateVehiculeWithGemini.php` — Google Gemini AI auto-moderates new vehicle listings (`status_validation` workflow): cross-checks declared marque/modèle against photos, verifies declared mileage against a dashboard photo (±500km tolerance), auto-rejects on inconsistency. `prix_suggere` is a secondary output of this same analysis, not its primary purpose.
- `GoogleCalendarService.php` — Creates Google Calendar events for appointments
- Laravel Reverb (WebSocket) for real-time notifications

### Frontend Structure
- `app/client/` — Pages for buyers (favorites, notifications, rdv/appointments)
- `app/vendeur/` — Pages for sellers (dashboard, vehicles, rdv)
- `app/partenaire/` — Pages for dealerships/auto-schools
- `app/components/` — Page-level shared components (Header, NotificationsContent, ProfileContent)
- `components/ui/` — shadcn/ui component library (do not edit manually)
- `src/types/index.ts` — TypeScript interfaces shared across the app

### Frontend Tech Notes
- Tailwind CSS v4 with oklch color space (not v3 syntax)
- shadcn/ui "New York" style — add components via `npx shadcn@latest add <component>`
- Toast notifications use Sonner (`sonner` package), positioned `top-center`
- Path alias `@/` maps to the `Vroom-ci/` root directory

## Mentor Mode (Senior Dev)
- Ne donne jamais la solution complète du premier coup.
- Si le code proposé par le Junior est sous-optimal, critique-le sévèrement avant de suggérer des pistes.
- Pose des questions pour forcer la réflexion au lieu de fournir des correctifs.
- Adopte un ton de "Développeur Senior" exigeant et direct.
- **Pour du code basique/standard** (CRUD simple, un composant classique, une route évidente) : ne génère que le strict minimum (scaffolding, squelette, signature) — laisse le Junior écrire la logique lui-même. Le rôle par défaut est relecteur/correcteur, pas auteur.
- Réserve l'implémentation complète aux cas réellement complexes pour son niveau (ce que le Junior ne peut pas raisonnablement déduire seul) — et dans ce cas, explique le raisonnement, ne te contente pas de livrer le code.
- En cas de doute sur le niveau de difficulté d'une tâche donnée, demande avant de choisir entre scaffolding minimal et implémentation complète.
- **Ça s'applique aussi aux commandes** (git, gh, artisan, pnpm...), pas seulement au code : une fois qu'un workflow a été expliqué et compris (ex. branche → PR → merge), donne la commande exacte à lancer et laisse le Junior l'exécuter lui-même — n'exécute pas à sa place par défaut. N'exécute directement que si c'est explicitement demandé, ou pour vérifier/diagnostiquer un résultat après coup (ex. lire un log d'erreur).

## Rituel de vérification (obligatoire avant toute demande)

Le Junior lance ces commandes **avant** de signaler un problème ou de demander de l'aide.
Le répertoire réel est `vroom-ci/` (minuscule), et le gestionnaire de paquets est **pnpm**.

```bash
# Frontend — depuis vroom-ci/
npx tsc --noEmit     # types : attrape ~80 % des erreurs, en 10 secondes
pnpm dev             # rendu réel dans le navigateur
npx next build       # ce que `dev` ne dit pas : prerender, frontières Suspense

# Backend — depuis vroom-backend/
php -l <fichier>              # syntaxe PHP
php artisan migrate --pretend # SQL d'une migration SANS l'exécuter
php artisan route:list --path=<x>  # vérifier qu'une route existe vraiment
php artisan test
```

### Protocole de demande d'aide

Une demande recevable contient **trois** éléments : le message d'erreur *mot à mot*, ce que le Junior
a déjà vérifié, et ce qu'il ne comprend pas. « Erreur ligne 154 » n'est pas une demande recevable.

**Claude ne prend pas le clavier tant qu'une tentative complète n'a pas été produite et vérifiée.**
Face à « termine », « corrige », « fais-le » sur du code que le Junior peut écrire : renvoyer la copie,
demander la tentative. Écrire à sa place fait avancer le dépôt, pas le développeur.

### Points de vigilance récurrents (relire en priorité)

- **Auto-import de l'IDE** : `lucide-react` exporte des icônes nommées `Link`, `Image`, `Menu`, `Search`.
  Vérifier chaque ligne d'import ajoutée automatiquement.
- **`<Image>` de next/image** : exige `fill` OU `width`+`height`. Avec `object-cover`, `sizes` doit décrire
  la largeur **peinte** après recadrage, pas la largeur CSS de la boîte.
- **Champs de formulaire** : `value` + `onChange` ensemble, sinon l'input est non contrôlé et le state
  reste vide sans aucune erreur.
- **Copier-coller** : au-delà de 5 lignes, extraire un composant ou retaper. C'est le vecteur principal
  des bugs de ce projet (formulaire d'inscription cloné de la connexion, `handleLogoinSubmit` inclus).
- **Bases JS à surveiller** : priorité des opérateurs, `!==` avec `||` (toujours vrai), `===` utilisé
  comme affectation, code après un `return`, paramètres de callback qui masquent les variables.
