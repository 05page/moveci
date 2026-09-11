import { cn } from "@/lib/utils";
import type { DescriptionVehiculeDetaillee } from "@/types";

/**
 * La ligne « 2021 · 48 500 km · Essence · Automatique ».
 *
 * Toutes les colonnes de `vehicules_descriptions` sont `->nullable()` en base :
 * le `filter(Boolean)` retire celles qui manquent au lieu d'afficher des
 * séparateurs vides. Si la relation entière est null, le composant ne rend rien.
 */
export type SpecsVehiculeProps = {
  description: DescriptionVehiculeDetaillee | null;
  className?: string;
};

export default function SpecsVehicule({
  description,
  className,
}: SpecsVehiculeProps) {
  if (!description) return null;

  const specs = [
    description.annee,
    description.kilometrage != null
      ? `${description.kilometrage.toLocaleString("fr-FR")} km`
      : null,
    description.carburant,
    description.transmission,
  ].filter(Boolean);

  if (specs.length === 0) return null;

  return (
    <p className={cn("truncate text-sm text-muted-foreground", className)}>
      {specs.join(" · ")}
    </p>
  );
}
