# Pourquoi ces choix techniques (Vroom)

> Écrit a posteriori le 2026-07-23, Phase 1 de [`PLAN-RATTRAPAGE.md`](../PLAN-RATTRAPAGE.md). Ce sont déjà de bons choix — il manquait juste l'écrit du "pourquoi", pour que la prochaine personne (ou toi dans 6 mois) ne les remette pas en question sans contexte.

## Laravel Reverb (dev) + Pusher (prod) — WebSocket temps réel

Utilisé pour la messagerie (`Conversation`/`Message`) et les événements temps réel (`MessageSent`, `MessageDeleted`, `VehiculeValidated`). **Correction (2026-07-23)** : contrairement à ce qu'on pensait en Phase 1, ce n'est pas "Reverb à la place de Pusher" — c'est un **double mode** géré par `Vroom-ci/src/lib/echo.ts` : Reverb en développement local (auto-hébergé, pas de compte externe nécessaire), Pusher en production (`NEXT_PUBLIC_PUSHER_KEY` défini → bascule automatique). Probablement parce que l'hébergement de production (Hostinger, mutualisé) ne permet pas de faire tourner un process Reverb persistant, d'où le repli sur un service managé pour cet environnement précis. Les deux jeux de clés (`REVERB_*`/`PUSHER_*`) doivent être tenus synchronisés entre `vroom-backend/.env` et `Vroom-ci/.env.local`.

## Laravel Sanctum — Authentification API

Génère les tokens API après login/register/OAuth Google. Choisi plutôt que Passport (OAuth2 complet) parce qu'il n'y a qu'un seul frontend de confiance (le Next.js du même projet) à authentifier — pas besoin de la complexité d'un serveur OAuth2 pour des clients tiers.

## Leaflet — Cartes / géolocalisation

Alternative open-source à Google Maps pour l'affichage des véhicules/showrooms sur carte (`GeolocalisationController`). Pas de clé API facturée à l'usage, contrairement à Google Maps Platform.

## Google Gemini — Auto-modération des annonces véhicule

**Pas** une simple suggestion de prix (contrairement à ce que dit `CLAUDE.md` — à corriger) : Gemini est le **modérateur automatique** du workflow `status_validation`. Voir `ValidateVehiculeWithGemini.php` : à chaque nouvelle annonce, il vérifie par photo que la marque/modèle déclarés correspondent à ce qui est visible, cherche une photo du tableau de bord pour valider le kilométrage déclaré (tolérance 500 km), et rejette automatiquement (`status_validation = rejetee`) en cas d'incohérence détectée — avec notification au vendeur expliquant pourquoi. Le prix suggéré (`prix_suggere`) n'est qu'un sous-produit de cette analyse, pas sa fonction première. Choisi pour son coût/disponibilité d'API par rapport aux alternatives (GPT-4 Vision, Claude).

## Mail — SMTP Hostinger (pas Resend)

L'envoi d'email (bienvenue, rappels de réservation, annulations) passe par le SMTP fourni par l'hébergeur (Hostinger), piloté par `MAIL_MAILER` en `.env`. Le package `resend/resend-laravel` avait été installé (probablement en prévision ou en test) mais n'était jamais appelé nulle part dans le code — **retiré le 2026-07-23** (`composer remove`), avec `spatie/laravel-google-calendar` (voir Phase 1 dans `PLAN-RATTRAPAGE.md`).

## zod — sous-exploité (dette identifiée le 2026-07-23)

`zod` n'est réellement utilisé que dans `registerValidator.ts`/`loginValidator.ts` (inscription/login). Partout ailleurs, la validation est faite à la main (`if` + `toast.error()`) — notamment `app/vendeur/addVehicle/page.tsx` (formulaire à 5 étapes, le plus complexe de l'app) et au moins 5 pages sous `app/client/` (`formations`, `favorites`, `reservations`, `transactions`, `rdv`). Aucune régression identifiée à ce jour, mais c'est une dette : logique de validation dupliquée, pas de garantie de type, plus difficile à maintenir que des schémas zod centralisés. **Décision (2026-07-23) : reporté** — retrofit trop large pour être improvisé (une dizaine de formulaires), à traiter comme chantier dédié plus tard, en commençant probablement par `addVehicle` (le plus gros gain).

## Versions bleeding-edge (Next 16.2.9, React 19.2.3, Tailwind v4)

**Décision (2026-07-23) : upgrade assumé, pas de gel.** Aucun bug ou comportement instable n'a jamais été observé et rattaché à la fraîcheur de ces versions — le risque est théorique, pas constaté. Redescendre maintenant (React 19→18, Tailwind v4→v3) remplacerait ce risque théorique par un vrai risque de régression de compatibilité, pour un bénéfice non mesurable. Règle retenue : on ne remonte pas *encore* de version tant que le reste du projet (tests, doc) n'est pas stabilisé, mais on ne redescend pas non plus sans raison technique concrète.

## Google Calendar — implémentation maison sur `google/apiclient`

Chaque vendeur connecte **son propre** Google Calendar (OAuth individuel, token stocké en DB sur `users.google_access_token`/`google_refresh_token`, refresh automatique géré à la main dans `GoogleCalendarService.php`). C'est pour ça que `spatie/laravel-google-calendar` (pensé pour un compte de service unique ou un token statique en fichier) ne convenait pas et a été abandonné sans jamais être utilisé — retiré du projet le 2026-07-23. `google/apiclient` reste utilisé directement, lui, car c'est la seule brique qui permet ce modèle par-utilisateur.
