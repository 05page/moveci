# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vroom** is a vehicle marketplace platform (buy/sell/rent) built as a monorepo with two separate applications:

- `Vroom-ci/` — Next.js 16 frontend (TypeScript, App Router)
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
5. `Vroom-ci/middleware.ts` protects `/client/*`, `/vendeur/*`, `/partenaire/*` routes by checking this cookie

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
    