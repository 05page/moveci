import { Bike, Bus, Car, Truck, type LucideIcon } from "lucide-react"

import type { StatutEleve, StatutFormation, StatutValidationFormation, TypePermis } from "@/types"

/**
 * Helpers du domaine « formation ».
 *
 * Miroir de lib/vehicule.ts, pour la même raison : dépend des types métier,
 * n'a rien à faire dans utils.ts.
 */

/** Icône par type de permis — Formation n'a pas de photo, l'icône EST la vignette. */
export const ICONE_PERMIS: Record<TypePermis, LucideIcon> = {
  A: Bike,
  A2: Bike,
  B: Car,
  B1: Car,
  C: Truck,
  D: Bus,
}

/** Libellé affiché sous le code brut ("B" -> "Voiture"). */
export const LIBELLE_PERMIS: Record<TypePermis, string> = {
  A: "Moto",
  A2: "Moto (bridée)",
  B: "Voiture",
  B1: "Voiturette",
  C: "Poids lourd",
  D: "Transport en commun",
}

/** Libellé et couleur des 7 valeurs de `StatutEleve`, une fois le client déjà inscrit à une formation. */
export const STYLE_STATUT_ELEVE: Record<StatutEleve, { libelle: string; classes: string }> = {
  préinscrit: { libelle: "Préinscrit", classes: "bg-secondary text-secondary-foreground" },
  paiement_en_cours: { libelle: "Paiement en cours", classes: "bg-secondary text-secondary-foreground" },
  inscrit: { libelle: "Inscrit", classes: "bg-accent text-accent-foreground" },
  en_cours: { libelle: "En cours", classes: "bg-accent text-accent-foreground" },
  examen_passe: { libelle: "Examen passé", classes: "border-primary bg-transparent text-primary" },
  terminé: { libelle: "Terminé", classes: "border-primary bg-transparent text-primary" },
  abandonné: { libelle: "Abandonné", classes: "bg-destructive/10 text-destructive" },
}

/** Libellé et couleur des 3 valeurs de `formations.statut_validation` — le cycle de modération, vu côté auto-école. */
export const STYLE_STATUT_VALIDATION_FORMATION: Record<StatutValidationFormation, { libelle: string; classes: string }> = {
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  validé: { libelle: "Validée", classes: "bg-accent text-accent-foreground" },
  rejeté: { libelle: "Rejetée", classes: "bg-destructive/10 text-destructive" },
}

/** Libellé et couleur des 2 valeurs de `formations.statut` — visibilité publique APRÈS validation, distinct de `statut_validation`. */
export const STYLE_STATUT_FORMATION: Record<StatutFormation, { libelle: string; classes: string }> = {
  disponible: { libelle: "En ligne", classes: "bg-accent text-accent-foreground" },
  retiree: { libelle: "Retirée", classes: "bg-muted text-muted-foreground" },
}
