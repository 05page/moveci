import Link from "next/link";
import { Car, Heart } from "lucide-react";

import BadgeEcartPrix from "@/components/BadgeEcartPrix";
import SpecsVehicule from "@/components/SpecsVehicule";
import { Badge } from "@/components/ui/badge";
import { cn, formaterFcfa, tempsRelatif, urlPhoto } from "@/lib/utils";
import {
  estDisponible,
  libelleVehicule,
  photoPrincipale,
  STYLE_STATUT,
} from "@/lib/vehicule";
import type { Favori } from "@/types";

/**
 * Une fiche de la page /client/favoris.
 *
 * Le parti pris tient en une règle : un favori devenu indisponible reste
 * AFFICHÉ, mais dégradé — photo désaturée, statut posé par-dessus. Le masquer
 * priverait l'acheteur de la seule information qu'il vient chercher, à savoir
 * que le marché a bougé pendant son absence.
 */
export type CarteFavoriProps = {
  favori: Favori;
  /** Remonte au parent, qui gère le retrait optimiste et son éventuel retour en arrière. */
  onRetirer: (vehiculeId: string) => void;
  /** Décalage d'apparition en ms, pour l'entrée en cascade de la grille. */
  delai?: number;
};

export default function CarteFavori({
  favori,
  onRetirer,
  delai = 0,
}: CarteFavoriProps) {
  const { vehicule } = favori;

  const libelle = libelleVehicule(vehicule.description, vehicule.id);
  const photo = photoPrincipale(vehicule.photos);
  const disponible = estDisponible(vehicule.statut);
  const estLocation = vehicule.post_type === "location";

  return (
    <article
      // fill-mode-backwards : sans lui, la carte est visible pendant tout son délai d'attente
      className="group animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards overflow-hidden rounded-2xl border border-border transition-colors duration-500 hover:border-primary"
      style={{ animationDelay: `${delai}ms` }}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        {photo ? (
          // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
          <img
            src={urlPhoto(photo.path)}
            alt=""
            className={cn(
              "size-full object-cover transition-transform duration-500 group-hover:scale-105",
              !disponible && "grayscale"
            )}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <Car className="size-10" />
          </span>
        )}

        {/* voile + statut : déclaré AVANT les badges pour que ceux-ci restent au-dessus */}
        {!disponible && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="rounded-4xl bg-foreground px-4 py-2 font-heading text-sm font-bold uppercase tracking-wider text-background">
              {STYLE_STATUT[vehicule.statut].libelle}
            </span>
          </div>
        )}

        <Badge
          className={cn(
            "absolute bottom-3 left-3 z-10",
            estLocation
              ? "bg-background text-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {estLocation ? "Location" : "Vente"}
        </Badge>

        <button
          type="button"
          onClick={() => onRetirer(vehicule.id)}
          aria-label={`Retirer ${libelle} de mes favoris`}
          title="Retirer de mes favoris"
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-background/90 text-primary backdrop-blur transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <Heart className="size-4 fill-current" />
        </button>
      </div>

      <div className="p-5">
        <h3 className="truncate font-heading text-lg font-bold">
          <Link
            href={`/vehicules/${vehicule.id}`}
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

        <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          Ajouté {tempsRelatif(favori.date_ajout)}
        </p>
      </div>
    </article>
  );
}
