# Règles métier découvertes en cours de route (jamais écrites avant)

> Reconstruit le 2026-07-23, dans le cadre de la Phase 0 de [`PLAN-RATTRAPAGE.md`](../PLAN-RATTRAPAGE.md). Chaque règle ici existe déjà dans le code — ce document ne fait que la rendre visible et expliquer le "pourquoi" quand il est connu.

## 1. Aucune transaction financière ne passe par la plateforme (vente/location de véhicule)

**Décision produit** (jamais écrite avant ce doc) : la plateforme ne gère aucun paiement pour l'achat/la location d'un véhicule, à cause du coût élevé des véhicules (risque fraude/chargeback, conformité, responsabilité juridique sur des montants importants). Seuls les **abonnements vendeur** passent par un vrai flux de paiement (`PaiementAbonnement`, `methode: carte/virement/mobile_money`).

Conséquence directe sur le modèle `TransactionConclue` : ce n'est **pas** un enregistrement de paiement, c'est une **double déclaration sur l'honneur**. L'argent change de main en dehors de l'app (cash, virement entre particuliers), puis les deux parties confirment séparément avec un code à 6 chiffres partagé (`code_confirmation`) que le deal a bien eu lieu. Voir `TransactionConclueController::confirmerVendeur/confirmerClient` — le message "si vous avez effectué un paiement, contactez le support" (ligne 230) confirme explicitement que la plateforme n'a aucune visibilité sur l'argent.

## 2. Un RDV confirmé ne vaut pas accord commercial

`RendezVous` (statut `confirmé`) signifie seulement qu'une rencontre est planifiée/a eu lieu (visite, essai routier, première rencontre) — **pas** qu'un achat ou une location a été conclu. L'accord commercial est un événement séparé et postérieur, matérialisé par `TransactionConclue` (voir règle 1). Un RDV peut très bien se terminer sans transaction.

## 3. Reservation ne concerne que les véhicules "à venir"

`Reservation` ne s'applique qu'à un véhicule dont `statut = a_venir` et `date_disponibilite` est dans le futur (`ReservationController::store()`) — ce n'est pas un mécanisme général de mise de côté, mais un système de pré-réservation avant que le véhicule ne soit physiquement disponible.

Garde-fous déjà en place :
- Expiration automatique `date_disponibilite + 5 jours` de grâce (`Reservation::JOURS_GRACE`), job quotidien `ExpireReservations` qui libère le véhicule
- Rappels quotidiens au client via `SendReservationReminders`
- Anti-abus : après 2 annulations sur le même véhicule, le client est bloqué (`clientEstBloque()`) — **corrigé le 2026-07-23** : la contrainte DB bloquait auparavant après la 1ère annulation au lieu de la 2e (voir Suivi dans `PLAN-RATTRAPAGE.md`)

**Point encore ouvert** (à trancher avec ton collègue) : si la réservation expire sans déboucher sur rien, le vendeur a "perdu" jusqu'à 5 jours d'exposition sans garantie. Aucune pénalité/compensation n'existe aujourd'hui pour ce cas précis (à la différence du cas "annulation explicite" qui, lui, est pénalisé).

## 4. `AlerteTendance` est un mécanisme technique anti-spam, pas une fonctionnalité utilisateur

Le vrai comportement visible utilisateur est "recevoir une notification quand mon annonce cartonne" (`CheckTendances`, job horaire qui scanne les vues/préinscriptions). `AlerteTendance` sert uniquement à ne pas notifier deux fois le même seuil sur la même période (`dejaNotifia()`). Ce n'est pas un objet métier que l'utilisateur manipule.

## 5. `CrmNote`/`CrmController` : mini-CRM pour vendeurs

Liste, pour un vendeur, tous les clients avec qui il a eu au moins un RDV (`RendezVous::where('vendeur_id', ...)->distinct()->pluck('client_id')`), avec historique RDV + transactions, et permet d'ajouter des notes libres par client (ex: "négocie dur", "revient dans 2 semaines"). Utile pour un vendeur avec beaucoup de prospects actifs.

## 6. Pas de table/modèle `Interactions` unifié

Le `CLAUDE.md` racine mentionne un modèle `Interactions` gérant 4 types (`favori`, `alerte`, `signalement`, `blocage_user`) via un champ `type`. **Ce n'est pas ce qui existe réellement** : `Favori`, `Alerte`, `Signalement` sont trois tables/modèles physiquement séparés, et il n'existe aucun mécanisme de blocage utilisateur (`blocage_user`) dans le code actuel. Le `CLAUDE.md` est à corriger sur ce point.

## 7. Le rôle `partenaire` n'existe pas dans le schéma réel

Le `CLAUDE.md` décrit un rôle `partenaire` avec un `partenaire_type` (`concessionnaire`/`auto_ecole`). En réalité, `users.role` contient directement les valeurs `concessionnaire` et `auto_ecole` — pas de niveau `partenaire` intermédiaire. Le `CLAUDE.md` est à corriger sur ce point aussi (lié à la règle 6, la doc projet a dérivé du code réel sur plusieurs points).
