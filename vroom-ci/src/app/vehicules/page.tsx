"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteVehiculeCatalogue from "@/components/CarteVehiculeCatalogue";
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
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { estErreurAuth } from "@/lib/erreurs";
import { cn, formaterFcfa } from "@/lib/utils";
import type {
  Favori,
  PostTypeVehicule,
  ReponseCatalogue,
  TypeVehicule,
  VehiculeCatalogue,
} from "@/types";

/** Même contrat que GET /api/vehicules : `data` vaut `[]` catalogue vide, `{ vehicules, statsVehicules }` sinon. */
const recupererCatalogue = async (): Promise<ReponseCatalogue | []> => {
  const reponse = await api.get<{ data: ReponseCatalogue | [] }>("vehicules");
  return reponse.data;
};

/** GET /api/favoris échoue en 401 pour un visiteur non connecté : on retombe alors sur aucun favori pré-coché. */
const recupererIdsFavoris = async (): Promise<Set<string>> => {
  try {
    const reponse = await api.get<{ data: Favori[] }>("favoris");
    return new Set(reponse.data.map((favori) => favori.vehicule_id));
  } catch {
    return new Set();
  }
};

/**
 * Ramène les deux formes de réponse à une seule.
 *
 * `VehiculesController::index()` renvoie `data: []` — un tableau nu — quand le
 * catalogue est vide, et `data: { vehicules, statsVehicules }` sinon. Sans cette
 * normalisation, un `data.vehicules.map()` plante sur une base fraîche.
 */
function normaliserCatalogue(reponse: ReponseCatalogue | []): ReponseCatalogue {
  if (Array.isArray(reponse)) {
    return {
      vehicules: [],
      statsVehicules: { total_vehicules: 0, en_vente: 0, en_location: 0 },
    };
  }
  return reponse;
}

/* ─── Filtres ──────────────────────────────────────────────────────────────── */

type Tri = "recent" | "prix_asc" | "prix_desc" | "vues";

const LIBELLES_TRI: Record<Tri, string> = {
  recent: "Plus récentes",
  prix_asc: "Prix croissant",
  prix_desc: "Prix décroissant",
  vues: "Plus consultées",
};

type Filtres = {
  recherche: string;
  postType: PostTypeVehicule | "tout";
  type: TypeVehicule | "tout";
  /** "" signifie « toutes les valeurs », pas « valeur vide ». */
  marque: string;
  carburant: string;
  transmission: string;
  /** Gardés en string : un `<input type="number">` vidé rend "", pas 0. */
  prixMin: string;
  prixMax: string;
  negociable: boolean;
};

const FILTRES_VIDES: Filtres = {
  recherche: "",
  postType: "tout",
  type: "tout",
  marque: "",
  carburant: "",
  transmission: "",
  prixMin: "",
  prixMax: "",
  negociable: false,
};

/** Un couple label + liste déroulante, pour ne pas répéter trois fois le même balisage. */
function ChampSelect({
  id,
  libelle,
  valeur,
  options,
  onChange,
}: {
  id: string;
  libelle: string;
  valeur: string;
  options: string[];
  onChange: (valeur: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {libelle}
      </Label>
      <Select value={valeur} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger id={id} className="mt-2 w-full">
          <SelectValue placeholder="Toutes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Toutes</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Groupe de pilules exclusives, repris du style des onglets de l'accueil. */
function GroupePilules<T extends string>({
  libelle,
  valeur,
  options,
  onChange,
}: {
  libelle: string;
  valeur: T;
  options: { valeur: T; libelle: string }[];
  onChange: (valeur: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {libelle}
      </p>
      <div role="group" className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.valeur}
            type="button"
            aria-pressed={option.valeur === valeur}
            onClick={() => onChange(option.valeur)}
            className={cn(
              "rounded-4xl px-3 py-1.5 text-sm font-medium transition-colors",
              option.valeur === valeur
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
            )}
          >
            {option.libelle}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PageCatalogue() {
  const router = useRouter();
  const [vehicules, setVehicules] = useState<VehiculeCatalogue[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [tri, setTri] = useState<Tri>("recent");
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [favoris, setFavoris] = useState<Set<string>>(new Set());
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    Promise.all([recupererCatalogue(), recupererIdsFavoris()]).then(
      ([reponse, idsFavoris]) => {
        if (annule) return;
        setVehicules(normaliserCatalogue(reponse).vehicules);
        setFavoris(idsFavoris);
        setChargement(false);
      }
    );

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  /** Les listes déroulantes sont dérivées des données : jamais d'option sans résultat. */
  const options = useMemo(() => {
    const uniques = (extraire: (v: VehiculeCatalogue) => string | null | undefined) =>
      Array.from(
        new Set(
          vehicules
            .map(extraire)
            .filter((valeur): valeur is string => Boolean(valeur))
        )
      ).sort((a, b) => a.localeCompare(b, "fr"));

    return {
      marques: uniques((v) => v.description?.marque),
      carburants: uniques((v) => v.description?.carburant),
      transmissions: uniques((v) => v.description?.transmission),
    };
  }, [vehicules]);

  const resultats = useMemo(() => {
    const recherche = filtres.recherche.trim().toLowerCase();
    // "" et non 0 : un champ vidé ne doit pas devenir une borne à zéro
    const prixMin = filtres.prixMin === "" ? 0 : Number(filtres.prixMin);
    const prixMax = filtres.prixMax === "" ? Infinity : Number(filtres.prixMax);

    const liste = vehicules.filter((vehicule) => {
      const description = vehicule.description;
      const prix = Number(vehicule.prix);

      if (recherche) {
        const cible =
          `${description?.marque ?? ""} ${description?.modele ?? ""}`.toLowerCase();
        if (!cible.includes(recherche)) return false;
      }
      if (filtres.postType !== "tout" && vehicule.post_type !== filtres.postType)
        return false;
      if (filtres.type !== "tout" && vehicule.type !== filtres.type) return false;
      if (filtres.marque && description?.marque !== filtres.marque) return false;
      if (filtres.carburant && description?.carburant !== filtres.carburant)
        return false;
      if (
        filtres.transmission &&
        description?.transmission !== filtres.transmission
      )
        return false;
      if (prix < prixMin || prix > prixMax) return false;
      if (filtres.negociable && !vehicule.negociable) return false;

      return true;
    });

    // `filter` a déjà produit un nouveau tableau : ce `sort` ne mute pas `vehicules`
    return liste.sort((a, b) => {
      switch (tri) {
        case "prix_asc":
          return Number(a.prix) - Number(b.prix);
        case "prix_desc":
          return Number(b.prix) - Number(a.prix);
        case "vues":
          return b.views_count - a.views_count;
        case "recent":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [vehicules, filtres, tri]);

  /** Une pastille par filtre actif, chacune sachant s'effacer elle-même. */
  const pastilles: { cle: string; libelle: string; effacer: () => void }[] = [];
  const modifier = (partiel: Partial<Filtres>) =>
    setFiltres((actuels) => ({ ...actuels, ...partiel }));

  if (filtres.recherche.trim())
    pastilles.push({
      cle: "recherche",
      libelle: `« ${filtres.recherche.trim()} »`,
      effacer: () => modifier({ recherche: "" }),
    });
  if (filtres.postType !== "tout")
    pastilles.push({
      cle: "postType",
      libelle: filtres.postType === "vente" ? "À vendre" : "À louer",
      effacer: () => modifier({ postType: "tout" }),
    });
  if (filtres.type !== "tout")
    pastilles.push({
      cle: "type",
      libelle: filtres.type === "neuf" ? "Neuf" : "Occasion",
      effacer: () => modifier({ type: "tout" }),
    });
  if (filtres.marque)
    pastilles.push({
      cle: "marque",
      libelle: filtres.marque,
      effacer: () => modifier({ marque: "" }),
    });
  if (filtres.carburant)
    pastilles.push({
      cle: "carburant",
      libelle: filtres.carburant,
      effacer: () => modifier({ carburant: "" }),
    });
  if (filtres.transmission)
    pastilles.push({
      cle: "transmission",
      libelle: filtres.transmission,
      effacer: () => modifier({ transmission: "" }),
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
  if (filtres.negociable)
    pastilles.push({
      cle: "negociable",
      libelle: "Négociable",
      effacer: () => modifier({ negociable: false }),
    });

  const basculerFavori = async (vehiculeId: string) => {
    const dejaFavori = favoris.has(vehiculeId);

    // optimiste : le cœur change AVANT la réponse serveur, sinon le clic paraît sans effet
    setFavoris((actuels) => {
      const suivant = new Set(actuels);
      if (dejaFavori) suivant.delete(vehiculeId);
      else suivant.add(vehiculeId);
      return suivant;
    });

    try {
      if (dejaFavori) {
        await api.delete<{ message: string }>(`favoris/${vehiculeId}`);
      } else {
        await api.post<{ message: string }>(`favoris/${vehiculeId}`);
      }
      toast.success(dejaFavori ? "Retiré des favoris." : "Ajouté aux favoris.");
    } catch (erreur) {
      // remet le cœur dans son état d'origine
      setFavoris((actuels) => {
        const suivant = new Set(actuels);
        if (dejaFavori) suivant.add(vehiculeId);
        else suivant.delete(vehiculeId);
        return suivant;
      });

      // pas de session : direction la connexion plutôt qu'un cœur qui ne "prend" jamais
      if (estErreurAuth(erreur) && erreur.status === 401) {
        router.push("/auth");
        return;
      }
      toast.error(messageErreur(erreur, "L'action a échoué."));
    }
  };

  if (chargement) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-10 w-72" />
        <div className="mt-8 lg:grid lg:grid-cols-[272px_1fr] lg:items-start lg:gap-8">
          <Skeleton className="hidden h-[32rem] w-full lg:block" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[26rem] w-full" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (vehicules.length === 0) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <section className="rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Car className="size-7" />
          </span>
          <h1 className="mt-6 font-heading text-2xl font-bold">
            Le catalogue est vide
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Aucune annonce n&apos;est en ligne pour le moment. Revenez bientôt,
            ou publiez la vôtre.
          </p>
          <Link
            href="/vendeur/vehicules/nouveau"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
          >
            Déposer une annonce
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Tous les véhicules
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
              annonce{resultats.length > 1 ? "s" : ""}
              {pastilles.length > 0
                ? " correspondent à vos critères"
                : " en ligne à Abidjan et alentours"}
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
              Marque ou modèle
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
                placeholder="Corolla, Tucson…"
                className="pl-9"
              />
            </div>
          </div>

          <GroupePilules
            libelle="Transaction"
            valeur={filtres.postType}
            onChange={(postType) => modifier({ postType })}
            options={[
              { valeur: "tout", libelle: "Tout" },
              { valeur: "vente", libelle: "À vendre" },
              { valeur: "location", libelle: "À louer" },
            ]}
          />

          <GroupePilules
            libelle="État"
            valeur={filtres.type}
            onChange={(type) => modifier({ type })}
            options={[
              { valeur: "tout", libelle: "Tout" },
              { valeur: "neuf", libelle: "Neuf" },
              { valeur: "occasion", libelle: "Occasion" },
            ]}
          />

          <ChampSelect
            id="marque"
            libelle="Marque"
            valeur={filtres.marque}
            options={options.marques}
            onChange={(marque) => modifier({ marque })}
          />

          <ChampSelect
            id="carburant"
            libelle="Carburant"
            valeur={filtres.carburant}
            options={options.carburants}
            onChange={(carburant) => modifier({ carburant })}
          />

          <ChampSelect
            id="transmission"
            libelle="Transmission"
            valeur={filtres.transmission}
            options={options.transmissions}
            onChange={(transmission) => modifier({ transmission })}
          />

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

          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={filtres.negociable}
              onChange={(evenement) =>
                modifier({ negociable: evenement.target.checked })
              }
              className="size-4 accent-primary"
            />
            Prix négociable uniquement
          </label>

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
                Aucun véhicule ne correspond
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Élargissez vos critères, ou créez une alerte pour être prévenu
                dès qu&apos;une annonce y répond.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setFiltres(FILTRES_VIDES)}
                  className={cn(buttonVariants(), "effet-action")}
                >
                  <RotateCcw className="size-4" />
                  Effacer les filtres
                </button>
                <Link
                  href="/client/alertes"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "effet-action"
                  )}
                >
                  Créer une alerte
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {resultats.map((vehicule, index) => (
                <CarteVehiculeCatalogue
                  key={vehicule.id}
                  vehicule={vehicule}
                  estFavori={favoris.has(vehicule.id)}
                  onBasculerFavori={basculerFavori}
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
