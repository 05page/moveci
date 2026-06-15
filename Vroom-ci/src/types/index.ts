export interface User {
  id: string;
  fullname: string;
  role: string;
  partenaire_type: string;
  email: string;
  telephone: string;
  adresse: string;
  email_verified_at: string;
  account_status: string;
  statut: 'actif' | 'suspendu' | 'banni' | 'en_attente';
  data: string;
  // null = onboarding pas encore fait, string ISO = onboarding terminé
  onboarding_completed_at: string | null;
  // Champs spécifiques aux partenaires
  raison_sociale?: string;
  rccm?: string;
  numero_agrement?: string;
}

export type UserRole =
  | "client" | "admin" | "vendeur" | "concessionnaire" | "auto_ecole"

export type PartenaireType =
  | "concessionnaire" | "auto_ecole"

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  total: number;
  per_page: number;
  last_page: number;
}

export interface StatsMensuel {
  mois: number
  nom_mois: string
  vues: number
  ventes: number
  locations: number
}

export interface VendeurStats {
  stats: VendeurStatsGlobal;
  stats_mensuel: StatsMensuel[];
  top_vehicule_vues: TopVehiculesVues;
  vehicule: vehicule
  rdv: VendeurRdv;
}

export interface VendeurStatsGlobal {
  total_vehicule: number;
  total_vehicule_vendu: number;
  total_vehicule_loue: number;
  total_vehicule_vente: number;
  total_vehicule_location: number;
  total_vues: number;
  total_vues_mois: number;
  total_revenus: string;
}

export interface TopVehicle {
  id: number;
  post_type: string;
  statut: string;
  prix: string | number;
  views_count: number;
  description: VehiculeDescription;
}

export interface MesVehicules {
  vehicules: vehicule[]
}

export interface PlanAbonnement {
  id: string
  nom: string
  description: string
  cible: 'vendeur' | 'concessionnaire' | 'auto_ecole'
  prix_mensuel: number
  prix_annuel: number
  nb_annonces_max: number
  nb_photos_max: number
  stats_avancees: boolean
  badge_premium: boolean
  boost_annonces: boolean
  acces_leads: boolean
  support_prioritaire: boolean
}

export interface Abonnement {
  id: string
  plan_id: string
  user_id: string
  date_debut: string
  date_fin: string
  statut: 'actif' | 'expiré' | 'suspendu' | 'résilié'
  periodicite: 'mensuel' | 'annuel'
  renouvellement_auto: boolean
  plan?: PlanAbonnement
}

export interface CrmNote {
  id: string
  vendeur_id: string
  client_id: string
  contenu: string
  created_at: string
  updated_at: string
}

export interface CrmClient {
  id: string
  fullname: string
  email: string
  avatar?: string
  telephone?: string
  adresse?: string
  nb_rdv: number
  nb_transactions: number
  chiffre_affaires: number
  derniere_interaction: string | null
  statut_dernier_rdv: string | null
}

export interface CrmClientDetail {
  client: CrmClient
  rdvs: RendezVous[]
  transactions: TransactionConclue[]
  notes: CrmNote[]
  stats: {
    nb_rdv: number
    nb_confirmes: number
    nb_termines: number
    nb_transactions: number
    chiffre_affaires: number
  }
}

export interface DescriptionFormation {
  id: string
  formation_id: string
  titre: string
  texte: string
  langue: string
}

export interface Formation {
  id: string
  auto_ecole_id: string
  type_permis: 'A' | 'A2' | 'B' | 'B1' | 'C' | 'D'
  prix: number
  duree_heures: number
  statut_validation: 'en_attente' | 'validé' | 'rejeté'
  inscriptions_count?: number
  created_at: string
  auto_ecole?: { id: string; fullname: string; avatar?: string; note_moyenne?: number; taux_reussite?: number; adresse_showroom?: string }
  description?: DescriptionFormation
}

export interface Versement {
  id: string
  inscription_id: string
  montant: number
  date_versement: string
  note: string | null
  created_at: string
}

export interface InscriptionFormation {
  id: string
  client_id: string
  formation_id: string
  date_inscription: string
  statut_eleve: 'préinscrit' | 'paiement_en_cours' | 'inscrit' | 'en_cours' | 'examen_passe' | 'terminé' | 'abandonné'
  date_examen: string | null
  reussite: boolean | null
  montant_paye?: number
  client?: { id: string; fullname: string; avatar?: string; email?: string; telephone?: string; adresse?: string }
  formation?: Formation
}

export interface TransactionConclue {
  id: string
  rendez_vous_id: string
  vehicule_id: string
  vendeur_id: string
  client_id: string
  type: 'vente' | 'location' | null
  prix_final: number | null
  date_debut_location: string | null
  date_fin_location: string | null
  code_confirmation: string
  expires_at: string
  confirme_par_vendeur: boolean
  confirme_par_client: boolean
  statut: 'en_attente' | 'confirmé' | 'expiré' | 'refusé'
  created_at: string
  vendeur?: { id: string; fullname: string; avatar?: string }
  client?: { id: string; fullname: string; avatar?: string }
  vehicule?: vehicule
}

export interface TopVehiculesVues {
  my_top_vehicle_most_vues: TopVehicle[];
  my_recent_vehicle: TopVehicle[];
}

export interface VendeurRdv {
  rdv_recents: Transaction[];
  total_rdv: number;
}

export interface Transaction {
  id: number;
  post_type: string;
  type_finalisation: string;
  vehicule: {
    id: number;
    description?: any;
    photos?: any[];
  };
  client: {
    id: number;
    fullname: string;
    email: string;
    telephone: string;
    adresse: string;
  };
  proprietaire: {
    id: number;
    fullname: string;
    email: string;
    telephone: string;
    adresse: string;
  };
}

export interface vehicule {
  id: string;
  post_type: "vente" | "location"
  type: string;
  statut: string;
  prix: number;
  negociable: boolean;
  date_disponibilite: Date;
  status_validation: string;
  views_count: string;
  creator?: { id: string; fullname: string; email?: string; role?: string; adresse?: string }; // vendeur du véhicule
  description: VehiculeDescription;
  photos?: VehiculePhotos[]; // photos du véhicule (relation Eloquent chargée avec 'photos')
}

export interface VehiculeStats{
  total_vehicules: number
  en_vente: number
  en_location: number
}

export interface VehiculeDescription {
  vehicule_id: string;
  marque: string;
  modele: string;
  annee: number;
  carburant: string;
  transmission: string;
  kilometrage: string;
  couleur: string;
  nombre_portes: number;
  nombre_places: number;
  visite_technique: boolean;
  date_visite_technique: Date;
  carte_grise: boolean;
  date_carte_grise: boolean;
  assurance: boolean;
  historique_accidents: boolean;
  equipements: string[];
  photos: VehiculePhotos[]
}

export interface VehiculePhotos {
  vehicule_id: string;
  path: string;
  is_primary: boolean
  position: number
}

export interface AllVehicules {
  vehicules: vehicule[]
  statsVehicules: VehiculeStats
}

export interface RendezVous {
  id: string
  client_id: string
  vendeur_id: string
  vehicule_id: string
  date_heure: string
  type: 'visite' | 'essai_routier' | 'premiere_rencontre'
  statut: 'en_attente' | 'confirmé' | 'refusé' | 'annulé' | 'terminé'
  motif?: string | null
  lieu?: string | null
  notes?: string | null
  client?: { id: string; fullname: string; avatar?: string | null; telephone?: string | null }
  vendeur?: { id: string; fullname: string; avatar?: string | null; telephone?: string | null }
  vehicule?: vehicule
  has_avis?: boolean
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  vehicule_id: string
  client_id: string
  statut: 'en_attente' | 'confirmee' | 'annulee' | 'expiree'
  expires_at: string
  annulations_count: number
  cancelled_at?: string | null
  vehicule?: vehicule
  client?: { id: string; fullname: string; email: string; telephone?: string | null }
  created_at: string
  updated_at: string
}

export interface MesNotifs {
  notifications: Notifications[]
}
export interface Notifications{
  id: number
  recever_id:number
  type: string
  title: string
  level?: "success" | "warning" | "error" | "info"
  data?: Record<string, string | number>
  message: string
  is_read: boolean
  unread_count: number
  read_at: Date
  created_at: Date
}

export interface Favori {
  id: string
  user_id: number
  vehicule_id: string
  date_ajout: string
  vehicule?: vehicule
}

// Alias conservé pour compatibilité, utiliser RendezVous directement
export type ClientRdvItem = RendezVous
export type RdvItem = RendezVous

export interface Alerte {
  id: string
  user_id: string
  marque_cible?: string | null
  modele_cible?: string | null
  prix_max?: number | null
  carburant?: string | null
  active: boolean
  created_at: string
}

export interface Avis {
  id: string
  client_id: string
  vendeur_id: string
  note: number // 1 à 5
  commentaire?: string | null
  date_avis: string
  client?: { id: string; fullname: string; avatar?: string | null }
}

export interface AvisVendeur {
  avis: Avis[]
  note_moyenne: number
  total: number
}

// ─── Messagerie ───────────────────────────────────────────────────────────────

/** Un participant minimal retourné dans une conversation */
export interface ConversationParticipant {
  id: string
  fullname: string
  avatar?: string | null
  role: string
}

/** Une conversation entre deux utilisateurs, toujours liée à un véhicule */
export interface Conversation {
  id: string   // UUID
  participant_1_id: string
  participant_2_id: string
  vehicule_id: string
  last_message_at: string | null
  created_at: string
  updated_at: string
  // Relations chargées par le backend
  other_participant: ConversationParticipant  // l'autre user (pas moi)
  vehicule?: Pick<vehicule, 'id' | 'description' | 'photos' | 'prix'>
  last_message?: Pick<Message, 'content' | 'created_at' | 'sender_id'>
  unread_count: number
}

/** Un message dans une conversation */
export interface Message {
  id: string   // UUID
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null  // null = non lu
  created_at: string
  updated_at: string
  // Relation chargée
  sender?: ConversationParticipant
}

/** Réponse du backend pour la liste des conversations */
export interface ConversationsResponse {
  conversations: Conversation[]
}

/** Réponse du backend pour les messages d'une conversation */
export interface MessagesResponse {
  messages: Message[]
}

// ─── Support / Aide ───────────────────────────────────────────────────────────

/** Un ticket de support soumis par un utilisateur */
export interface SupportTicket {
  id: string
  user_id: string
  sujet: string
  message: string
  statut: 'ouvert' | 'en_cours' | 'résolu' | 'fermé'
  priorite: 'basse' | 'normale' | 'haute' | 'urgente'
  reponse_admin: string | null
  admin_id: string | null
  repondu_at: string | null
  created_at: string
  /** Présent uniquement dans les vues admin */
  user?: { id: string; fullname: string; email: string; role: string }
}

// ─── Stats marché (admin) ──────────────────────────────────────────────────────

/**
 * Données marché retournées par GET /admin/stats/marche.
 * Représente les comportements acheteurs : favoris, vues, RDV, conversions.
 */
export interface StatsMarche {
  /** Marques les plus ajoutées en favori avec leur nombre de vues associées */
  top_marques_favoris:           { marque: string; favoris: number; vues: number }[]
  /** Modèles les plus ajoutés en favori (marque + modèle) */
  top_modeles_favoris:           { marque: string; modele: string; favoris: number }[]
  /** Répartition des favoris et vues par type de carburant */
  repartition_carburant_demande: { carburant: string; favoris: number; vues: number }[]
  /** Nombre de favoris groupés par tranche de prix */
  tranches_prix_demande:         { tranche: string; favoris: number }[]
  /** Taux de conversion RDV → transaction confirmée */
  conversion_rdv_transaction: {
    total_rdv:               number
    rdv_termines:            number
    transactions_confirmees: number
    taux_conversion:         number
  }
  /** Marques les plus consultées (vues) sur la plateforme */
  top_marques_vues:              { marque: string; vues: number }[]
}

// ─── Stats géographiques (admin) ───────────────────────────────────────────────

/**
 * Données de répartition géographique retournées par GET /admin/stats/geographie.
 * Permet de visualiser la couverture territoriale de la plateforme.
 */
export interface StatsGeographie {
  acheteurs_par_zone:    { zone: string; total: number }[]
  vendeurs_par_zone:     { zone: string; total: number }[]
  partenaires_par_zone:  { zone: string; total: number }[]
  vehicules_par_zone:    { zone: string; total: number }[]
  couverture: {
    zones_avec_vendeurs: number
    zones_sans_vendeurs: number
    zones_total:         number
  }
}