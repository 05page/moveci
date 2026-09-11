import type {
  DescriptionVehicule,
  HistoriqueAccidents,
  PhotoVehicule,
  StatutDocument,
  StatutValidation,
  StatutVehicule,
} from "@/types"

/**
 * Helpers du domaine « véhicule ».
 *
 * Ils vivent ici et pas dans `utils.ts` parce qu'ils dépendent des types métier :
 * `utils.ts` reste le tiroir des fonctions de présentation pures (dates, montants,
 * classes CSS) et ne doit rien savoir de la forme des données Laravel.
 */

/** Libellé et couleur des 8 valeurs de `vehicules.statut`. Le Record force à toutes les couvrir. */
export const STYLE_STATUT: Record<
  StatutVehicule,
  { libelle: string; classes: string }
> = {
  disponible: { libelle: "Disponible", classes: "bg-accent text-accent-foreground" },
  a_venir: { libelle: "À venir", classes: "bg-secondary text-secondary-foreground" },
  réservé: { libelle: "Réservé", classes: "bg-secondary text-secondary-foreground" },
  vendu: { libelle: "Vendu", classes: "bg-secondary text-secondary-foreground" },
  loué: { libelle: "Loué", classes: "bg-secondary text-secondary-foreground" },
  suspendu: { libelle: "Suspendu", classes: "bg-destructive/10 text-destructive" },
  banni: { libelle: "Banni", classes: "bg-destructive/10 text-destructive" },
  en_transaction: {
    libelle: "En transaction",
    classes: "border-primary bg-transparent text-primary",
  },
}

/**
 * Libellé et couleur des 6 valeurs de `vehicules.status_validation` — le cycle de
 * modération, vu côté admin. `retrait` n'a encore aucun code qui l'assigne
 * (voir le commentaire sur `StatutValidation`), mais le Record doit quand même
 * le couvrir : une valeur DB sans style planterait un `STYLE_VALIDATION[x]`.
 */
export const STYLE_VALIDATION: Record<
  StatutValidation,
  { libelle: string; classes: string }
> = {
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  validee: { libelle: "Validé", classes: "bg-accent text-accent-foreground" },
  rejetee: { libelle: "Rejeté", classes: "bg-destructive/10 text-destructive" },
  suspendu: { libelle: "Suspendu", classes: "bg-destructive/10 text-destructive" },
  restauree: { libelle: "Restauré", classes: "border-primary bg-transparent text-primary" },
  retrait: { libelle: "Retiré", classes: "bg-muted text-muted-foreground" },
}

/**
 * Un acheteur peut-il encore espérer ce véhicule ?
 *
 * `a_venir` compte comme disponible : le véhicule n'est pas encore en ligne mais
 * rien n'est perdu. Les six autres statuts sont des portes fermées, au moins
 * temporairement (`en_transaction` peut se rouvrir si la vente échoue).
 */
export function estDisponible(statut: StatutVehicule): boolean {
  return statut === "disponible" || statut === "a_venir"
}

/** Photo à afficher : la principale, sinon la première, sinon rien. `is_primary` n'est pas garanti. */
export function photoPrincipale(
  photos: PhotoVehicule[]
): PhotoVehicule | undefined {
  return photos.find((photo) => photo.is_primary) ?? photos[0]
}

/**
 * "Toyota RAV4 2021", ou "Véhicule #7f1e9c3a" quand la relation `description`
 * est absente en base. Sans ce repli, un `description.marque` fait tomber la page.
 */
export function libelleVehicule(
  description: DescriptionVehicule | null,
  id: string
): string {
  if (!description) return `Véhicule #${id.slice(0, 8)}`
  return `${description.marque} ${description.modele} ${description.annee}`
}

/** Libellé et couleur des 3 valeurs de `StatutDocument` (visite technique, carte grise, assurance). */
export const STYLE_DOCUMENT: Record<
  StatutDocument,
  { libelle: string; classes: string }
> = {
  à_jour: { libelle: "À jour", classes: "bg-accent text-accent-foreground" },
  expirée: { libelle: "Expirée", classes: "bg-destructive/10 text-destructive" },
  non_concerné: {
    libelle: "Non concerné",
    classes: "bg-muted text-muted-foreground",
  },
}

/** Libellé et couleur des 3 valeurs de `HistoriqueAccidents`. */
export const STYLE_HISTORIQUE: Record<
  HistoriqueAccidents,
  { libelle: string; classes: string }
> = {
  aucun: {
    libelle: "Aucun accident déclaré",
    classes: "bg-accent text-accent-foreground",
  },
  quelques_accidents: {
    libelle: "Quelques accidents",
    classes: "bg-secondary text-secondary-foreground",
  },
  nombreux_accidents: {
    libelle: "Nombreux accidents",
    classes: "bg-destructive/10 text-destructive",
  },
}

/**
 * Écart en pourcentage entre le prix demandé et l'estimation Gemini.
 * Négatif = le vendeur demande MOINS que l'estimation, donc une bonne affaire.
 * Renvoie undefined si l'analyse n'a rien produit ou si l'estimation vaut 0.
 */
export function ecartPrixSuggere(
  prix: string,
  prixSuggere: string | null
): number | undefined {
  if (!prixSuggere) return undefined

  const estimation = Number(prixSuggere)
  if (!estimation) return undefined

  return Math.round(((Number(prix) - estimation) / estimation) * 100)
}
