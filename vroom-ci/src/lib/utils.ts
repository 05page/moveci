import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type { RoleUser } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Initiales pour l'avatar de repli : "Koffi Aristide" -> "KA". */
export function initiales(nom: string): string {
  return nom
    .split(" ")
    .slice(0, 2)
    .map((mot) => mot[0])
    .join("")
    .toUpperCase()
}

/** Libellé affiché du rôle. Les clés couvrent les 5 valeurs de RoleUser : en oublier une ne compile pas. */
export const LIBELLES_ROLE: Record<RoleUser, string> = {
  client: "Acheteur",
  vendeur: "Vendeur particulier",
  concessionnaire: "Concessionnaire",
  auto_ecole: "Auto-école",
  admin: "Administrateur",
}

/** Date d'inscription abrégée : "2026-03-02T09:14:00Z" -> "mars 2026". */
export function formaterMoisAnnee(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

/** Date + heure d'un rendez-vous : "jeudi 20 août, 14:30". */
export function formaterDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

/** Date sans heure : "2026-08-12T..." -> "12 août 2026". */
export function formaterDateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

/**
 * URL publique d'une photo. `vehicules_photos.path` est relatif au disque de
 * stockage Laravel ; un chemin déjà absolu (mock local "/toyota.jpeg" ou URL
 * complète) est renvoyé tel quel.
 */
export function urlPhoto(path: string): string {
  if (path.startsWith("http") || path.startsWith("/")) return path
  return `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/storage/${path}`
}

/** Montant en francs CFA sans décimales : 18750000 -> "18 750 000 F CFA". */
export function formaterFcfa(montant: number): string {
  return new Intl.NumberFormat("fr-CI", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(montant)
}

/** Grands nombres abrégés pour les cartes stat : 8420 -> "8,4 k", 18750000 -> "18,8 M". */
export function formaterCompact(valeur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valeur)
}

/** Heure seule : "2026-08-16T14:30:00Z" -> "14:30". */
export function formaterHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

/**
 * Journée civile d'un horodatage ISO : "2026-08-14T09:12:00Z" -> "2026-08-14".
 *
 * Découpe la chaîne au lieu de passer par Date : la Côte d'Ivoire est à UTC+0,
 * le jour UTC et le jour local coïncident. Un `toLocaleDateString` ici coûterait
 * un formatage complet par message affiché.
 */
function jourIso(iso: string): string {
  return iso.slice(0, 10)
}

/** Séparateur de jour dans un fil de messages : "Aujourd'hui", "Hier", sinon "12 août 2026". */
export function etiquetteJour(jour: string): string {
  if (jour === jourIso(new Date().toISOString())) return "Aujourd'hui"
  if (jour === jourIso(new Date(Date.now() - 86_400_000).toISOString())) {
    return "Hier"
  }
  return formaterDateCourte(jour)
}

/**
 * Horodatage compact d'une liste de conversations : "09:12" pour aujourd'hui,
 * "Hier", sinon "12/08". Afficher l'heure seule sur un message vieux de trois
 * jours laisserait croire qu'il vient d'arriver.
 */
export function horodatageCourt(iso: string): string {
  const jour = jourIso(iso)

  if (jour === jourIso(new Date().toISOString())) return formaterHeure(iso)
  if (jour === jourIso(new Date(Date.now() - 86_400_000).toISOString())) {
    return "Hier"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso))
}

/**
 * Regroupe une liste DÉJÀ triée chronologiquement par journée civile.
 *
 * Générique et ignorante du métier — `dateDe` dit où lire l'ISO dans chaque
 * élément — pour rester dans le contrat de ce fichier : aucune connaissance de
 * la forme des données Laravel. Renvoie [{ jour: "2026-08-14", elements: [...] }].
 *
 * Un seul passage : on compare au dernier groupe créé plutôt que d'indexer par
 * date, ce qui préserve l'ordre d'arrivée sans étape de tri supplémentaire.
 */
export function grouperParJour<T>(
  elements: T[],
  dateDe: (element: T) => string
): { jour: string; elements: T[] }[] {
  const groupes: { jour: string; elements: T[] }[] = []

  for (const element of elements) {
    const jour = jourIso(dateDe(element))
    const dernier = groupes.at(-1)

    if (dernier?.jour === jour) dernier.elements.push(element)
    else groupes.push({ jour, elements: [element] })
  }

  return groupes
}

/** Ancienneté en français : "il y a 3 jours", "il y a 2 mois". Gère aussi le futur. */
export function tempsRelatif(iso: string): string {
  const secondes = (new Date(iso).getTime() - Date.now()) / 1000
  const format = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })

  // du plus grand au plus petit : on s'arrête à la première unité qui « tient »
  const seuils: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ]

  for (const [unite, taille] of seuils) {
    if (Math.abs(secondes) >= taille) {
      return format.format(Math.round(secondes / taille), unite)
    }
  }

  return format.format(Math.round(secondes), "second")
}

/** Jours entiers restants avant une échéance. Négatif si la date est passée. */
export function joursRestants(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

/**
 * Variation en pourcentage entre deux périodes, arrondie à l'entier.
 * Renvoie undefined quand la comparaison n'a pas de sens : période précédente
 * absente (janvier n'a pas de mois -1) ou nulle, qui donnerait un Infinity.
 */
export function variationPourcent(
  actuel: number | undefined,
  precedent: number | undefined
): number | undefined {
  if (actuel === undefined || precedent === undefined || precedent === 0) {
    return undefined
  }
  return Math.round(((actuel - precedent) / precedent) * 100)
}
