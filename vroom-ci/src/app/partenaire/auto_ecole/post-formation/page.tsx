"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FormationAutoEcole } from "@/types";

type TypePermis = "A" | "A2" | "B" | "B1" | "C" | "D";

const OPTIONS_PERMIS: { valeur: TypePermis; libelle: string }[] = [
  { valeur: "A", libelle: "Permis A — moto" },
  { valeur: "A2", libelle: "Permis A2 — moto (bridée)" },
  { valeur: "B", libelle: "Permis B — voiture" },
  { valeur: "B1", libelle: "Permis B1 — quadricycle" },
  { valeur: "C", libelle: "Permis C — poids lourd" },
  { valeur: "D", libelle: "Permis D — transport en commun" },
];

// ÉTAPE 1 — ajoute `lieu: string;` ici, juste après `langue: string;` (même forme, optionnel côté back : StoreFormationRequest a `'lieu' => 'nullable|string|max:255'`).
type FormulaireFormation = {
  type_permis: TypePermis;
  titre: string;
  texte: string;
  prix: string;
  duree_heures: string;
  lieu: string;
  langue: string;
};

// ÉTAPE 2 — ajoute `lieu: ""` ici, même endroit que `langue: ""`.
const FORMULAIRE_VIDE: FormulaireFormation = {
  type_permis: "B",
  titre: "",
  texte: "",
  prix: "",
  duree_heures: "",
  lieu: "",
  langue: "",
};

/** Même contrat que POST /formations (FormationController::store, StoreFormationRequest). */
const posterFormation = (donnees: FormulaireFormation): Promise<{ data: FormationAutoEcole }> =>
  api.post<{ data: FormationAutoEcole }>("formations", donnees);

export default function PagePostFormation() {
  const navigate = useRouter();
  const [formulaire, setFormulaire] = useState<FormulaireFormation>(FORMULAIRE_VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const definirChamp = <C extends keyof FormulaireFormation>(
    champ: C,
    valeur: FormulaireFormation[C]
  ) => {
    setFormulaire((actuel) => ({ ...actuel, [champ]: valeur }));
  };

  // les 4 champs `required` de StoreFormationRequest — type_permis est déjà borné par le Select
  const pretAEnvoyer =
    formulaire.titre.trim().length > 0 &&
    formulaire.texte.trim().length > 0 &&
    formulaire.prix.trim().length > 0 &&
    formulaire.duree_heures.trim().length > 0;

  const envoyer = async () => {
    if (!pretAEnvoyer || envoi) return;

    setEnvoi(true);
    setErreur(null);

    try {
      await posterFormation(formulaire);
      setFormulaire(FORMULAIRE_VIDE);
      toast.success("Formation soumise — en attente de validation admin.");
      navigate.push("/partenaire/auto_ecole/dashboard");
    } catch (erreurCatch) {
      const message = messageErreur(erreurCatch, "La publication a échoué. Réessayez dans quelques instants.");
      setErreur(message);
      toast.error(message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 lg:py-10">
      <header>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Publier une formation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La formation reste en attente de validation admin avant d&apos;apparaître au catalogue.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
        className="mt-8 space-y-5"
      >
        <div>
          <Label htmlFor="titre">Titre *</Label>
          <Input
            id="titre"
            value={formulaire.titre}
            onChange={(e) => definirChamp("titre", e.target.value)}
            placeholder="Permis B — formule accélérée"
            className="mt-2"
            required
          />
        </div>

        <div>
          <Label htmlFor="texte">Description *</Label>
          <Textarea
            id="texte"
            value={formulaire.texte}
            onChange={(e) => definirChamp("texte", e.target.value)}
            placeholder="Contenu du programme, nombre de séances, code de la route inclus…"
            className="mt-2"
            rows={5}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="type_permis">Type de permis *</Label>
            <Select
              value={formulaire.type_permis}
              onValueChange={(v) => v && definirChamp("type_permis", v as TypePermis)}
            >
              <SelectTrigger id="type_permis" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS_PERMIS.map((o) => (
                  <SelectItem key={o.valeur} value={o.valeur}>
                    {o.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="langue">Langue</Label>
            <Input
              id="langue"
              value={formulaire.langue}
              onChange={(e) => definirChamp("langue", e.target.value)}
              placeholder="Français"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="lieu">Lieu</Label>
            <Input
              id="lieu"
              value={formulaire.lieu}
              onChange={(e) => definirChamp("lieu", e.target.value)}
              placeholder="Cocody, 2plateaux"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="prix">Prix (FCFA) *</Label>
            <Input
              id="prix"
              type="number"
              inputMode="numeric"
              min={0}
              value={formulaire.prix}
              onChange={(e) => definirChamp("prix", e.target.value)}
              placeholder="150000"
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="duree_heures">Durée (heures) *</Label>
            <Input
              id="duree_heures"
              type="number"
              inputMode="numeric"
              min={1}
              value={formulaire.duree_heures}
              onChange={(e) => definirChamp("duree_heures", e.target.value)}
              placeholder="20"
              className="mt-2"
              required
            />
          </div>
        </div>

        {erreur && (
          <p role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={!pretAEnvoyer || envoi}
          className={cn(buttonVariants({ size: "lg" }), "effet-action w-full")}
        >
          {envoi ? <Loader2 className="size-4 animate-spin" /> : <GraduationCap className="size-4" />}
          {envoi ? "Publication…" : "Publier la formation"}
        </button>
      </form>
    </main>
  );
}
