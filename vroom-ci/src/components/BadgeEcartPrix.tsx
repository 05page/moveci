import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ecartPrixSuggere } from "@/lib/vehicule";

/**
 * Signal d'achat dérivé de `vehicules.prix_suggere`, l'estimation produite par
 * Gemini pendant la modération de l'annonce. Ce n'est donc pas un calcul maison :
 * la donnée existe déjà en base, personne ne l'affichait.
 *
 * Négatif = le vendeur demande MOINS que l'estimation, donc une bonne affaire.
 * Ne rend rien quand l'analyse n'a rien produit ou quand l'écart est du bruit.
 */
export type BadgeEcartPrixProps = {
  prix: string;
  prixSuggere: string | null;
  className?: string;
};

/** En deçà de ce seuil, l'écart n'est pas significatif et n'est pas affiché. */
const SEUIL_ECART_AFFICHE = 3;

export default function BadgeEcartPrix({
  prix,
  prixSuggere,
  className,
}: BadgeEcartPrixProps) {
  const ecart = ecartPrixSuggere(prix, prixSuggere);

  if (ecart === undefined || Math.abs(ecart) < SEUIL_ECART_AFFICHE) return null;

  const bonneAffaire = ecart < 0;

  return (
    <Badge
      className={cn(
        "shrink-0 gap-1",
        bonneAffaire
          ? "bg-accent text-accent-foreground"
          : "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {bonneAffaire ? (
        <TrendingDown className="size-3" />
      ) : (
        <TrendingUp className="size-3" />
      )}
      {Math.abs(ecart)} % {bonneAffaire ? "sous" : "au-dessus de"}{" "}
      l&apos;estimation
    </Badge>
  );
}
