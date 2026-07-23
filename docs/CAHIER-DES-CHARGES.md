# Cahier des charges rétroactif — Vroom

> Reconstruit le 2026-07-23, Phase 3 de [`PLAN-RATTRAPAGE.md`](../PLAN-RATTRAPAGE.md), à partir de `routes/api.php` (258 lignes) et des règles métier documentées dans [`REGLES-METIER.md`](REGLES-METIER.md). Décrit ce que l'application fait réellement, pas une spec idéale.

## Rôles

Cinq rôles sur `users.role` : `client`, `vendeur`, `concessionnaire`, `auto_ecole`, `admin`. Pas de rôle `partenaire` intermédiaire en base (voir `REGLES-METIER.md` règle 7) — `concessionnaire` et `auto_ecole` partagent la plupart des permissions "vendeur" côté API, et sont regroupés sous `/partenaire` côté frontend par convention d'affichage uniquement.

| Rôle | Description |
|------|-------------|
| `client` | Achète/loue des véhicules, s'inscrit à des formations |
| `vendeur` | Publie des véhicules à vendre/louer (particulier ou pro) |
| `concessionnaire` | Vendeur pro avec showroom, accès identique à `vendeur` + `auto_ecole` sur la plupart des routes, sauf `/partenaire/formations` (bloqué) |
| `auto_ecole` | Propose des formations au permis, accès identique à `vendeur`/`concessionnaire` sur la plupart des routes, sauf `/partenaire/mongarage` (bloqué) |
| `admin` | Modération, gestion des comptes, statistiques plateforme |

## Matrice de permissions par ressource (API)

`✓` = accessible, `✗` = refusé (403), `pub` = accessible sans connexion.

| Ressource | client | vendeur | concessionnaire | auto_ecole | admin |
|---|---|---|---|---|---|
| Catalogue véhicules (lecture) | pub | pub | pub | pub | pub |
| Publier/modifier/supprimer un véhicule | ✗ | ✓ | ✓ | ✓ | ✗ |
| Stats vendeur (`/stats/mes-stats`) | ✗ | ✓ | ✓ | ✓ | ✗ |
| RDV — créer/annuler (côté client) | ✓ | ✓ | ✓ | ✓ | ✗ |
| RDV — confirmer/refuser/terminer (côté vendeur) | ✗ | ✓ | ✓ | ✓ | ✗ |
| Transactions conclues — confirmer/refuser (client) | ✓ | ✓ | ✓ | ✓ | ✗ |
| Transactions conclues — confirmer/refuser (vendeur) | ✗ | ✓ | ✓ | ✓ | ✗ |
| Réservations (véhicules "à venir") | ✓ | ✓ | ✓ | ✓ | ✗ |
| Favoris / Alertes | ✓ | ✓ | ✓ | ✓ | ✗ |
| Avis (écriture) | ✓ | ✓ | ✓ | ✓ | ✗ |
| Signalements (créer) | ✓ | ✓ | ✓ | ✓ | ✗ |
| CRM (liste clients, notes) | ✗ | ✓ | ✓ | ✓ | ✗ |
| Abonnements (souscrire/résilier) | ✗ | ✓ | ✓ | ✓ | ✗ |
| Formations — consulter/s'inscrire | ✓ | ✓ | ✓ | ✓ | ✗ |
| Formations — créer/gérer/stats | ✗ | ✗ | ✗ | ✓ | ✗ |
| `/partenaire/mongarage` (frontend) | ✗ | ✓ | ✓ | ✗ (bloqué) | ✗ |
| `/partenaire/formations` (frontend) | ✗ | ✗ | ✗ (bloqué) | ✓ | ✗ |
| Messagerie (conversations) | ✓ | ✓ | ✓ | ✓ | ✗ |
| Support (créer un ticket) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Modération (valider/rejeter véhicules, formations, comptes pro, signalements) | ✗ | ✗ | ✗ | ✗ | ✓ |
| Gestion des comptes (suspendre/bannir/restaurer) | ✗ | ✗ | ✗ | ✗ | ✓ |
| Statistiques plateforme, logs d'audit | ✗ | ✗ | ✗ | ✗ | ✓ |

Vérifié par `tests/Feature/PermissionsTest.php` (échantillon représentatif, pas exhaustif sur les 258 lignes de routes) et `tests/Feature/VehiculeWorkflowTest.php` pour la partie admin.

## Parcours utilisateurs critiques

### 1. Achat/location d'un véhicule (client ↔ vendeur)

1. Le client parcourt le catalogue public (`GET /vehicules`), filtre, consulte une annonce
2. Le client prend RDV avec le vendeur (`POST /rdv`) — visite, essai routier ou première rencontre
3. Le vendeur confirme (`POST /rdv/{id}/confirmer`) ou refuse
4. La rencontre a lieu **en dehors de la plateforme** — aucune transaction financière ne passe par Vroom (voir `REGLES-METIER.md` règle 1)
5. Le vendeur marque le RDV terminé (`POST /rdv/{id}/terminer`) → génère une `TransactionConclue` avec un code à 6 chiffres partagé aux deux parties
6. Double confirmation obligatoire, **dans l'ordre** : le client confirme d'abord (`POST /transactions-conclues/{id}/confirmer-client`), puis le vendeur (`POST /transactions-conclues/{id}/confirmer-vendeur`) — le vendeur ne peut pas confirmer avant le client
7. Une fois les deux confirmations reçues avec le bon code → le véhicule passe à `vendu`/`loué`
8. Si l'une des parties refuse : le véhicule redevient `disponible`. Si c'est le **vendeur** qui refuse, un signalement automatique est créé contre lui et son compteur `nb_refus_transaction` est incrémenté (pénalité de réputation)

Couvert par `tests/Feature/RendezVousTest.php` (12 tests) et `tests/Feature/TransactionConclueTest.php` (6 tests).

### 2. Réservation d'un véhicule "à venir"

1. Un véhicule est publié avec `statut = a_venir` et une `date_disponibilite` future
2. Un client le réserve (`POST /reservations`) → le véhicule passe à `réservé`, verrouillé pour les autres clients
3. Expiration automatique `date_disponibilite + 5 jours` de grâce (job quotidien `ExpireReservations`), ou annulation manuelle par le client
4. Dans les deux cas, le véhicule redevient `a_venir` (si la date n'est pas encore passée) ou `disponible` (sinon) — corrigé le 2026-07-23, voir `PLAN-RATTRAPAGE.md`
5. Anti-abus : après 2 annulations sur le même véhicule, le client est bloqué pour ce véhicule spécifique

Couvert par `tests/Feature/VehiculeWorkflowTest.php`.

### 3. Modération d'une annonce véhicule

1. Un vendeur publie un véhicule → `status_validation = en_attente`
2. Auto-modération IA (Gemini) : vérifie la cohérence marque/modèle/photos et kilométrage/tableau de bord — valide, rejette automatiquement, ou laisse en attente pour revue manuelle en cas d'erreur/doute (voir `CHOIX-TECHNIQUES.md`)
3. Un admin peut aussi valider/rejeter manuellement (`POST /admin/vehicules/{id}/valider|rejeter`) — le rejet exige un motif

Couvert par `tests/Feature/VehiculeWorkflowTest.php`.

### 4. Formation auto-école

1. Une auto-école crée une formation (`POST /formations`, rôle `auto_ecole` uniquement) → `statut_validation = en_attente`
2. Un admin valide/rejette la formation
3. Un client s'inscrit (`POST /formations/{id}/inscrire`) → `InscriptionFormation`, statut `préinscrit → ... → terminé`
4. Suivi des versements de paiement échelonnés par l'auto-école (`VersementInscription`)

Non couvert par des tests automatisés à ce jour.

### 5. Signalement et modération utilisateur

1. N'importe quel utilisateur authentifié peut signaler un véhicule ou un utilisateur (`POST /signalements`)
2. Un signalement peut aussi être **généré par le système** (ex. vendeur refusant une transaction — voir parcours 1) — `client_id` est nullable pour ce cas
3. Un admin traite le signalement (`POST /admin/signalements/{id}/traiter`), peut suspendre/bannir le compte visé

Non couvert par des tests automatisés à ce jour.

## Ce que chaque rôle NE peut PAS faire (points de friction volontaires)

- Un `client` ne peut ni publier de véhicule, ni accéder au CRM, ni confirmer une transaction côté vendeur
- Un `vendeur`/`concessionnaire`/`auto_ecole` ne peut pas confirmer sa propre transaction avant que le client ait confirmé (ordre imposé)
- Un `auto_ecole` ne peut pas accéder à `/partenaire/mongarage` (pas de garage) ; un `concessionnaire` ne peut pas accéder à `/partenaire/formations` (pas de formations)
- Personne (y compris l'admin) ne traite de paiement pour l'achat/la location d'un véhicule sur la plateforme — voir `REGLES-METIER.md` règle 1
- Un compte `concessionnaire`/`auto_ecole` nouvellement inscrit reste `en_attente` tant qu'un admin ne l'a pas validé (`POST /admin/users/{id}/valider`)
