# Move CI — Frontend (vroom-ci)

Application Next.js du marketplace véhicule Move CI (achat/vente/location). Consomme l'API Laravel de `vroom-backend/` — ce repo ne parle **jamais** directement à MySQL, uniquement à l'API.

> **Avant de lire `docs/ARCHITECTURE.md` ou `docs/MODULES.md` à la racine du monorepo :** ces documents datent du 2026-08-11 et décrivent une architecture cible (couches `schema → api → hook → page`, tests Vitest, route groups `(public)/(client)/(pro)`) qui n'a **pas** été suivie telle quelle lors de la reconstruction des 2026-08-12/17. L'état réel est celui décrit ci-dessous, vérifié dans le code au 2026-09-11. Ne te fie pas non plus à `PLAN-RATTRAPAGE.md` ou au `README.md` racine sur le sujet des tests frontend : ils annoncent une suite Vitest (28 tests) qui n'existe plus dans `package.json` — le dossier a été vidé (commit `dd75eae`) puis reconstruit, et personne ne l'a rebranchée depuis.

## Stack réelle

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 (espace couleur oklch, pas la syntaxe v3)
- shadcn/ui, style "New York" — composants dans `components/ui/`, ne pas éditer à la main, régénérer via `npx shadcn@latest add <composant>`
- `sonner` pour les toasts (`top-center`)
- `zod` est installé mais très peu utilisé (surtout `src/lib/validation.ts` et les pages d'auth) — ce n'est pas une couche de validation systématique malgré ce que suggère `docs/ARCHITECTURE.md`
- Gestionnaire de paquets : **pnpm** exclusivement (voir `package.json` → `packageManager`). `npm install` a déjà cassé la résolution de dépendances par le passé — ne jamais l'utiliser ici.
- **Aucun framework de test installé actuellement** (pas de script `test` dans `package.json`, pas de Vitest/Jest en dépendance)

## Démarrage local

```bash
pnpm install
pnpm dev        # http://localhost:3000, nécessite le backend lancé en parallèle
```

Variables d'environnement (`.env.local`, à créer — il n'y a pas de `.env.local.example` dans ce dossier) :

```
BACKEND_URL=http://127.0.0.1:8000/api          # cible du proxy Next (server-side)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # utilisé côté client pour les redirections OAuth Google
```

Rituel avant de signaler un bug (voir aussi `CLAUDE.md` racine, section "Mentor Mode") :

```bash
npx tsc --noEmit     # types, ~10s, attrape la majorité des erreurs
pnpm dev             # rendu réel dans le navigateur
npx next build       # révèle ce que dev ne dit pas : prerender, frontières Suspense
```

## Architecture réelle du dossier `app/`

Pas de route groups `(public)`/`(client)`/`(pro)` comme envisagé dans `docs/ARCHITECTURE.md`. La structure effective est plate, par rôle/domaine :

```
src/app/
├── admin/            # pages réservées au rôle admin
├── auth/             # connexion, inscription, onboarding, callback OAuth
├── client/           # favoris, notifications, rdv (rôle client)
├── vendeur/          # dashboard, véhicules, rdv, profil (rôle vendeur)
├── vendeurs/         # profils publics de vendeurs
├── partenaire/       # concessionnaire + auto_ecole (convention d'affichage uniquement,
│                       aucune valeur "partenaire" n'existe en base — voir CLAUDE.md)
├── vehicules/        # catalogue public
├── support/, messages/
└── api/proxy/[...path]/route.ts   # proxy unique vers le backend Laravel
```

`src/lib/` contient les appels API et utilitaires par domaine (`vehicule.ts`, `formation.ts`, `notification.ts`, `rdv.ts`, `api.ts`, `erreurs.ts`, `utils.ts`, `validation.ts`) — pas de dossiers `src/schemas/` ni `src/hooks/` séparés, contrairement au plan de `docs/ARCHITECTURE.md`.

### Flux d'authentification

1. `GET /api/auth/google/redirect` (backend) → OAuth Google → Laravel crée/màj le `User`, génère un token Sanctum
2. Redirection vers `http://localhost:3000/api/auth/callback?token=...&role=...&data=...`
3. Next stocke le token dans un cookie httpOnly `auth_token` (7 jours)
4. `src/proxy.ts` (renommage de `middleware.ts` imposé par Next 16 — voir `AGENTS.md`) vérifie ce cookie sur les routes protégées

### Communication avec le backend

Tout passe par `POST/GET /api/proxy/{path}` → `${BACKEND_URL}/api/{path}` avec `Authorization: Bearer {token}` extrait du cookie. Client HTTP : `src/lib/api.ts` (`api.get/post/put/delete`).

## Pièges connus (vérifiés dans le code)

- **`src/proxy.ts` matcher incomplet.** `config.matcher` protège `/admin/:path` (segment unique) au lieu de `/admin/:path*`. Résultat : les pages imbriquées comme `/admin/formations/[id]`, `/admin/parc-auto/[id]`, `/admin/utilisateurs/[id]` **ne passent pas par la vérification du cookie** au niveau du proxy — seul `/admin/dashboard` (un seul segment) est couvert. Les données restent protégées côté API (le backend rejette sans token valide), mais la coquille de page charge sans redirection. À corriger : `"/admin/:path*"`.
- **Auto-import de l'IDE** : `lucide-react` exporte des icônes nommées `Link`, `Image`, `Menu`, `Search` — vérifier chaque import ajouté automatiquement contre les globals natifs/Next.
- **`<Image>` de next/image** : exige `fill` OU `width`+`height`. Avec `object-cover`, `sizes` doit décrire la largeur peinte après recadrage, pas la largeur CSS de la boîte.
- **Champs de formulaire** : `value` + `onChange` toujours ensemble, sinon l'input est non contrôlé et le state reste vide sans erreur visible.
- **Catalogue véhicules (`GET /vehicules`)** : la forme de `data` change selon le contenu — `[]` si vide, `{ vehicules, statsVehicules }` sinon (bug backend non corrigé, voir README `vroom-backend/`). Contourné par `normaliserCatalogue()` dans `src/app/vehicules/page.tsx` — ne pas retirer ce garde-fou sans corriger le backend d'abord.
- **`abonnement` traîne encore dans `notifications.type`** : les abonnements ont été supprimés côté produit mais la valeur reste possible sur d'anciennes lignes. Tout `switch`/`Record` exhaustif sur `TypeNotification` (voir `src/types/index.ts`) doit couvrir ce cas mort.

## État d'avancement / backlog

Chantiers identifiés et toujours ouverts au 2026-09-11 :

1. **Actions admin partiellement câblées** — certaines actions existent côté Laravel (valider/suspendre/bannir un utilisateur, valider/rejeter véhicule ou formation, traiter un signalement — `routes/api.php`) mais ne sont pas toutes branchées sur les boutons des pages `admin/*`. À vérifier page par page.
2. **Cohérence `statut` / `status_validation` sur les véhicules** — les deux colonnes évoluent indépendamment côté backend, sans garde-fou empêchant un état incohérent (ex. `statut: disponible` alors que `status_validation` n'est pas `validee`).
3. **Toasts `sonner` pas systématiques** — le package est en place mais pas câblé sur toutes les actions (succès/échec de formulaire, actions admin).
4. **Avis vendeur reçus non affichés** — `src/app/vendeur/profile/page.tsx` récupère `avis/vendeur/{id}` mais ne lit que `note_moyenne`/`nb_avis` de la réponse ; le tableau `avis` (chaque avis individuel avec client/note/commentaire) est jeté, aucune UI ne permet au vendeur de lire les commentaires. Vérifié dans le code au 2026-09-11 (lignes ~62-73 et ~326-330).
5. **`/tendances` jamais consommé** — `TendancesController::index()` (backend) n'est appelé nulle part dans ce repo, pour aucun rôle. Vérifié par recherche globale au 2026-09-11.
6. **Géolocalisation retirée** — `GeolocalisationController.php` a été supprimé côté backend et plus aucune route `/geo/*` n'existe dans `routes/api.php`. Les pages "vendeurs proches (carte)" évoquées dans `docs/MODULES.md` ne correspondent plus à rien côté API — à considérer comme abandonnées, pas "à construire".
7. **Aucun test frontend** — à remettre en place si on veut sécuriser les zones sensibles (auth, proxy, formulaires).

## Rôles utilisateur

Cinq valeurs sur `users.role` : `client`, `vendeur`, `concessionnaire`, `auto_ecole`, `admin`. Pas de rôle `partenaire` en base — le dossier `app/partenaire/` est une convention d'affichage qui regroupe `concessionnaire` et `auto_ecole`.

## Déploiement & CI

Cible de production prévue : **Vercel**. Aujourd'hui, **rien n'est automatisé** — pas de job `deploy-frontend`, pas d'intégration Vercel visible dans le dépôt (ni `vercel.json`, ni action GitHub dédiée). Un déploiement Vercel manuel/connecté au repo côté dashboard Vercel est possible sans passer par `.github/workflows/`, donc ça vaut le coup de vérifier directement sur le compte Vercel de l'équipe avant de supposer qu'il n'y a vraiment rien — mais ce dépôt, lui, ne documente ni ne pilote aucun déploiement frontend.

Le job `frontend` de `.github/workflows/ci.yml` (racine du monorepo) est **cassé** depuis la reconstruction du frontend, vérifié au 2026-09-11 :

1. **`working-directory: Vroom-ci`** (majuscule) alors que le dossier réel est `vroom-ci` (minuscule) — indifférent sous Windows, mais les runners GitHub Actions sont sous Ubuntu, **sensible à la casse**. Le job échoue probablement dès l'installation des dépendances.
2. **L'étape `pnpm test`** appelle un script qui n'existe plus dans `package.json` (pas de Vitest, pas de script `test`) — cassé même une fois la casse corrigée, tant qu'aucun test n'est réinstallé.

Tant que ces deux points ne sont pas corrigés, le check "Frontend (Next.js / Vitest)" visible sur les PR (voir `docs/WORKFLOW-DEPLOIEMENT.md`, qui le liste comme un des 2 checks obligatoires) est un faux négatif permanent — ne pas le lire comme une vraie régression de code tant que ce n'est pas réparé.

## Pour aller plus loin

- `CLAUDE.md` (racine du monorepo) — conventions, mode mentor, rituel de vérification complet
- `AGENTS.md` (ce dossier) — piège Next.js 16 (`proxy.ts` remplace `middleware.ts`)
- `docs/API-ENDPOINTS.md`, `docs/MODULES.md` — utiles pour la liste des endpoints, **mais vérifier contre `routes/api.php` avant de s'y fier** (voir avertissement en tête de ce fichier)
