"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FormationAutoEcole, TypePermis } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   MODIFIER UNE FORMATION — /partenaire/auto_ecole/formations/[id]/modifier
   Même formulaire que /partenaire/auto_ecole/post-formation, pré-rempli.
   Pas de route GET dédiée pour une formation de l'auto-école connectée : on
   réutilise formations/mes-formations (déjà appelée par la page Formation) et
   on isole la ligne voulue — c'est la même liste, pas un aller-retour de plus.
   `langue` disparaît du formulaire : ni FormationAutoEcole (le contrat GET),
   ni UpdateFormationRequest (le contrat PUT) ne la connaissent côté back.
   ──────────────────────────────────────────────────────────────────────────── */

const OPTIONS_PERMIS: { valeur: TypePermis; libelle: string }[] = [
  { valeur: "A", libelle: "Permis A — moto" },
  { valeur: "A2", libelle: "Permis A2 — moto (bridée)" },
  { valeur: "B", libelle: "Permis B — voiture" },
  { valeur: "B1", libelle: "Permis B1 — quadricycle" },
  { valeur: "C", libelle: "Permis C — poids lourd" },
  { valeur: "D", libelle: "Permis D — transport en commun" },
];

type FormulaireFormation = {
  type_permis: TypePermis;
  titre: string;
  texte: string;
  prix: string;
  duree_heures: string;
};

const formulaireDepuis = (formation: FormationAutoEcole): FormulaireFormation => ({
  type_permis: formation.type_permis,
  titre: formation.titre,
  texte: formation.description,
  prix: formation.prix,
  duree_heures: String(formation.duree_heures),
});

/** Pas de GET /formations/{id} pour l'auto-école : on filtre la liste complète côté client. */
const recupererFormation = async (id: string): Promise<FormationAutoEcole | null> => {
  const reponse = await api.get<{ data: FormationAutoEcole[] }>("formations/mes-formations");
  return reponse.data.find((formation) => formation.id === id) ?? null;
};

/** Même contrat que PUT /formations/{id} (FormationController::update) — voir UpdateFormationRequest. */
const modifierFormation = (
  id: string,
  donnees: FormulaireFormation
): Promise<{ data: FormationAutoEcole }> =>
  api.put<{ data: FormationAutoEcole }>(`formations/${id}`, donnees);

type ParametresPage = { params: Promise<{ id: string }> };

const PageModifierFormation = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <FormulaireModifierFormation key={id} id={id} />;
};

export default PageModifierFormation;

const FormulaireModifierFormation = ({ id }: { id: string }) => {
  const navigate = useRouter();
  const [formation, setFormation] = useState<FormationAutoEcole | null | undefined>(undefined);
  const [formulaire, setFormulaire] = useState<FormulaireFormation | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    recupererFormation(id).then((resultat) => {
      if (annule) return;
      setFormation(resultat);
      setFormulaire(resultat && formulaireDepuis(resultat));
    });

    return () => {
      annule = true;
    };
  }, [id]);

  const definirChamp = <C extends keyof FormulaireFormation>(
    champ: C,
    valeur: FormulaireFormation[C]
  ) => {
    setFormulaire((actuel) => actuel && { ...actuel, [champ]: valeur });
  };

  if (formation === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-8 lg:py-10">
        <Skeleton className="h-9 w-64" />
        <div className="mt-8 space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      </main>
    );
  }

  if (formation === null || !formulaire) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-16 text-center">
        <h1 className="font-heading text-xl font-bold">Formation introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Elle a peut-être déjà été supprimée.
        </p>
        <Link
          href="/partenaire/auto_ecole/formations"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
        >
          <ArrowLeft className="size-4" />
          Retour aux formations
        </Link>
      </main>
    );
  }

  // les 4 champs `sometimes` d'UpdateFormationRequest — type_permis est déjà borné par le Select
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
      await modifierFormation(id, formulaire);
      toast.success("Formation modifiée.");
      navigate.push("/partenaire/auto_ecole/formations");
    } catch {
      const message = "La modification a échoué. Réessayez dans quelques instants.";
      setErreur(message);
      toast.error(message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 lg:py-10">
      <Link
        href="/partenaire/auto_ecole/formations"
        className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour aux formations
      </Link>

      <header className="mt-4">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Modifier la formation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Les modifications s&apos;appliquent immédiatement, sans repasser par une validation admin.
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
          {envoi ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {envoi ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </form>
    </main>
  );
};
