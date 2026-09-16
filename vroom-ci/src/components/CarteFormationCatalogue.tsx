import Link from "next/link";
import { Clock, MapPin, Star, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formaterFcfa, initiales } from "@/lib/utils";
import { ICONE_PERMIS, LIBELLE_PERMIS } from "@/lib/formation";
import type { FormationCatalogue } from "@/types";

/**
 * Fiche d'une formation dans la grille de /client/auto-ecole.
 *
 * Miroir de CarteVehiculeCatalogue, avec une différence structurelle : une
 * formation n'a pas de photo (aucune colonne dans le modèle). La vignette
 * du haut porte donc une icône incrustée sur un fond à motif diagonal, au
 * lieu d'un <img> — c'est elle qui distingue une formation d'une autre au
 * premier coup d'œil, à la place d'une image.
 */
export type CarteFormationCatalogueProps = {
  formation: FormationCatalogue;
  /** Décalage d'apparition en ms, pour l'entrée en cascade de la grille. */
  delai?: number;
};

export default function CarteFormationCatalogue({
  formation,
  delai = 0,
}: CarteFormationCatalogueProps) {
  const Icone = ICONE_PERMIS[formation.type_permis];
  const note = formation.auto_ecole.note_moyenne
    ? Number(formation.auto_ecole.note_moyenne)
    : null;

  return (
    <article
      // fill-mode-backwards : sans lui, la carte est visible pendant tout son délai d'attente
      className="group animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards flex flex-col overflow-hidden rounded-2xl border border-border transition-colors duration-500 hover:border-primary"
      style={{ animationDelay: `${delai}ms` }}
    >
      <div
        className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-muted"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, color-mix(in oklch, var(--primary) 8%, transparent) 0px, color-mix(in oklch, var(--primary) 8%, transparent) 2px, transparent 2px, transparent 14px)",
        }}
      >
        <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-500 group-hover:scale-110">
          <Icone className="size-10" />
        </span>

        <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground">
          Permis {formation.type_permis}
        </Badge>
      </div>

      {/* flex-1 : les pieds de carte s'alignent même quand les titres tiennent sur 1 ou 2 lignes */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {LIBELLE_PERMIS[formation.type_permis]}
        </p>
        <h3 className="mt-1 truncate font-heading text-lg font-bold">
          <Link
            href={`/client/auto-ecole/${formation.id}`}
            className="transition-colors hover:text-primary"
          >
            {formation.titre}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {formation.duree_heures}h
          </span>
          {formation.lieu && (
            <span className="inline-flex items-center gap-1.5 truncate">
              <MapPin className="size-3.5 shrink-0" />
              {formation.lieu}
            </span>
          )}
        </div>

        <p className="mt-4 font-heading text-xl font-bold tabular-nums">
          {formaterFcfa(Number(formation.prix))}
        </p>

        {/* mt-auto colle le pied en bas quel que soit le contenu au-dessus */}
        <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initiales(formation.auto_ecole.fullname)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {formation.auto_ecole.fullname}
            </span>
            {note !== null && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3 fill-primary text-primary" />
                {note.toFixed(1)}
              </span>
            )}
          </span>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <Users className="size-3.5" />
            {formation.inscriptions_count.toLocaleString("fr-FR")}
          </span>
        </div>
      </div>
    </article>
  );
}
