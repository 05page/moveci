"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Sélecteur de note de 1 à 5.
 *
 * Construit sur de vrais `<input type="radio">` visuellement masqués plutôt que
 * sur des `<button>` : le groupe devient navigable aux flèches et annoncé comme
 * « 3 sur 5 » par un lecteur d'écran, sans une ligne de code clavier à écrire.
 * Les étoiles ne sont que la peau posée dessus.
 */
export type NoteEtoilesProps = {
  note: number;
  onChange: (note: number) => void;
  /** Doit être unique par formulaire monté : c'est le `name` qui regroupe les radios. */
  nom: string;
  disabled?: boolean;
};

const VALEURS = [1, 2, 3, 4, 5];

export default function NoteEtoiles({
  note,
  onChange,
  nom,
  disabled = false,
}: NoteEtoilesProps) {
  const [survol, setSurvol] = useState(0);

  // le survol prend le pas sur la sélection : l'utilisateur voit ce qu'il obtiendrait
  const affichee = survol || note;

  return (
    <fieldset
      disabled={disabled}
      onMouseLeave={() => setSurvol(0)}
      className="flex items-center gap-1"
    >
      <legend className="sr-only">Votre note sur 5</legend>

      {VALEURS.map((valeur) => (
        <label
          key={valeur}
          onMouseEnter={() => setSurvol(valeur)}
          className={cn("p-0.5", disabled ? "cursor-not-allowed" : "cursor-pointer")}
        >
          <input
            type="radio"
            name={nom}
            value={valeur}
            checked={note === valeur}
            onChange={() => onChange(valeur)}
            className="peer sr-only"
          />
          <Star
            className={cn(
              "size-7 transition-all peer-focus-visible:scale-110 peer-focus-visible:stroke-3",
              valeur <= affichee
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            )}
          />
          <span className="sr-only">
            {valeur} étoile{valeur > 1 ? "s" : ""}
          </span>
        </label>
      ))}

      {note > 0 && (
        <span className="ml-2 text-sm font-semibold tabular-nums">
          {note} / 5
        </span>
      )}
    </fieldset>
  );
}
