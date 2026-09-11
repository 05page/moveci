"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteFormationCatalogue from "@/components/CarteFormationCatalogue";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { api } from "@/lib/api";
import { cn, formaterFcfa } from "@/lib/utils";
import type { FormationCatalogue, TypePermis } from "@/types";

/** Même contrat que GET /formations : déjà filtré côté back sur validé + disponible. */
const recupererCatalogue = async (): Promise<FormationCatalogue[]> => {
  const reponse = await api.get<{ data: FormationCatalogue[] }>("formations");
  return reponse.data;
};

/* ─── Filtres ──────────────────────────────────────────────────────────────── */

type Tri = "recent" | "prix_asc" | "prix_desc" | "populaire";

const LIBELLES_TRI: Record<Tri, string> = {
  recent: "Plus récentes",
  prix_asc: "Prix croissant",
  prix_desc: "Prix décroissant",
  populaire: "Plus populaires",
};

const OPTIONS_PERMIS: { valeur: TypePermis | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Tout" },
  { valeur: "A", libelle: "A" },
  { valeur: "A2", libelle: "A2" },
  { valeur: "B", libelle: "B" },
  { valeur: "B1", libelle: "B1" },
  { valeur: "C", libelle: "C" },
  { valeur: "D", libelle: "D" },
];

type Filtres = {
  recherche: string;
  typePermis: TypePermis | "tout";
  /** Gardés en string : un `<input type="number">` vidé rend "", pas 0. */
  prixMin: string;
  prixMax: string;
};

const FILTRES_VIDES: Filtres = {
  recherche: "",
  typePermis: "tout",
  prixMin: "",
  prixMax: "",
};

export default function PageAutoEcole() {
  const [formations, setFormations] = useState<FormationCatalogue[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [tri, setTri] = useState<Tri>("recent");
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererCatalogue().then((liste) => {
      if (annule) return;
      setFormations(liste);
      setChargement(false);
    });

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  const modifier = (partiel: Partial<Filtres>) =>
    setFiltres((actuels) => ({ ...actuels, ...partiel }));

  const resultats = useMemo(() => {
    const recherche = filtres.recherche.trim().toLowerCase();
    // "" et non 0 : un champ vidé ne doit pas devenir une borne à zéro
    const prixMin = filtres.prixMin === "" ? 0 : Number(filtres.prixMin);
    const prixMax = filtres.prixMax === "" ? Infinity : Number(filtres.prixMax);

    const liste = formations.filter((formation) => {
      const prix = Number(formation.prix);

      if (recherche) {
        const cible =
          `${formation.titre} ${formation.auto_ecole.fullname}`.toLowerCase();
        if (!cible.includes(recherche)) return false;
      }
      if (filtres.typePermis !== "tout" && formation.type_permis !== filtres.typePermis)
        return false;
      if (prix < prixMin || prix > prixMax) return false;

      return true;
    });

    // `filter` a déjà produit un nouveau tableau : ce `sort` ne mute pas `formations`
    return liste.sort((a, b) => {
      switch (tri) {
        case "prix_asc":
          return Number(a.prix) - Number(b.prix);
        case "prix_desc":
          return Number(b.prix) - Number(a.prix);
        case "populaire":
          return b.inscriptions_count - a.inscriptions_count;
        case "recent":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [formations, filtres, tri]);

  /** Une pastille par filtre actif, chacune sachant s'effacer elle-même. */
  const pastilles: { cle: string; libelle: string; effacer: () => void }[] = [];

  if (filtres.recherche.trim())
    pastilles.push({
      cle: "recherche",
      libelle: `« ${filtres.recherche.trim()} »`,
      effacer: () => modifier({ recherche: "" }),
    });
  if (filtres.typePermis !== "tout")
    pastilles.push({
      cle: "typePermis",
      libelle: `Permis ${filtres.typePermis}`,
      effacer: () => modifier({ typePermis: "tout" }),
    });
  if (filtres.prixMin)
    pastilles.push({
      cle: "prixMin",
      libelle: `À partir de ${formaterFcfa(Number(filtres.prixMin))}`,
      effacer: () => modifier({ prixMin: "" }),
    });
  if (filtres.prixMax)
    pastilles.push({
      cle: "prixMax",
      libelle: `Jusqu'à ${formaterFcfa(Number(filtres.prixMax))}`,
      effacer: () => modifier({ prixMax: "" }),
    });

  if (chargement) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-10 w-72" />
        <div className="mt-8 lg:grid lg:grid-cols-[272px_1fr] lg:items-start lg:gap-8">
          <Skeleton className="hidden h-104 w-full lg:block" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-88 w-full" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (formations.length === 0) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <section className="rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="size-7" />
          </span>
          <h1 className="mt-6 font-heading text-2xl font-bold">
            Aucune formation en ligne
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Aucune auto-école n&apos;a encore publié de formation. Revenez
            bientôt.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Auto-écoles &amp; formations
          </h1>
          {/* le compteur suit les filtres en direct : aucun appel réseau ne le retarde */}
          <p
            role="status"
            className="mt-2 flex flex-wrap items-baseline gap-2 text-sm text-muted-foreground"
          >
            <span className="font-heading text-2xl font-bold tabular-nums text-primary">
              {resultats.length}
            </span>
            <span>
              formation{resultats.length > 1 ? "s" : ""}
              {pastilles.length > 0
                ? " correspondent à vos critères"
                : " disponibles pour passer votre permis"}
            </span>
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      <button
        type="button"
        onClick={() => setPanneauOuvert((ouvert) => !ouvert)}
        aria-expanded={panneauOuvert}
        aria-controls="panneau-filtres"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "effet-action mt-6 w-full lg:hidden"
        )}
      >
        <SlidersHorizontal className="size-4" />
        Filtres
        {pastilles.length > 0 && (
          <Badge className="ml-1">{pastilles.length}</Badge>
        )}
      </button>

      <div className="mt-6 lg:grid lg:grid-cols-[272px_1fr] lg:items-start lg:gap-8">
        {/* une seule instance : masquée sous 1024px tant que le bouton ne l'ouvre pas */}
        <aside
          id="panneau-filtres"
          className={cn(
            "space-y-6 rounded-2xl border border-border p-5 lg:sticky lg:top-20 lg:block",
            panneauOuvert ? "block" : "hidden"
          )}
        >
          <div>
            <Label
              htmlFor="recherche"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Titre ou auto-école
            </Label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="recherche"
                type="search"
                value={filtres.recherche}
                onChange={(evenement) =>
                  modifier({ recherche: evenement.target.value })
                }
                placeholder="Permis B accéléré…"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Type de permis
            </p>
            <div role="group" className="mt-2 flex flex-wrap gap-2">
              {OPTIONS_PERMIS.map((option) => (
                <button
                  key={option.valeur}
                  type="button"
                  aria-pressed={option.valeur === filtres.typePermis}
                  onClick={() => modifier({ typePermis: option.valeur })}
                  className={cn(
                    "rounded-4xl px-3 py-1.5 text-sm font-medium transition-colors",
                    option.valeur === filtres.typePermis
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
                  )}
                >
                  {option.libelle}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prix en FCFA
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Prix minimum"
                value={filtres.prixMin}
                onChange={(evenement) =>
                  modifier({ prixMin: evenement.target.value })
                }
                placeholder="Min"
              />
              <span aria-hidden className="text-muted-foreground">
                —
              </span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Prix maximum"
                value={filtres.prixMax}
                onChange={(evenement) =>
                  modifier({ prixMax: evenement.target.value })
                }
                placeholder="Max"
              />
            </div>
          </div>

          {pastilles.length > 0 && (
            <button
              type="button"
              onClick={() => setFiltres(FILTRES_VIDES)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-full"
              )}
            >
              <RotateCcw className="size-4" />
              Tout effacer
            </button>
          )}
        </aside>

        <div className="mt-6 lg:mt-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* les pastilles disent quels filtres sont posés, et chacune s'enlève seule */}
            <div className="flex min-w-0 flex-wrap gap-2">
              {pastilles.map((pastille) => (
                <button
                  key={pastille.cle}
                  type="button"
                  onClick={pastille.effacer}
                  className="inline-flex items-center gap-1.5 rounded-4xl border border-border py-1 pl-3 pr-2 text-xs font-medium transition-colors hover:border-destructive hover:text-destructive"
                >
                  {pastille.libelle}
                  <X className="size-3" />
                </button>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Label htmlFor="tri" className="text-sm text-muted-foreground">
                Trier par
              </Label>
              <Select
                value={tri}
                onValueChange={(valeur) => valeur && setTri(valeur as Tri)}
              >
                <SelectTrigger id="tri" className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LIBELLES_TRI).map(([valeur, libelle]) => (
                    <SelectItem key={valeur} value={valeur}>
                      {libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {resultats.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-border p-12 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="size-6" />
              </span>
              <h2 className="mt-5 font-heading text-xl font-bold">
                Aucune formation ne correspond
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Élargissez vos critères pour voir plus de résultats.
              </p>
              <button
                type="button"
                onClick={() => setFiltres(FILTRES_VIDES)}
                className={cn(buttonVariants(), "effet-action mt-6")}
              >
                <RotateCcw className="size-4" />
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {resultats.map((formation, index) => (
                <CarteFormationCatalogue
                  key={formation.id}
                  formation={formation}
                  // plafonné à 6 : au-delà, l'attente devient perceptible sur un grand catalogue
                  delai={Math.min(index, 6) * 60}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
