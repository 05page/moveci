import { useState } from "react";
import Link from "next/link";
import { Car, Clock, Eye, Heart, EllipsisVertical, Flag, ShieldAlert, BellPlus } from "lucide-react";

import BadgeEcartPrix from "@/components/BadgeEcartPrix";
import SpecsVehicule from "@/components/SpecsVehicule";
import DialogueSignalement from "@/components/DialogueSignalement";
import DialogueAlertePrix from "@/components/DialogueAlertePrix";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formaterFcfa, initiales, urlPhoto, LIBELLES_ROLE } from "@/lib/utils";
import { libelleVehicule, photoPrincipale } from "@/lib/vehicule";
import type { VehiculeCatalogue } from "@/types";

/** Lequel des deux dialogues d'action est ouvert — `null` = aucun. */
type DialogueOuvert = "signalement-annonce" | "signalement-vendeur" | "alerte" | null;

/**
 * Fiche d'une annonce dans la grille de /vehicules.
 *
 * Volontairement distincte de `CarteFavori` malgré un corps proche : les deux
 * cartes divergent là où ça compte. Ici le cœur AJOUTE aux favoris et le pied
 * porte le vendeur ; là-bas il RETIRE et le pied porte la date d'ajout. Les
 * fondre en un composant à douze props coûterait plus cher que les tenir à
 * part — ce qui était réellement identique (specs, écart de prix) est extrait.
 */
export type CarteVehiculeCatalogueProps = {
  vehicule: VehiculeCatalogue;
  /** Omis (comme sur /partenaire/concessionnaire/parc-auto) : le cœur favoris disparaît. */
  estFavori?: boolean;
  onBasculerFavori?: (vehiculeId: string) => void;
  /** Défaut `true` — passer `false` masque "Créer une alerte sur ce prix" (parc-auto concessionnaire : pas de sens pour son propre marché). */
  avecAlertePrix?: boolean;
  /**
   * Racine du lien vers le profil du vendeur — défaut `/vendeurs` (route publique).
   * Sur /partenaire/concessionnaire/parc-auto, vaut `/partenaire/concessionnaire/vendeur`
   * pour rester dans le layout à sidebar au lieu de retomber sur le site public.
   */
  basePathVendeur?: string;
  /** Même principe que `basePathVendeur`, pour la fiche du véhicule — défaut `/vehicules` (public). */
  basePathVehicule?: string;
  /** Décalage d'apparition en ms, pour l'entrée en cascade de la grille. */
  delai?: number;
};

export default function CarteVehiculeCatalogue({
  vehicule,
  estFavori = false,
  onBasculerFavori,
  avecAlertePrix = true,
  basePathVendeur = "/vendeurs",
  basePathVehicule = "/vehicules",
  delai = 0,
}: CarteVehiculeCatalogueProps) {
  const libelle = libelleVehicule(vehicule.description, vehicule.id);
  const photo = photoPrincipale(vehicule.photos);
  const estLocation = vehicule.post_type === "location";
  const [dialogueOuvert, setDialogueOuvert] = useState<DialogueOuvert>(null);

  return (
    <article
      // fill-mode-backwards : sans lui, la carte est visible pendant tout son délai d'attente
      className="group animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex flex-col overflow-hidden rounded-2xl border border-border transition-colors duration-500 hover:border-primary"
      style={{ animationDelay: `${delai}ms` }}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        {photo ? (
          // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
          <img
            src={urlPhoto(photo.path)}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <Car className="size-10" />
          </span>
        )}

        <Badge
          className={cn(
            "absolute bottom-3 left-3",
            estLocation
              ? "bg-background text-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {estLocation ? "Location" : "Vente"}
        </Badge>

        {vehicule.type === "neuf" && (
          <Badge className="absolute bottom-3 left-24 bg-accent text-accent-foreground">
            Neuf
          </Badge>
        )}

        {/* le catalogue laisse passer `a_venir` : l'annonce est visible mais pas encore ouverte */}
        {vehicule.statut === "a_venir" && (
          <Badge className="absolute left-3 top-3 gap-1 bg-foreground text-background">
            <Clock className="size-3" />
            Bientôt
          </Badge>
        )}

        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          {onBasculerFavori && (
            <button
              type="button"
              onClick={() => onBasculerFavori(vehicule.id)}
              aria-pressed={estFavori}
              aria-label={
                estFavori
                  ? `Retirer ${libelle} de mes favoris`
                  : `Ajouter ${libelle} à mes favoris`
              }
              className={cn(
                "flex size-9 items-center justify-center rounded-full bg-background/90 backdrop-blur transition-colors",
                estFavori
                  ? "text-primary hover:bg-destructive/15 hover:text-destructive"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Heart className={cn("size-4", estFavori && "fill-current")} />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Options pour ${libelle}`}
              className="flex size-9 items-center justify-center rounded-full bg-background/90 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            >
              <EllipsisVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDialogueOuvert("signalement-annonce")}>
                <Flag className="size-4" />
                Signaler l&apos;annonce
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialogueOuvert("signalement-vendeur")}>
                <ShieldAlert className="size-4" />
                Signaler le vendeur
              </DropdownMenuItem>
              {avecAlertePrix && (
                <DropdownMenuItem onClick={() => setDialogueOuvert("alerte")}>
                  <BellPlus className="size-4" />
                  Créer une alerte sur ce prix
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* flex-1 : les pieds de carte s'alignent même quand les titres tiennent sur 1 ou 2 lignes */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="truncate font-heading text-lg font-bold">
          <Link
            href={`${basePathVehicule}/${vehicule.id}`}
            className="transition-colors hover:text-primary"
          >
            {libelle}
          </Link>
        </h3>

        <SpecsVehicule description={vehicule.description} className="mt-1" />

        <p className="mt-4 font-heading text-xl font-bold tabular-nums">
          {/* Number() obligatoire : `prix` est une string ("6250000.00"), un + concatènerait */}
          {formaterFcfa(Number(vehicule.prix))}
          {estLocation && (
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / jour
            </span>
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {vehicule.negociable && (
            <Badge variant="outline" className="shrink-0">
              Négociable
            </Badge>
          )}
          <BadgeEcartPrix
            prix={vehicule.prix}
            prixSuggere={vehicule.prix_suggere}
          />
        </div>

        {/* mt-auto colle le pied en bas quel que soit le contenu au-dessus */}
        <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initiales(vehicule.creator.fullname)}
          </span>

          <span className="min-w-0 flex-1">
            <Link
              href={`${basePathVendeur}/${vehicule.creator.id}`}
              className="lien-anime block truncate text-sm font-semibold hover:text-primary"
            >
              {vehicule.creator.fullname}
            </Link>
            <span className="block truncate text-xs text-muted-foreground">
              {LIBELLES_ROLE[vehicule.creator.role]}
            </span>
          </span>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <Eye className="size-3.5" />
            {vehicule.views_count.toLocaleString("fr-FR")}
          </span>
        </div>
      </div>

      <DialogueSignalement
        open={dialogueOuvert === "signalement-annonce"}
        onOpenChange={(ouvert) => setDialogueOuvert(ouvert ? "signalement-annonce" : null)}
        cible={{ type: "vehicule", id: vehicule.id, label: `« ${libelle} »` }}
      />
      <DialogueSignalement
        open={dialogueOuvert === "signalement-vendeur"}
        onOpenChange={(ouvert) => setDialogueOuvert(ouvert ? "signalement-vendeur" : null)}
        cible={{ type: "vendeur", id: vehicule.creator.id, label: vehicule.creator.fullname }}
      />
      <DialogueAlertePrix
        open={dialogueOuvert === "alerte"}
        onOpenChange={(ouvert) => setDialogueOuvert(ouvert ? "alerte" : null)}
        marqueDefaut={vehicule.description?.marque ?? ""}
        modeleDefaut={vehicule.description?.modele ?? ""}
        prixDefaut={Number(vehicule.prix)}
      />
    </article>
  );
}
