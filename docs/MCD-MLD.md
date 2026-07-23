# MCD / MLD — Vroom (reconstruit a posteriori)

> Conception rétroactive, réalisée le 2026-07-23 dans le cadre de la Phase 0 de [`PLAN-RATTRAPAGE.md`](../PLAN-RATTRAPAGE.md). Ce document reflète l'état réel des 50 migrations (`vroom-backend/database/migrations/`) et des 28 modèles Eloquent (`vroom-backend/app/Models/`), pas une conception idéale de départ — il n'y en a jamais eu.
>
> Méthode : pour chaque colonne `xxx_id` avec `foreignId`/`foreignUuid` + `constrained()`, la cardinalité côté porteur de la FK est `(1,1)` si `NOT NULL`, `(0,1)` si `nullable()` ; côté pointé, `(0,n)` par défaut, sauf contrainte `unique()` sur la FK (alors relation 1-1).

## MCD

> Chaque relation est listée une seule fois, sous l'entité qui porte la clé étrangère.

### User (utilisateurs)
Attributs : fullname, email (unique), telephone, adresse, latitude, longitude, password (null si OAuth), auth_provider {local, google}, google_id (unique), avatar, role {client, vendeur, concessionnaire, auto_ecole, admin}, statut {actif, suspendu, banni, en_attente}, onboarding_completed_at, rccm (unique), note_moyenne, nb_avis, nb_refus_transaction, raison_sociale, badge_officiel, adresse_showroom, taux_reussite, numero_agrement (unique), niveau_acces {standard, super_admin}.
Entité pivot centrale : référencée par presque toutes les autres entités, aucune FK sortante.

### Catalogue (catalogues)
Attributs : nom_catalogue, description.
- Catalogue (1,1) — (0,n) User : est détenu par (un concessionnaire)

### Vehicule (vehicules)
Attributs : post_type {vente, location}, type {neuf, occasion}, statut {disponible, vendu, loué, a_venir, réservé, suspendu, banni, en_transaction}, prix, prix_suggere, negociable, date_disponibilite, status_validation {en_attente, validee, rejetee, suspendu, restauree, retrait}, description_validation, views_count.
- Vehicule (1,1) — (0,n) User : est publié par (created_by)
- Vehicule (0,1) — (0,n) Catalogue : est rangé dans
- Vehicule (0,1) — (0,n) User : est retiré par (withdraw_by)
- Vehicule (0,1) — (0,n) User : est supprimé par (deleted_by)

### VehiculeDescription (vehicules_description)
Attributs : marque, modele, annee, carburant, transmission, kilometrage, carrosserie, couleur, nombre_portes, nombre_places, visite_technique {à_jour, expirée, non_concerné}, carte_grise {idem}, assurance {idem}, historique_accidents {aucun, quelques_accidents, nombreux_accidents}, equipements (JSON).
- VehiculeDescription (1,1) — (0,1) Vehicule : détaille (relation 1-1 logique via `hasOne`, **non contrainte UNIQUE en base** — voir points d'attention)

### VehiculePhoto (vehicules_photos)
Attributs : path, is_primary, position.
- VehiculePhoto (1,1) — (0,n) Vehicule : illustre

### Favori (favoris)
Attributs : date_ajout. Association User↔Vehicule, unique (user_id, vehicule_id).
- Favori (1,1) — (0,n) User : est enregistré par
- Favori (1,1) — (0,n) Vehicule : cible

### Alerte (alertes)
Attributs : marque_cible, modele_cible, prix_max, carburant {essence, diesel, electrique, hybride, GPL}, active.
- Alerte (1,1) — (0,n) User : est configurée par

### Avis (avis)
Attributs : note (1-5), commentaire, date_avis.
- Avis (1,1) — (0,n) User : est rédigé par (client_id)
- Avis (0,1) — (0,n) User : note un vendeur (vendeur_id)
- Avis (0,1) — (0,n) User : note une auto-école (auto_ecole_id)

### RendezVous (rendez_vous)
Attributs : date_heure, type {visite, essai_routier, premiere_rencontre}, statut {en_attente, confirmé, refusé, annulé, terminé}, motif, lieu, notes, google_event_id.
- RendezVous (1,1) — (0,n) User : est demandé par (client_id)
- RendezVous (1,1) — (0,n) User : concerne le vendeur (vendeur_id)
- RendezVous (0,1) — (0,n) Vehicule : porte sur

### Formation (formations)
Attributs : type_permis {A, A2, B, B1, C, D}, prix, duree_heures, statut_validation {en_attente, validé, rejeté}.
- Formation (1,1) — (0,n) User : est proposée par (auto_ecole_id)

### DescriptionFormation (descriptions_formation)
Attributs : titre, texte, langue (défaut fr).
- DescriptionFormation (1,1) — (0,1) Formation : décrit (relation 1-1 réelle, FK UNIQUE en base)

### InscriptionFormation (inscriptions_formation)
Attributs : date_inscription, statut_eleve {préinscrit, paiement_en_cours, inscrit, en_cours, examen_passe, terminé, abandonné}, date_examen, reussite. Unique (client_id, formation_id).
- InscriptionFormation (1,1) — (0,n) User : inscrit (client_id)
- InscriptionFormation (1,1) — (0,n) Formation : porte sur

### VersementInscription (versements_inscription)
Attributs : montant, date_versement, note.
- VersementInscription (1,1) — (0,n) InscriptionFormation : échelonne le paiement de

### PlanAbonnement (plans_abonnement)
Attributs : nom (unique), description, cible {vendeur, concessionnaire, auto_ecole}, prix_mensuel, prix_annuel, nb_postes_max, nb_annonces_max, nb_photos_max, stats_avancees, badge_premium, boost_annonces, acces_leads, support_prioritaire, actif. Pas de FK.

### Abonnement (abonnements)
Attributs : date_debut, date_fin, statut {actif, expiré, suspendu, résilié}, periodicite {mensuel, annuel}, renouvellement_auto.
- Abonnement (1,1) — (0,n) PlanAbonnement : souscrit (restrict)
- Abonnement (1,1) — (0,n) User : est détenu par

### PaiementAbonnement (paiements_abonnement)
Attributs : date_paiement, montant, methode {carte, virement, mobile_money}, statut {réussi, échoué, remboursé, en_attente}, reference_externe (unique). Pas de soft delete (trace comptable).
- PaiementAbonnement (1,1) — (0,n) Abonnement : règle (restrict)

### PosteVendeur (postes_vendeur)
Attributs : nom_poste, email_poste (unique), role_poste {gestionnaire, commercial, comptable}, actif.
- PosteVendeur (1,1) — (0,n) Abonnement : est rattaché à
- PosteVendeur (1,1) — (0,n) User : appartient au compte principal (vendeur_id)
- PosteVendeur (1,1) — (0,n) User : est incarné par (user_id, le sous-compte)

### StatistiqueVendeur (statistiques_vendeur)
Attributs : nb_vues_total, nb_rdv_total, nb_rdv_confirmes, nb_annonces_actives, periode_debut, periode_fin, calcule_at.
- StatistiqueVendeur (1,1) — (0,n) User : agrège l'activité de

### Signalement (signalements)
Attributs : motif, description, statut {en_attente, traité, rejeté}, action_cible, note_admin, date_signalement.
- Signalement (0,1) — (0,n) User : est émis par (client_id, nullable → signalements système)
- Signalement (0,1) — (0,n) User : est traité par (admin_id)
- Signalement (0,1) — (0,n) User : vise un utilisateur (cible_user_id)
- Signalement (0,1) — (0,n) Vehicule : vise un véhicule (cible_vehicule_id)

### LogModeration (logs_moderation)
Attributs : action, cible_type {utilisateur, vehicule, formation, signalement, abonnement}, id_cible (référence polymorphe non contrainte), details, date_action. Journal d'audit immuable (pas de soft delete).
- LogModeration (1,1) — (0,n) User : est journalisé pour (admin_id)

### VehiculeVue (vehicule_vues)
Attributs : ip_address, created_at.
- VehiculeVue (1,1) — (0,n) Vehicule : compte une consultation de
- VehiculeVue (0,1) — (0,n) User : est générée par (nullable → visiteur anonyme)

### Conversation (conversations)
Attributs : last_message_at. Unique (participant_1_id, participant_2_id, vehicule_id).
- Conversation (1,1) — (0,n) User : implique le participant 1
- Conversation (1,1) — (0,n) User : implique le participant 2
- Conversation (1,1) — (0,n) Vehicule : porte sur

### Message (messages)
Attributs : type {audio, text}, content, audio_path, duration, is_read, read_at.
- Message (1,1) — (0,n) Conversation : appartient au fil
- Message (1,1) — (0,n) User : est envoyé par (sender_id)
- Message (1,1) — (0,n) User : est reçu par (receiver_id)

> `Conversation` = le fil de discussion (contenant, un par paire de participants + véhicule, cf. `UNIQUE(participant_1_id, participant_2_id, vehicule_id)`). `Message` = une entrée individuelle dans ce fil. Les anciennes colonnes `vehicule_id`/`rdv_id` sur `messages` (héritées d'un système de messagerie antérieur à `Conversation`, jamais lues/écrites par le code) ont été supprimées le 2026-07-23 — voir [`REGLES-METIER.md`](REGLES-METIER.md).

### TransactionConclue (transactions_conclues)
Attributs : type {vente, location}, prix_final, date_debut_location, date_fin_location, code_confirmation, expires_at, confirme_par_vendeur, confirme_par_client, statut {en_attente, confirmé, expiré, refusé}. Double confirmation.
- TransactionConclue (1,1) — (0,n) RendezVous : découle de (restrict)
- TransactionConclue (1,1) — (0,n) Vehicule : porte sur (restrict)
- TransactionConclue (1,1) — (0,n) User : engage le vendeur (restrict)
- TransactionConclue (1,1) — (0,n) User : engage le client (restrict)

### CrmNote (crm_notes)
Attributs : contenu.
- CrmNote (1,1) — (0,n) User : est prise par (vendeur_id)
- CrmNote (1,1) — (0,n) User : concerne (client_id)

### Notification (notifications)
Attributs : type {rdv, formation, alerte_vehicule, abonnement, moderation, transaction, support, tendance, reservation}, level {success, warning, error, info}, title, message, data (JSON), lu, lu_at, date_envoi.
- Notification (1,1) — (0,n) User : est destinée à

### SupportTicket (support_tickets)
Attributs : sujet, message, statut {ouvert, en_cours, résolu, fermé}, priorite {basse, normale, haute, urgente}, reponse_admin, repondu_at.
- SupportTicket (1,1) — (0,n) User : est ouvert par (user_id)
- SupportTicket (0,1) — (0,n) User : est traité par (admin_id, set null)

### Reservation (reservations)
Attributs : statut {en_attente, confirmee, annulee, expiree}, expires_at (= date_disponibilite + 5 j), annulations_count, cancelled_at. Unique (vehicule_id, client_id).
- Reservation (1,1) — (0,n) Vehicule : bloque
- Reservation (1,1) — (0,n) User : est posée par (client_id)

### AlerteTendance (alertes_tendance)
Attributs : type {vehicule, formation}, periode {quotidien, hebdomadaire}, tranche (seuil atteint), notified_at. Cible exclusive selon `type`.
- AlerteTendance (0,1) — (0,n) Vehicule : signale la tendance de (nullable)
- AlerteTendance (0,1) — (0,n) Formation : signale la tendance de (nullable)

---

## MLD

> `colonne : type, contrainte`. Toutes les PK `id` sont des `uuid`. Toutes les FK sont des `uuid` référençant `table.id`. `[timestamps]` = `created_at`/`updated_at nullable`. `[softDeletes]` = `deleted_at : timestamp, nullable`.

**users** : id: uuid PK · fullname: varchar(500) NOT NULL · email: varchar(255) NOT NULL UNIQUE · telephone: varchar(20) NULL · adresse: varchar(255) NULL · latitude: decimal(10,7) NULL · longitude: decimal(10,7) NULL · password: varchar(255) NULL · auth_provider: enum{local,google} DEFAULT 'local' · google_id: varchar NULL UNIQUE · google_access_token: text NULL · google_refresh_token: text NULL · google_token_expires_at: timestamp NULL · avatar: varchar NULL · role: enum{client,vendeur,concessionnaire,auto_ecole,admin} DEFAULT 'client' · statut: enum{actif,suspendu,banni,en_attente} DEFAULT 'actif' · onboarding_completed_at: timestamp NULL · rccm: varchar(14) NULL UNIQUE · note_moyenne: float DEFAULT 0 · nb_avis: int DEFAULT 0 · raison_sociale: varchar(255) NULL · badge_officiel: bool DEFAULT false · adresse_showroom: varchar(255) NULL · taux_reussite: float DEFAULT 0 · nb_refus_transaction: unsignedInt DEFAULT 0 · numero_agrement: varchar(50) NULL UNIQUE · niveau_acces: enum{standard,super_admin} NULL · email_verified_at: timestamp NULL · remember_token · [timestamps] · [softDeletes]

**catalogues** : id: uuid PK · user_id: uuid FK→users.id NOT NULL (cascade) · nom_catalogue: varchar(255) NOT NULL · description: text NULL · [timestamps] · [softDeletes]

**vehicules** : id: uuid PK · created_by: uuid FK→users.id NOT NULL (cascade) · catalogue_id: uuid FK→catalogues.id NULL (set null) · post_type: enum{vente,location} NOT NULL · type: enum{neuf,occasion} NOT NULL · statut: enum{disponible,vendu,loué,a_venir,réservé,suspendu,banni,en_transaction} NOT NULL · prix: decimal(10,2) NOT NULL · prix_suggere: decimal(10,2) NULL · negociable: bool DEFAULT false · date_disponibilite: date NULL · status_validation: enum{en_attente,validee,rejetee,suspendu,restauree,retrait} DEFAULT 'en_attente' · description_validation: text NULL · withdraw_by: uuid FK→users.id NULL (cascade) · views_count: unsignedBigInt DEFAULT 0 · deleted_by: uuid FK→users.id NULL (cascade) · [softDeletes] · [timestamps]

**vehicules_description** : id: uuid PK · vehicule_id: uuid FK→vehicules.id NOT NULL (cascade) *[non UNIQUE en base bien qu'exploité en 1-1]* · marque: varchar(500) NOT NULL · modele: varchar(500) NOT NULL · annee: year NULL · carburant: varchar(100) NULL · transmission: varchar(100) NULL · kilometrage: int NULL · carrosserie: varchar(255) NULL · couleur: varchar(100) NULL · nombre_portes: int NULL · nombre_places: int NULL · visite_technique: enum{à_jour,expirée,non_concerné} NULL · date_visite_technique: date NULL · carte_grise: enum{à_jour,expirée,non_concerné} NULL · date_carte_grise: date NULL · assurance: enum{à_jour,expirée,non_concerné} NULL · historique_accidents: enum{aucun,quelques_accidents,nombreux_accidents} NULL · equipements: json NULL · [softDeletes] · [timestamps]

**vehicules_photos** : id: uuid PK · vehicule_id: uuid FK→vehicules.id NOT NULL (cascade) · path: varchar NOT NULL · is_primary: bool DEFAULT false · position: int DEFAULT 0 · [softDeletes] · [timestamps]

**favoris** : id: uuid PK · user_id: uuid FK→users.id NOT NULL (cascade) · vehicule_id: uuid FK→vehicules.id NOT NULL (cascade) · date_ajout: timestamp DEFAULT now() · UNIQUE(user_id, vehicule_id) · [timestamps] · [softDeletes]

**alertes** : id: uuid PK · user_id: uuid FK→users.id NOT NULL (cascade) · marque_cible: varchar(100) NULL · modele_cible: varchar(100) NULL · prix_max: decimal(12,2) NULL · carburant: enum{essence,diesel,electrique,hybride,GPL} NULL · active: bool DEFAULT true · [timestamps] · [softDeletes]

**avis** : id: uuid PK · client_id: uuid FK→users.id NOT NULL (cascade) · vendeur_id: uuid FK→users.id NULL (cascade) · auto_ecole_id: uuid FK→users.id NULL (cascade) · note: tinyInt NOT NULL (1-5) · commentaire: text NULL · date_avis: timestamp DEFAULT now() · [timestamps] · [softDeletes]

**rendez_vous** : id: uuid PK · client_id: uuid FK→users.id NOT NULL (cascade) · vendeur_id: uuid FK→users.id NOT NULL (cascade) · vehicule_id: uuid FK→vehicules.id NULL (set null) · date_heure: datetime NOT NULL · type: enum{visite,essai_routier,premiere_rencontre} NOT NULL · statut: enum{en_attente,confirmé,refusé,annulé,terminé} DEFAULT 'en_attente' · motif: text NULL · lieu: varchar(255) NULL · notes: text NULL · google_event_id: varchar NULL · [timestamps] · [softDeletes]

**formations** : id: uuid PK · auto_ecole_id: uuid FK→users.id NOT NULL (cascade) · type_permis: enum{A,A2,B,B1,C,D} NOT NULL · prix: decimal(10,2) NOT NULL · duree_heures: int NOT NULL · statut_validation: enum{en_attente,validé,rejeté} DEFAULT 'en_attente' · [timestamps] · [softDeletes]

**descriptions_formation** : id: uuid PK · formation_id: uuid FK→formations.id NOT NULL UNIQUE (cascade) · titre: varchar(255) NOT NULL · texte: text NOT NULL · langue: varchar(10) DEFAULT 'fr' · [timestamps] · [softDeletes]

**inscriptions_formation** : id: uuid PK · client_id: uuid FK→users.id NOT NULL (cascade) · formation_id: uuid FK→formations.id NOT NULL (cascade) · date_inscription: timestamp DEFAULT now() · statut_eleve: enum{préinscrit,paiement_en_cours,inscrit,en_cours,examen_passe,terminé,abandonné} DEFAULT 'préinscrit' · date_examen: date NULL · reussite: bool NULL · UNIQUE(client_id, formation_id) · [timestamps] · [softDeletes]

**versements_inscription** : id: uuid PK · inscription_id: uuid FK→inscriptions_formation.id NOT NULL (cascade) · montant: decimal(10,2) NOT NULL · date_versement: date DEFAULT CURDATE() · note: varchar NULL · [timestamps]

**plans_abonnement** : id: uuid PK · nom: varchar(100) NOT NULL UNIQUE · description: text NULL · cible: enum{vendeur,concessionnaire,auto_ecole} NOT NULL · prix_mensuel: decimal(10,2) NOT NULL · prix_annuel: decimal(10,2) NOT NULL · nb_postes_max: int DEFAULT 1 · nb_annonces_max: int NOT NULL · nb_photos_max: int NOT NULL · stats_avancees: bool DEFAULT false · badge_premium: bool DEFAULT false · boost_annonces: bool DEFAULT false · acces_leads: bool DEFAULT false · support_prioritaire: bool DEFAULT false · actif: bool DEFAULT true · [timestamps] · [softDeletes]

**abonnements** : id: uuid PK · plan_id: uuid FK→plans_abonnement.id NOT NULL (restrict) · user_id: uuid FK→users.id NOT NULL (cascade) · date_debut: datetime NOT NULL · date_fin: datetime NOT NULL · statut: enum{actif,expiré,suspendu,résilié} NOT NULL · periodicite: enum{mensuel,annuel} NOT NULL · renouvellement_auto: bool DEFAULT true · [timestamps] · [softDeletes]

**paiements_abonnement** : id: uuid PK · abonnement_id: uuid FK→abonnements.id NOT NULL (restrict) · date_paiement: datetime NOT NULL · montant: decimal(10,2) NOT NULL · methode: enum{carte,virement,mobile_money} NOT NULL · statut: enum{réussi,échoué,remboursé,en_attente} NOT NULL · reference_externe: varchar(255) NOT NULL UNIQUE · [timestamps] · *(pas de softDeletes)*

**postes_vendeur** : id: uuid PK · abonnement_id: uuid FK→abonnements.id NOT NULL (cascade) · vendeur_id: uuid FK→users.id NOT NULL (cascade) · user_id: uuid FK→users.id NOT NULL (cascade) · nom_poste: varchar(100) NOT NULL · email_poste: varchar(255) NOT NULL UNIQUE · role_poste: enum{gestionnaire,commercial,comptable} NOT NULL · actif: bool DEFAULT true · [timestamps] · [softDeletes]

**statistiques_vendeur** : id: uuid PK · user_id: uuid FK→users.id NOT NULL (cascade) · nb_vues_total: int DEFAULT 0 · nb_rdv_total: int DEFAULT 0 · nb_rdv_confirmes: int DEFAULT 0 · nb_annonces_actives: int DEFAULT 0 · periode_debut: date NOT NULL · periode_fin: date NOT NULL · calcule_at: datetime NOT NULL · [timestamps]

**signalements** : id: uuid PK · client_id: uuid FK→users.id NULL (cascade) *[rendu nullable après coup]* · admin_id: uuid FK→users.id NULL (set null) · cible_user_id: uuid FK→users.id NULL (cascade) · cible_vehicule_id: uuid FK→vehicules.id NULL (cascade) · motif: varchar(255) NOT NULL · description: text NULL · statut: enum{en_attente,traité,rejeté} DEFAULT 'en_attente' · action_cible: varchar NULL · note_admin: text NULL · date_signalement: timestamp DEFAULT now() · [timestamps] · [softDeletes]

**logs_moderation** : id: uuid PK · admin_id: uuid FK→users.id NOT NULL (cascade) · action: varchar(100) NOT NULL · cible_type: enum{utilisateur,vehicule,formation,signalement,abonnement} NOT NULL · id_cible: varchar NOT NULL (référence polymorphe non contrainte) · details: text NULL · date_action: timestamp DEFAULT now() · [timestamps] · *(pas de softDeletes — audit immuable)*

**vehicule_vues** : id: uuid PK · vehicule_id: uuid FK→vehicules.id NOT NULL (cascade) · user_id: uuid FK→users.id NULL (set null) · ip_address: varchar(45) NULL · created_at: timestamp DEFAULT now() · *(pas de updated_at ni softDeletes)*

**conversations** : id: uuid PK · participant_1_id: uuid FK→users.id NOT NULL (cascade) · participant_2_id: uuid FK→users.id NOT NULL (cascade) · vehicule_id: uuid FK→vehicules.id NOT NULL (cascade) · last_message_at: timestamp NULL · UNIQUE(participant_1_id, participant_2_id, vehicule_id) · [timestamps]

**messages** : id: uuid PK · conversation_id: uuid FK→conversations.id NULL (cascade) *[ajouté après coup]* · sender_id: uuid FK→users.id NOT NULL (cascade) · receiver_id: uuid FK→users.id NOT NULL (cascade) · vehicule_id: uuid FK→vehicules.id NULL (cascade) · rdv_id: uuid FK→rendez_vous.id NULL (cascade) · type: enum{audio,text} DEFAULT 'text' · content: text NOT NULL · audio_path: varchar NULL · duration: int NULL · is_read: bool DEFAULT false · read_at: timestamp NULL · [timestamps]

**transactions_conclues** : id: uuid PK · rendez_vous_id: uuid FK→rendez_vous.id NOT NULL (restrict) · vehicule_id: uuid FK→vehicules.id NOT NULL (restrict) · vendeur_id: uuid FK→users.id NOT NULL (restrict) · client_id: uuid FK→users.id NOT NULL (restrict) · type: enum{vente,location} NOT NULL · prix_final: decimal(12,2) NULL · date_debut_location: date NULL · date_fin_location: date NULL · code_confirmation: varchar(6) NOT NULL · expires_at: timestamp NOT NULL · confirme_par_vendeur: bool DEFAULT false · confirme_par_client: bool DEFAULT false · statut: enum{en_attente,confirmé,expiré,refusé} DEFAULT 'en_attente' · [timestamps]

**crm_notes** : id: uuid PK · vendeur_id: uuid FK→users.id NOT NULL (cascade) · client_id: uuid FK→users.id NOT NULL (cascade) · contenu: text NOT NULL · [timestamps]

**notifications** : id: uuid PK · user_id: uuid FK→users.id NOT NULL (cascade) · type: enum{rdv,formation,alerte_vehicule,abonnement,moderation,transaction,support,tendance,reservation} NOT NULL · level: enum{success,warning,error,info} NULL · title: varchar NOT NULL · message: text NOT NULL · data: json NULL · lu: bool DEFAULT false · lu_at: timestamp NULL · date_envoi: timestamp DEFAULT now() · INDEX(user_id,lu), INDEX(type) · [timestamps] · [softDeletes]

**support_tickets** : id: uuid PK · user_id: uuid FK→users.id NOT NULL (cascade) · sujet: varchar NOT NULL · message: text NOT NULL · statut: enum{ouvert,en_cours,résolu,fermé} DEFAULT 'ouvert' · priorite: enum{basse,normale,haute,urgente} DEFAULT 'normale' · reponse_admin: text NULL · admin_id: uuid FK→users.id NULL (set null) · repondu_at: timestamp NULL · [timestamps]

**reservations** : id: uuid PK · vehicule_id: uuid FK→vehicules.id NOT NULL (cascade) · client_id: uuid FK→users.id NOT NULL (cascade) · statut: enum{en_attente,confirmee,annulee,expiree} DEFAULT 'en_attente' · expires_at: timestamp NOT NULL · annulations_count: unsignedTinyInt DEFAULT 0 · cancelled_at: timestamp NULL · UNIQUE(vehicule_id, client_id) · [timestamps]

**alertes_tendance** : id: uuid PK · vehicule_id: uuid FK→vehicules.id NULL (cascade) · formation_id: uuid FK→formations.id NULL (cascade) · type: varchar NOT NULL (CHECK {vehicule,formation} hors SQLite) · periode: varchar NOT NULL (CHECK {quotidien,hebdomadaire} hors SQLite) · tranche: int NOT NULL · notified_at: timestamp DEFAULT now() · *(pas de timestamps ni softDeletes)*

**Tables système (hors périmètre métier)** : `password_reset_tokens`, `sessions`, `cache`/`cache_locks`, `jobs`/`job_batches`/`failed_jobs`, `personal_access_tokens` (Sanctum). Non modélisées.

---

## Points d'attention

1. **`vehicules_description.vehicule_id` non UNIQUE** alors que le modèle l'exploite en `hasOne` (1-1). Rien n'empêche en base plusieurs descriptions pour un même véhicule. `descriptions_formation`, elle, a bien la contrainte UNIQUE pour le même type de relation : traitement asymétrique de deux cas identiques.

2. **ENUM élargis après coup, sources de divergence multi-SGBD.** `vehicules.statut`, `notifications.type`, `support_tickets.priorite`, `inscriptions_formation.statut_eleve` ont été étendus via des migrations séparées (CHECK PostgreSQL puis rattrapage MySQL via `widen_native_enums_for_mysql`). Il faut se fier à l'état final documenté ci-dessus, pas aux migrations `add_..._to_..._enum/check` intermédiaires. Tout nouvel ENUM devra être élargi sur plusieurs dialectes.

3. **`signalements.client_id` rendu nullable** a posteriori : change la règle métier (signalements désormais aussi générés par le système, ex. transaction non confirmée). Un signalement peut n'avoir aucun émetteur humain.

4. **Rôle stocké différemment de ce que décrit `CLAUDE.md`.** `users.role` contient `concessionnaire`/`auto_ecole` directement ; le schéma réel n'a ni `partenaire` ni `partenaire_type` comme l'indique le `CLAUDE.md` racine. Le `CLAUDE.md` est en décalage avec la base réelle — à corriger.

5. **`avis`, `crm_notes`, `messages`, `conversations`, `transactions_conclues` s'appuient tous sur des FK multiples vers `users`** (client/vendeur/auto_ecole), sans table de rôle dédiée. La cohérence "ce vendeur_id est bien un vendeur" repose uniquement sur l'application, jamais sur une contrainte de base.

6. **Référence polymorphe non contrainte dans `logs_moderation`** (`cible_type` + `id_cible: varchar`) et **cible exclusive dans `alertes_tendance`** (`vehicule_id` XOR `formation_id`, aucune contrainte d'exclusivité en base). Intégrité déléguée entièrement au code applicatif.

7. **`transactions_conclues` et `rendez_vous` se recouvrent partiellement** : les deux portent client_id + vendeur_id + vehicule_id + un statut de workflow. La transaction duplique ces FK au lieu de tout dériver du RDV — dénormalisation qui peut désynchroniser (ex. `rendez_vous.vehicule_id` nullable/set null, mais `transactions_conclues.vehicule_id` NOT NULL/restrict). **Clarifié le 2026-07-23** (voir [`REGLES-METIER.md`](REGLES-METIER.md) règles 1-3) : ce ne sont pas des étapes redondantes d'un même processus — `RendezVous` planifie une rencontre (sans engagement commercial), `TransactionConclue` déclare a posteriori qu'un deal a eu lieu en dehors de la plateforme, `Reservation` est un mécanisme indépendant réservé aux véhicules "à venir". La duplication de FK reste réelle mais la frontière fonctionnelle est désormais documentée. Point encore ouvert : aucune pénalité si une `Reservation` expire sans jamais déboucher sur un RDV/une transaction.

8. **`vehicules.views_count` vs table `vehicule_vues`** : compteur dénormalisé + table de détail. Classique, mais à maintenir en cohérence (risque de dérive du compteur si un chemin de code incrémente l'un sans écrire l'autre).

9. **Politiques `onDelete` hétérogènes** : `cascade` majoritaire, mais `restrict` sur paiements/abonnements/transactions (cohérent pour la trace comptable) et `set null` sur `vehicule_id` de rendez_vous/vehicule_vues. La suppression d'un `User` déclenche des cascades très larges (véhicules, favoris, avis, messages…) — à vérifier si c'est le comportement voulu, surtout `users → vehicules (created_by, cascade)` qui supprimerait tout le catalogue d'un vendeur en cas de suppression de compte.

10. **`alertes_tendance` et `vehicule_vues` sans `timestamps`/`softDeletes`**, contrairement au reste (tables d'événements append-only) — cohérent, mais à documenter comme un choix assumé plutôt qu'un oubli.
