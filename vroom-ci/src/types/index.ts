/** Types partagés dans toute l'app — décrivent les données venant du backend Laravel. */

/** Les cinq rôles portés par `users.role` (vroom-backend/app/Models/User.php). */
export type RoleUser =
  | "client"
  | "vendeur"
  | "concessionnaire"
  | "auto_ecole"
  | "admin";

/** Les quatre valeurs de `users.statut` (constantes du modèle User, lignes 65-68). */
export type StatutUser = "actif" | "en_attente" | "suspendu" | "banni";

export type User = {
  /** UUID côté Laravel (le modèle utilise HasUuids), jamais un entier. */
  id: string;
  fullname: string;
  avatar: string | null;
  /** Réservé concessionnaire/auto_ecole (AuthController::coverProfile refuse client/vendeur en 403). */
  cover_photo?: string | null;
  role: RoleUser;
  /** Date d'inscription au format ISO 8601. */
  membre_since: string;
  /** Moyenne des avis sur 5, arrondie au dixième. Vaut 0 si aucun avis. */
  note_moyenne: number;
  nb_avis: number;
  /** Absents de la réponse quand le rôle est `client` : profil réduit. */
  adresse?: string | null;
  telephone?: string | null;
  /** Renvoyés par login/register (modèle complet), absents de profil(). */
  email?: string;
  statut?: StatutUser;
  /** Renseigné uniquement pour concessionnaire/auto_ecole (`required_if` à l'inscription, register:156). */
  raison_sociale?: string | null;
  /** "google" = pas de mot de passe local, voir AuthController::changePassword(). Absent des réponses restreintes. */
  auth_provider?: "local" | "google";
};

/** Carte vendeur de l'accueil ; `Pick` dérive de `User` pour rester synchro si le back change. */
export type VendeurVedette = Pick<
  User,
  "id" | "fullname" | "avatar" | "role" | "note_moyenne" | "nb_avis"
> & {
  /** `data.vehicules.length` dans profil() : les véhicules EN LIGNE, pas les vendus. */
  nb_vehicules: number;
};

/** Réponse commune à `POST /api/login` et `POST /api/register`. */
export type ReponseAuth = {
  success: true;
  /** Token Sanctum en clair. Il ne doit JAMAIS finir dans localStorage : cookie httpOnly. */
  token: string;
  role: RoleUser;
  user: User;
};

/** Erreur d'auth : `login` → 401/403, `register` → 422 avec `errors` par champ. */
export type ErreurAuth = {
  success: false;
  /** Status HTTP recopié par le client depuis `reponse.status`, absent du JSON. */
  status: number;
  message: string;
  /** Présent uniquement sur un 422 : { email: ["Cet email est déjà utilisé."] }. */
  errors?: Record<string, string[]>;
};

/** Les 8 valeurs de `vehicules.statut` (constantes du modèle Vehicules, lignes 44-53). */
export type StatutVehicule =
  | "disponible"
  | "a_venir"
  | "réservé"
  | "vendu"
  | "loué"
  | "suspendu"
  | "banni"
  | "en_transaction";

/** `vehicules.post_type` : le véhicule est-il à vendre ou à louer (lignes 40-41). */
export type PostTypeVehicule = "vente" | "location";

/** `vehicules.type` : état du véhicule (lignes 42-43). À ne pas confondre avec `post_type`. */
export type TypeVehicule = "neuf" | "occasion";

/** Cycle de modération Gemini + `suspendu` (admin) + `retrait` (jamais assigné, à traiter en repli). */
export type StatutValidation =
  | "en_attente"
  | "validee"
  | "rejetee"
  | "suspendu"
  | "restauree"
  | "retrait";

/** Une carte du rail « Véhicules les plus vus » de la page d'accueil. */
export type VehiculeVus = {
  /** UUID réel du véhicule (HasUuids côté back) — jamais un entier, même si le mock de /vehicules/proches en utilise un pour le moment. */
  id: string;
  marque: string;
  modele: string;
  image: string;
  /** Fiche du véhicule, cible du lien "Découvrir" : "/vehicules/1". */
  href: string;
  /** Commune d'Abidjan où se trouve le véhicule : "Cocody". Affichée dans « Près de chez vous ». */
  commune?: string;
};

/** Les 7 compteurs du bloc `stats`. Tous calculés sur `created_by = utilisateur courant`. */
export type CompteursVendeur = {
  /** Véhicules au statut `disponible` UNIQUEMENT — ce n'est pas le stock total. */
  total_vehicule: number;
  total_vehicule_vendu: number;
  total_vehicule_loue: number;
  /** Somme de `vehicules.views_count`, cumul depuis toujours. */
  total_vues: number;
  /** Vues des véhicules CRÉÉS ce mois-ci, pas les vues reçues ce mois-ci. Le back filtre sur `created_at` du véhicule. */
  total_vues_mois: number;
  /** Lignes `vehicule_vues` datées d'aujourd'hui : celle-ci est bien une vue du jour. */
  total_vues_jour: number;
  /** Somme des `prix` des véhicules passés à `vendu` ce mois-ci, en FCFA (XOF), entier. */
  total_revenus: number;
};

/** Un des 12 points de `stats_mensuel`, de janvier à décembre de l'année courante. */
export type PointMois = {
  /** 1 à 12. */
  mois: number;
  /** Nom français minuscule tel que renvoyé par Carbon : "janvier". */
  nom_mois: string;
  ventes: number;
  vues: number;
  /** Bug back connu : ce champ ne filtre pas sur `created_by` (VendeurStatsController.php:53). */
  locations: number;
};

/** Un des 7 points de `stats_semaine`, du lundi au dimanche de la semaine en cours. */
export type PointJour = {
  /** Date ISO courte : "2026-08-14". */
  jour: string;
  /** Jour abrégé français façon Carbon : "jeu.". */
  nom_jour: string;
  ventes: number;
  vues: number;
  locations: number;
};

/** Relation `description` d'un véhicule : c'est elle qui porte marque, modèle et année, jamais `vehicules`. */
export type DescriptionVehicule = {
  marque: string;
  modele: string;
  annee: number;
};

/** Ligne du top 5 : le back ne sélectionne que ces colonnes (`get([...])`, ligne 93). */
export type VehiculeTopVues = {
  /** UUID : le modèle Vehicules utilise HasUuids (ligne 13), jamais un entier auto-incrémenté. */
  id: string;
  post_type: PostTypeVehicule;
  /** En FCFA. Laravel sérialise les `decimal` en STRING : "4500000", pas 4500000. */
  prix: string;
  statut: StatutVehicule;
  views_count: number;
  description: DescriptionVehicule | null;
  /** Chargées par `with(['description','photos'])` malgré le `get(['id', ...])` qui restreint `vehicules`. */
  photos: PhotoVehicule[];
};

/** Réponse complète de `GET /api/stats/mes-stats`, champ `data`. */
export type StatsVendeur = {
  stats: CompteursVendeur;
  stats_mensuel: PointMois[];
  stats_semaine: PointJour[];
  /** Clé en ANGLAIS côté back ("vehicle", pas "vehicule") : VendeurStatsController.php:90. Ne pas « corriger » ici, ça casserait le branchement. */
  top_vehicule_vues: {
    my_top_vehicle_most_vues: VehiculeTopVues[];
  };
  rdv: {
    total_rdv: number;
  };
};

/** `ProjectionClient` = projection calculée côté front depuis `mes-demandes`, PAS une réponse d'API — n'y remets pas de compteurs favoris/alertes/rdv/messages, ils ont déjà leur page. */
export type ProjectionClient = {
  /** `mes-demandes` → statut "confirmé" ET type "vente". Un achat non confirmé n'est pas un achat. */
  nb_achats: number;
  /** `mes-demandes` → statut "confirmé" ET type "location". */
  nb_locations: number;
  /** Somme des `prix_final` des VENTES confirmées seulement — les locations ont un tarif journalier, pas comparable. */
  total_depense: number;
};

/** Ce qui attend le client en haut de son profil — union discriminée sur `type`. */
export type ProchaineEcheance =
  | {
    type: "rdv";
    /** UUID : RendezVous utilise HasUuids (ligne 12). */
    id: string;
    /** ISO 8601 complet, `rendez_vous.date_heure` est casté en datetime côté Laravel. */
    date_heure: string;
    /** `rendez_vous.type` : les 3 valeurs du modèle. */
    nature: "visite" | "essai_routier" | "premiere_rencontre";
    lieu: string | null;
    vehicule_libelle: string;
  }
  | {
    type: "transaction";
    /** UUID : TransactionConclue utilise HasUuids (ligne 12). */
    id: string;
    /** `transactions_conclues.expires_at` : passé cette date, la transaction tombe en "expiré". */
    expires_at: string;
    /** Laravel sérialise `decimal` en string, comme `prix` plus haut. */
    prix_final: string;
    vehicule_libelle: string;
  };

/** `TransactionConclue` : un seul modèle pour `mes-demandes` (client) et `mes-transactions` (vendeur) — préfixe `transactions-conclues`, pas `transactions`. */
export type StatutTransaction = "en_attente" | "confirmé" | "expiré" | "refusé";

/** Une ligne de `vehicules_photos`. `path` est relatif au disque de stockage Laravel. */
export type PhotoVehicule = {
  id: string;
  path: string;
  is_primary: boolean;
  position: number;
};

/** Le véhicule tel qu'il arrive dans une transaction : `description` et `photos` chargées en eager. */
export type VehiculeTransaction = {
  id: string;
  post_type: PostTypeVehicule;
  statut: StatutVehicule;
  prix: string;
  description: DescriptionVehicule | null;
  photos: PhotoVehicule[];
};

/** Les 3 colonnes que le back charge partout où il attache un utilisateur à autre chose. */
export type UtilisateurResume = Pick<User, "id" | "fullname" | "avatar">;

/** L'autre partie : le vendeur vu du client, le client vu du vendeur. */
export type ContrepartieTransaction = UtilisateurResume;

/** `vendeur`/`client` optionnels — une seule des deux relations est chargée selon l'endpoint, le composant choisit via sa prop `perspective`. */
export type TransactionConclue = {
  id: string;
  /** Décide du statut final du véhicule : "vente" → vendu, "location" → loué (contrôleur, ligne 298). */
  type: PostTypeVehicule;
  statut: StatutTransaction;
  /** En FCFA, sérialisé en STRING comme tous les `decimal` de Laravel. */
  prix_final: string;
  /** Renseignées par le client à la confirmation, et UNIQUEMENT si `type === "location"`. */
  date_debut_location: string | null;
  date_fin_location: string | null;
  confirme_par_vendeur: boolean;
  confirme_par_client: boolean;
  /** Absent (pas juste null : la clé n'existe pas) sur `mes-demandes` — le contrôleur le masque
   * volontairement côté CLIENT (`makeHidden`) pour que le scan QR reste la seule façon de l'obtenir.
   * Visible normalement sur `mes-transactions` (c'est le vendeur qui détient le code et l'affiche en QR). */
  code_confirmation?: string;
  /** Même règle de masquage que `code_confirmation` (inversée côté client cette fois), et non-null
   * uniquement une fois la commande planifiée transactions:generer-codes-restitution passée
   * (date_fin_location atteinte, location confirmée). */
  code_restitution?: string | null;
  restitue_par_vendeur: boolean;
  restitue_par_client: boolean;
  /** ISO 8601. Sert de date de la transaction à l'affichage. */
  created_at: string;
  vehicule: VehiculeTransaction;
  vendeur?: ContrepartieTransaction;
  client?: ContrepartieTransaction;
};

/** `Favori` : `GET /favoris` charge le véhicule ENTIER sans filtre de statut — un favori vendu reste dans la liste. */
export type DescriptionVehiculeDetaillee = DescriptionVehicule & {
  kilometrage: number | null;
  /** Chaîne libre de 100 caractères en base, pas un enum : "Essence", "Diesel", "Hybride"… */
  carburant: string | null;
  transmission: string | null;
  carrosserie: string | null;
};

/** Les 3 valeurs possibles pour un papier (visite technique, carte grise, assurance). Accent inclus, comme en base. */
export type StatutDocument = "à_jour" | "expirée" | "non_concerné";

/** `vehicules_description.historique_accidents` : une tranche, jamais un détail chiffré. */
export type HistoriqueAccidents =
  | "aucun"
  | "quelques_accidents"
  | "nombreux_accidents";

/** Colonnes réservées à la fiche véhicule (pas catalogue/favoris) pour ne pas forcer les autres mocks à les connaître. Toutes nullable. */
export type DescriptionVehiculeFiche = DescriptionVehiculeDetaillee & {
  couleur: string | null;
  nombre_portes: number | null;
  nombre_places: number | null;
  visite_technique: StatutDocument | null;
  date_visite_technique: string | null;
  carte_grise: StatutDocument | null;
  date_carte_grise: string | null;
  assurance: StatutDocument | null;
  historique_accidents: HistoriqueAccidents | null;
  /** `json` casté en array côté Laravel. Liste libre : "Climatisation", "GPS", "Caméra de recul"… */
  equipements: string[] | null;
};

/** Le véhicule tel qu'Eloquent le sérialise sans `get([...])` : toutes les colonnes. */
export type VehiculeComplet = {
  id: string;
  created_by: string;
  post_type: PostTypeVehicule;
  type: TypeVehicule;
  statut: StatutVehicule;
  /** Cast `decimal:2` : Laravel renvoie "6250000.00", avec les deux décimales. */
  prix: string;
  /** Prix estimé par Gemini à la validation. Null tant qu'aucune analyse n'a abouti. */
  prix_suggere: string | null;
  negociable: boolean;
  date_disponibilite: string | null;
  status_validation: StatutValidation;
  views_count: number;
  created_at: string;
  description: DescriptionVehiculeDetaillee | null;
  photos: PhotoVehicule[];
};

/** Catalogue : `GET /vehicules`, public, sans filtre/tri/pagination — tout se fait côté client. */
export type CreateurVehicule = Pick<User, "id" | "fullname" | "role">;

/** Un véhicule du catalogue : le modèle complet, plus son vendeur. */
export type VehiculeCatalogue = VehiculeComplet & {
  creator: CreateurVehicule;
};

/** Fiche véhicule : `GET /vehicules/{id}`, publique. */
export type CreateurVehiculeFiche = Pick<User, "id" | "fullname" | "email">;

/** Fiche complète : `Omit`+réécriture plutôt que `&`, pour ne pas élargir le type de `description`. */
export type VehiculeFiche = Omit<VehiculeComplet, "description"> & {
  creator: CreateurVehiculeFiche;
  description: DescriptionVehiculeFiche | null;
};

export type VehiculeAdmin = Omit<VehiculeComplet, "description"> & {
  creator: CreateurVehicule;
  description: DescriptionVehiculeFiche | null;
  /** Motif saisi par l'admin au rejet (`rejeterVehicule`). Null tant qu'aucun rejet n'a eu lieu. */
  description_validation: string | null;
};

/** Compteurs incluant vendus/loués (scope `validee()` sans filtre statut) — jamais égal à `vehicules.length`. */
export type StatsCatalogue = {
  total_vehicules: number;
  en_vente: number;
  en_location: number;
};

/** `data` vaut `[]` si catalogue vide, sinon `{ vehicules, statsVehicules }` — à normaliser côté client. */
export type ReponseCatalogue = {
  vehicules: VehiculeCatalogue[];
  statsVehicules: StatsCatalogue;
};

/** Une ligne de `favoris`, véhicule inclus. */
export type Favori = {
  id: string;
  user_id: string;
  vehicule_id: string;
  /** Jamais null (`useCurrent()` en base) même si `store()` ne la renseigne pas à la création. */
  date_ajout: string;
  created_at: string;
  vehicule: VehiculeComplet;
};

/** Rendez-vous : `GET /rdv/mes-rdv`, triés `date_heure` DESC, à venir et passés mêlés — la page re-partitionne. */
export type TypeRendezVous = "visite" | "essai_routier" | "premiere_rencontre";

/** Les 5 valeurs de `rendez_vous.statut` (lignes 35-39). Noter les accents : "confirmé", pas "confirme". */
export type StatutRendezVous =
  | "en_attente"
  | "confirmé"
  | "refusé"
  | "annulé"
  | "terminé";

/** Un rendez-vous vu du côté client. La relation chargée est `vendeur`, jamais `client`. */
export type RendezVousClient = {
  id: string;
  client_id: string;
  vendeur_id: string;
  vehicule_id: string;
  /** ISO 8601. Casté en datetime côté Laravel. */
  date_heure: string;
  type: TypeRendezVous;
  statut: StatutRendezVous;
  /** Motif de l'annulation, saisi au moment d'annuler. Null tant que le RDV tient. */
  motif: string | null;
  lieu: string | null;
  notes: string | null;
  created_at: string;
  vendeur: UtilisateurResume;
  vehicule: VehiculeTransaction;
  /** Champ CALCULÉ (pas en base) : vrai dès qu'un avis existe pour ce VENDEUR, pas ce rdv — deux rdv confirmés avec le même vendeur passent tous les deux à `true`. */
  has_avis: boolean;
};

export type RendezVousVendeur = {
  id: string;
  client_id: string;
  vendeur_id: string;
  vehicule_id: string;
  date_heure: string;
  type: TypeRendezVous;
  statut: StatutRendezVous;
  motif: string | null;
  lieu: string | null;
  notes: string | null;
  created_at: string;
  client: UtilisateurResume;
  vehicule: VehiculeTransaction;
};

export type Rdv = {
  id: string;
  client_id: string;
  vendeur_id: string;
  vehicule_id: string;
  date_heure: string;
  type: TypeRendezVous;
  statut: StatutRendezVous;
  motif: string | null;
  lieu: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client: Pick<User, "id" | "fullname">;
  vendeur: Pick<User, "id" | "fullname">;
}

/** Messagerie : charge utile à la RACINE (pas sous `data`), contrairement au reste de l'API — exception du fichier. */
export type ParticipantConversation = UtilisateurResume & { role: RoleUser };

/** Une ligne de `messages`, avec son expéditeur chargé en eager (`with('sender:...')`). */
export type MessageChat = {
  /** UUID : le modèle Messages utilise HasUuids. */
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  /** Casté en boolean côté modèle. Passe à true dès que le destinataire ouvre le fil. */
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender: ParticipantConversation;
};

/** Exactement 3 champs sélectionnés par le back (`select('content','created_at','sender_id')`) — pas `id`, pas `read_at`, pas `sender`. */
export type DernierMessage = {
  content: string;
  created_at: string;
  /** Comparé à l'id de l'utilisateur courant pour préfixer l'aperçu par « Vous : ». */
  sender_id: string;
};

/** Une entrée de `GET /conversations`, enrichie à la main par le contrôleur. */
export type Conversation = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  vehicule_id: string;
  /** Null tant qu'aucun message n'a été envoyé : `findOrCreate` ne la renseigne pas. */
  last_message_at: string | null;
  created_at: string;
  /** `withCount` filtré `sender_id != moi` et `read_at IS NULL` — devient périmé à l'ouverture du fil, à remettre à 0 côté client. */
  unread_count: number;
  /** L'autre participant, résolu par comparaison de `participant_1_id` avec le mien. */
  other_participant: ParticipantConversation;
  last_message: DernierMessage | null;
  /** `with(['vehicule.description', 'vehicule.photos'])` sans restriction : le modèle entier. */
  vehicule: VehiculeComplet;
};

/** Notifications : `GET /notifications/mes-notifs`, charge utile SOUS `data` (contrairement à la messagerie) — pas de pagination. */
export type TypeNotification =
  | "rdv"
  | "formation"
  | "alerte_vehicule"
  | "moderation"
  | "transaction"
  | "support"
  | "tendance"
  | "reservation"
  /** Hérité. Plus jamais produit — à traiter en repli, pas à afficher. */
  | "abonnement";

/** Colonne nullable ajoutée après coup — notifications antérieures et `notifyAdmins()` arrivent avec `level: null`. */
export type NiveauNotification = "success" | "warning" | "error" | "info";

/** Sac de données non typé finement, forme dépend de `type` (rdv→rdv_id, transaction→transaction_id, etc.) — à narrower au point d'usage. */
export type DonneesNotification = Record<string, unknown> | null;

/** Une ligne de `notifications`. Le modèle utilise HasUuids et SoftDeletes. */
export type Notification = {
  id: string;
  user_id: string;
  type: TypeNotification;
  title: string;
  message: string;
  level: NiveauNotification | null;
  data: DonneesNotification;

  lu: boolean;
  is_read: boolean;
  /** Null tant que la notification n'a pas été lue. */
  lu_at: string | null;
  /** `->useCurrent()` en base : jamais null en pratique. */
  date_envoi: string;
  /** C'est sur `created_at` que le back trie (DESC), pas sur `date_envoi`. */
  created_at: string;
  updated_at: string;
  /** SoftDeletes. Non null seulement si la ligne a été supprimée en douceur. */
  deleted_at: string | null;
};

/** Une ligne d'avis laissé par un client sur un vendeur/auto-école (`vroom-backend/app/Models/Avis.php`). */
export type Avis = {
  id: string;
  client_id: string;
  /** L'un des deux vaut l'id du profil consulté, l'autre `null` — jamais les deux à la fois. */
  vendeur_id: string | null;
  auto_ecole_id: string | null;
  note: number;
  commentaire: string | null;
  date_avis: string;
  created_at: string;
  client: Pick<User, "id" | "fullname">;
};

export type ProfilPublic = {
  vendeur: User;
  vehicules: VehiculeComplet[];
  formations: FormationCatalogue[];
  avis: Avis[];
};

/** Réponse de `GET /avis/vendeur/{id}` (AvisController::avisVendeur), publique. */
export type ReponseAvisVendeur = {
  avis: Avis[];
  /** `round(moyenne, 1)` côté back ; vaut 0 si `avis` est vide. */
  note_moyenne: number;
  total: number;
};

/** Pagination Laravel standard (`->paginate(20)`), sérialisée telle quelle sous `data`. Les champs de navigation (`links`, `*_page_url`…) existent aussi mais aucune page ne les lit encore. */
export type Paginateur<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

/** `data` de GET /admin/activity-log (Paginateur<ActivityLogEntry>) — voir AdminController::activityLog(). */
export type ActivityLogEntry = {
  id: number;
  description: string;
  subject_type: string;
  subject_id: string;
  event: string | null;
  created_at: string;
  /** null pour une action système (causer_id absent). */
  causer: { id: string; fullname: string } | null;
  properties: {
    old?: Record<string, string | number | boolean | null>;
    attributes?: Record<string, string | number | boolean | null>;
  };
};

/** Les trois valeurs de `formations.statut_validation` (constantes du modèle Formation, lignes 40-42) — avec accents, contrairement à `StatutValidation` des véhicules. */
export type StatutValidationFormation = "en_attente" | "validé" | "rejeté";

/** Les deux valeurs de `formations.statut` (Formation::STATUT_DISPONIBLE/RETIREE) — visibilité publique APRÈS validation, distinct de `statut_validation` (modération). Même rôle que `Vehicules::statut`. */
export type StatutFormation = "disponible" | "retiree";

/** Formation vue par l'admin (`GET /admin/formations` ou `GET /admin/formations/{id}`, AdminController::formations()/formation()) : `withCount('inscriptions')` ajoute `inscriptions_count`, absent du modèle Formation brut. */
export type FormationAdmin = {
  id: string;
  titre: string;
  description: string;
  type_permis: string;
  /** Cast `decimal:2` côté Laravel : sérialisé en string, jamais en number. */
  prix: string;
  duree_heures: number;
  lieu: string;
  nombre_places: number;
  deroulement: string | null;
  statut_validation: StatutValidationFormation;
  statut: StatutFormation;
  created_at: string;
  inscriptions_count: number;
  /** Relation `autoEcole()` du modèle Formation — mais `Model::$snakeAttributes` (true par défaut) sérialise sa clé JSON en snake_case, quel que soit le nom PHP de la relation. */
  auto_ecole: { id: string; fullname: string; avatar: string | null };
};

/** Les 6 valeurs de `type_permis` (StoreFormationRequest::rules(), `Rule::in(['A','A2','B','B1','C','D'])`). */
export type TypePermis = "A" | "A2" | "B" | "B1" | "C" | "D";

export type FormationCatalogue = {
  id: string;
  titre: string;
  description: string;
  type_permis: TypePermis;
  /** Cast `decimal:2` côté Laravel : sérialisé en string, jamais en number. */
  prix: string;
  duree_heures: number;
  lieu: string | null;
  nombre_places: number | null;
  deroulement: string | null;
  created_at: string;
  inscriptions_count: number;
  auto_ecole: { id: string; fullname: string; avatar: string | null; note_moyenne: string | null };
};

/** Les 7 valeurs de `inscriptions_formation.statut_eleve` (constantes du modèle InscriptionFormation, lignes 27-35). */
export type StatutEleve =
  | "préinscrit"
  | "paiement_en_cours"
  | "inscrit"
  | "en_cours"
  | "examen_passe"
  | "terminé"
  | "abandonné";

/** Une ligne de `GET /formations/mes-inscriptions` — juste de quoi savoir si le client connecté est déjà inscrit à une formation donnée. */
export type InscriptionFormationClient = {
  id: string;
  formation_id: string;
  statut_eleve: StatutEleve;
  date_examen: string | null;
  reussite: boolean | null;
  created_at: string;
};

export type FormationAutoEcole = {
  id: string;
  titre: string;
  description: string;
  type_permis: TypePermis;
  /** Cast `decimal:2` côté Laravel : sérialisé en string, jamais en number. */
  prix: string;
  duree_heures: number;
  lieu: string | null;
  nombre_places: number | null;
  deroulement: string | null;
  statut_validation: StatutValidationFormation;
  statut: StatutFormation;
  created_at: string;
  inscriptions_count: number;
};

/** `GET /formations/mes-stats` (FormationController::mesStats()) : stats globales, toutes formations de l'auto-école confondues. */
export type StatsAutoEcole = {
  nb_formations: number;
  total_inscrits: number;
  en_cours: number;
  termines: number;
  reussis: number;
  abandonnes: number;
  /** Calculé sur les `termines` seulement (voir le commentaire du back) — `null` tant qu'aucune formation n'est terminée, pour éviter un 0/0. */
  taux_reussite: number | null;
  /** Nouvelles inscriptions, une entrée par mois de l'année en cours (toujours 12 entrées, zéro compris). */
  stats_mensuel: { mois: number; nom_mois: string; inscriptions: number }[];
  /** Nouvelles inscriptions, une entrée par jour de la semaine en cours (toujours 7 entrées, zéro compris). */
  stats_semaine: { jour: string; nom_jour: string; inscriptions: number }[];
};

/** `GET /formations/{id}/stats` (FormationController::stats()) : stats d'UNE formation, contrairement à StatsAutoEcole. */
export type StatsFormation = {
  total: number;
  en_cours: number;
  examens_passes: number;
  termines: number;
  reussis: number;
  echoues: number;
  abandonnes: number;
  taux_reussite: number | null;
};

/** Une ligne de `GET /formations/{id}/inscrits` (FormationController::inscrits()) — élève inscrit, vu par l'auto-école propriétaire. */
export type EleveInscrit = {
  id: string;
  statut_eleve: StatutEleve;
  date_inscription: string;
  date_examen: string | null;
  reussite: boolean | null;
  client: {
    id: string;
    fullname: string;
    email: string;
    avatar: string | null;
    telephone: string | null;
    adresse: string | null;
  };
};

/** Une ligne de `GET /formations/mes-inscrits` (FormationController::mesInscrits()) — même forme
 * qu'`EleveInscrit`, mais TOUTES formations confondues, d'où le `formation` en plus pour savoir
 * laquelle est concernée (absent sur `EleveInscrit`, qui est déjà scopé à une seule formation). */
export type InscritAutoEcole = EleveInscrit & {
  /** Somme agrégée des versements (`withSum`, pas l'accesseur du modèle — voir FormationController::mesInscrits()).
   * `null` si aucun versement n'existe encore pour cette inscription (SUM() SQL sans ligne = NULL, pas 0). */
  montant_paye: number | null;
  formation: {
    id: string;
    type_permis: TypePermis;
    titre: string;
    /** Cast `decimal:2` côté Laravel : sérialisé en string, jamais en number — comparer avec Number(). */
    prix: string;
  };
};

export type TypeRemise = "pourcentage" | "montant_fixe";

/** Un paiement reçu par l'auto-école pour une inscription (`versements_inscription`) — pure
 * comptabilité déclarative, aucun argent ne transite par Move CI (voir VersementInscriptionController). */
export type Versement = {
  id: string;
  inscription_id: string;
  /** Cast `decimal:2` côté Laravel : sérialisé en string — comparer/formater avec Number(). */
  montant: string;
  date_versement: string;
  note: string | null;
};

/** Réponse de `GET /formations/{formationId}/inscrits/{inscriptionId}/versements`. */
export type DetailVersements = {
  versements: Versement[];
  montant_paye: number;
  montant_total: number;
  reste_a_payer: number;
};

/** Une ligne de `GET /formations/{id}/promotions` (PromotionsController) — code promo géré par l'auto-école propriétaire de la formation. */
export type Promotion = {
  id: string;
  formation_id: string;
  code: string;
  type_remise: TypeRemise;
  /** Cast `decimal:2` côté Laravel : sérialisé en string, jamais en number — même piège que `Formation.prix`. */
  valeur: string;
  date_debut: string | null;
  date_fin: string | null;
  /** `null` = pas de limite d'utilisation. */
  usage_max: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
};

/** Colonnes sélectionnées par `AdminController::users()` — pas le `User` complet (ni avatar, ni note). */
export type UtilisateurAdmin = {
  id: string;
  fullname: string;
  email: string;
  telephone: string | null;
  role: RoleUser;
  statut: StatutUser;
  created_at: string;
  /** Renseigné pour concessionnaire/auto_ecole seulement, `null` sinon. */
  raison_sociale: string | null;
};

/** Admin : routes/api.php 231-260 derrière `role:admin` — un véhicule admin est un `VehiculeCatalogue`, pas de nouveau type. */
export type StatutSignalement = "en_attente" | "traité" | "rejeté";

/** Les 4 valeurs de `support_tickets.statut` (constantes du modèle SupportTicket, lignes 41-44) — avec accents sur résolu/fermé. */
export type StatutTicket = "ouvert" | "en_cours" | "résolu" | "fermé";

/** Les 4 valeurs de `support_tickets.priorite` (SupportController::store(), validation `in:basse,normale,haute,urgente`). */
export type PrioriteTicket = "basse" | "normale" | "haute" | "urgente";

/** Ticket vu par l'admin (`GET /admin/support`, SupportController::index()) : `with('user:id,fullname,email,role')`. */
export type TicketSupportAdmin = {
  id: string;
  sujet: string;
  message: string;
  statut: StatutTicket;
  priorite: PrioriteTicket;
  reponse_admin: string | null;
  /** Renseigné seulement après une réponse admin (repondre()). */
  admin: { id: string; fullname: string } | null;
  repondu_at: string | null;
  created_at: string;
  user: { id: string; fullname: string; email: string; role: RoleUser };
};

/** Un point de `inscriptions_par_mois` : `AdminController::stats()`, ligne 468-473. */
export type PointInscriptionMois = {
  /** "2026-03", format `DATE_FORMAT(..., '%Y-%m')` — pas de `nom_mois` ici, contrairement à `PointMois`. */
  mois: string;
  total: number;
};

/** Une ligne de `transactions` dans `stats()` : `groupBy('type','statut')`, ligne 485-487. */
export type PointTransactionAdmin = {
  type: PostTypeVehicule;
  statut: StatutTransaction;
  total: number;
};

/** `data` de `GET /admin/stats` — chaque `Record` partiel vient d'un `pluck()`, une clé absente vaut `undefined`, toujours lire avec `?? 0`. */
export type StatsAdmin = {
  /** Jamais la clé "admin" : la requête back filtre `whereIn('role', [client, vendeur, concessionnaire, auto_ecole])`. */
  users_par_role: Partial<Record<Exclude<RoleUser, "admin">, number>>;
  users_par_statut: Partial<Record<StatutUser, number>>;
  inscriptions_par_mois: PointInscriptionMois[];
  vehicules_validation: Partial<Record<StatutValidation, number>>;
  vehicules_statut: Partial<Record<StatutVehicule, number>>;
  transactions: PointTransactionAdmin[];
  /** Somme des `prix_final` des ventes confirmées. Déjà un entier côté back (`(int) $caVentes`). */
  ca_ventes: number;
  signalements_statut: Partial<Record<StatutSignalement, number>>;
  /** Jamais "client" ni "vendeur" : filtré sur `[concessionnaire, auto_ecole]`. */
  partenaires_par_type: Partial<Record<"concessionnaire" | "auto_ecole", number>>;
  formations_validation: Partial<Record<StatutValidationFormation, number>>;
  formations_par_permis: { type_permis: string; total: number }[];
  inscriptions_par_statut: Partial<Record<string, number>>;
  /** Élèves ayant passé l'examen (`statut_eleve` in [examen_passe, terminé]), tous résultats confondus. */
  examens_total: number;
  /** Sous-ensemble de `examens_total` où `reussite = true`. Taux de réussite = `examens_reussis / examens_total`. */
  examens_reussis: number;
};

/** Une ligne de `top_marques_favoris`/`top_marques_vues` : `AdminController::statsMarche()`. */
export type PointMarque = {
  marque: string;
  favoris: number;
  vues: number;
};

/** Une ligne de `top_modeles_favoris` — pas de `vues` ici, le back ne la calcule pas par modèle. */
export type PointModele = {
  marque: string;
  modele: string;
  favoris: number;
};

/** Une ligne de `repartition_carburant_demande`. */
export type PointCarburant = {
  carburant: string;
  favoris: number;
  vues: number;
};

/** Une ligne de `tranches_prix_demande` — 5 tranches fixes, calculées en SQL (`CASE WHEN`), jamais vides côté type. */
export type PointTranchePrix = {
  tranche: "< 5M" | "5–10M" | "10–20M" | "20–35M" | "> 35M";
  favoris: number;
};

/** `taux_conversion` déjà arrondi côté back (`round(..., 1)`), en pourcentage — pas à diviser par 100. */
export type ConversionRdvTransaction = {
  total_rdv: number;
  rdv_termines: number;
  transactions_confirmees: number;
  taux_conversion: number;
};

/** `data` de `GET /admin/stats/marche` — comportement acheteurs (favoris, vues, prix), pas les comptes eux-mêmes. */
export type StatsMarche = {
  top_marques_favoris: PointMarque[];
  top_modeles_favoris: PointModele[];
  repartition_carburant_demande: PointCarburant[];
  tranches_prix_demande: PointTranchePrix[];
  conversion_rdv_transaction: ConversionRdvTransaction;
  top_marques_vues: PointMarque[];
};

/** Infos de base d'un client, communes à la liste et à la fiche détaillée. */
export type CrmClient = {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  telephone: string | null;
  adresse: string | null;
};

/** Une ligne de `GET /crm/clients` — le client + ses stats agrégées avec ce vendeur. */
export type CrmClientResume = CrmClient & {
  nb_rdv: number;
  nb_transactions: number;
  /** Somme de `prix_final` sur les transactions confirmées — nombre, pas string (calculé via `->sum()`, pas casté par le modèle). */
  chiffre_affaires: number;
  derniere_interaction: string | null;
  statut_dernier_rdv: StatutRendezVous | null;
};

/** Une note privée du vendeur sur un client (CrmNote, jamais visible du client). */
export type CrmNote = {
  id: string;
  vendeur_id: string;
  client_id: string;
  contenu: string;
  created_at: string;
  updated_at: string;
};

/** Un RDV tel que chargé par `clientDetail()` : `vehicule.description` en eager, pas de relation `client` (déjà connu). */
export type CrmRdv = {
  id: string;
  date_heure: string;
  type: TypeRendezVous;
  statut: StatutRendezVous;
  motif: string | null;
  lieu: string | null;
  vehicule: VehiculeTransaction;
};

/** `data` de `GET /crm/clients/{clientId}` : fiche complète d'un client pour ce vendeur. */
export type CrmClientDetail = {
  client: CrmClient & { created_at: string };
  rdvs: CrmRdv[];
  transactions: TransactionConclue[];
  notes: CrmNote[];
  stats: {
    nb_rdv: number;
    nb_confirmes: number;
    nb_termines: number;
    nb_transactions: number;
    chiffre_affaires: number;
  };
};

/** `StatutTicket`/`PrioriteTicket` déjà définis plus haut (admin/support, ligne ~736) — réutilisés tels quels. */
export type SupportTicket = {
  id: string;
  sujet: string;
  message: string;
  statut: StatutTicket;
  priorite: PrioriteTicket;
  /** `null` tant qu'aucun admin n'a répondu. */
  reponse_admin: string | null;
  repondu_at: string | null;
  created_at: string;
};

export type StatutReservation = "en_attente" | "confirmee" | "annulee" | "expiree";

/** Colonnes chargées par `Reservation::with('vehicule:...')` — sous-ensemble de `VehiculeTransaction`, sans les photos. */
export type VehiculeReservation = {
  id: string;
  post_type: PostTypeVehicule;
  statut: StatutVehicule;
  prix: string;
  date_disponibilite: string | null;
  description: DescriptionVehicule | null;
};

export type Reservation = {
  id: string;
  statut: StatutReservation;
  expires_at: string;
  annulations_count: number;
  cancelled_at: string | null;
  created_at: string;
  vehicule: VehiculeReservation;
};

/** Même contrat qu'ailleurs (`description.carburant`, types/index.ts:261) : string libre, pas d'union stricte. */
export type Alerte = {
  id: string;
  marque_cible: string | null;
  modele_cible: string | null;
  /** decimal Laravel → toujours une string en JSON, jamais un number. */
  prix_max: string | null;
  carburant: string | null;
  active: boolean;
  created_at: string;
};

export type SignalementCibleVehicule = {
  id: string;
  description: DescriptionVehicule | null;
};

export type Signalement = {
  id: string;
  motif: string;
  description: string | null;
  statut: StatutSignalement;
  /** Renseignés seulement une fois `statut` sorti de `en_attente` (AdminController::traiterSignalement). */
  action_cible: string | null;
  note_admin: string | null;
  date_signalement: string;
  /** Une seule des deux cibles est non-null — jamais les deux (contrainte du `store()`). */
  cible_user: { id: string; fullname: string } | null;
  cible_vehicule: SignalementCibleVehicule | null;
};
