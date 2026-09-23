"use client";

import { useEffect, useMemo, useState } from "react";
import { Car, RotateCcw, Search } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteVehiculeCatalogue from "@/components/CarteVehiculeCatalogue";
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
import { cn } from "@/lib/utils";
import type { PostTypeVehicule, ReponseCatalogue, User, VehiculeCatalogue } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   PARC AUTO (CONCESSIONNAIRE) — /partenaire/concessionnaire/parc-auto
   Remplace l'ancien onglet "Publier un véhicule" de la sidebar (le formulaire
   reste joignable via le bouton flottant "+" — BoutonFlottantPublier.tsx —
   et via le CTA du dashboard vide, tous deux inchangés).

   Réutilise le même GET /vehicules public que /vehicules/page.tsx (le
   catalogue), mais recadré sur le besoin du concessionnaire : voir le parc
   des AUTRES vendeurs/concessionnaires, jamais le sien (déjà visible sur son
   dashboard). Filtre donc côté client sur creator.role et creator.id — pas de
   nouvel endpoint backend, le contrat GET /vehicules inclut déjà `creator`.
   ──────────────────────────────────────────────────────────────────────────── */

/** Même contrat que GET /api/vehicules : `data` vaut `[]` catalogue vide, `{ vehicules, statsVehicules }` sinon. */
const recupererCatalogue = async (): Promise<ReponseCatalogue | []> => {
  const reponse = await api.get<{ data: ReponseCatalogue | [] }>("vehicules");
  return reponse.data;
};

const recupererMoi = async (): Promise<User> => {
  const reponse = await api.get<{ data: User }>("me");
  return reponse.data;
};

function normaliserCatalogue(reponse: ReponseCatalogue | []): VehiculeCatalogue[] {
  return Array.isArray(reponse) ? [] : reponse.vehicules;
}

type Tri = "recent" | "prix_asc" | "prix_desc" | "vues";

const LIBELLES_TRI: Record<Tri, string> = {
  recent: "Plus récentes",
  prix_asc: "Prix croissant",
  prix_desc: "Prix décroissant",
  vues: "Plus consultées",
};

export default function PageParcAutoConcessionnaire() {
  const [vehicules, setVehicules] = useState<VehiculeCatalogue[]>([]);
  const [moi, setMoi] = useState<User | null>(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [postType, setPostType] = useState<PostTypeVehicule | "tout">("tout");
  const [tri, setTri] = useState<Tri>("recent");
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    Promise.all([recupererCatalogue(), recupererMoi()]).then(([reponseCatalogue, utilisateur]) => {
      if (annule) return;
      setVehicules(normaliserCatalogue(reponseCatalogue));
      setMoi(utilisateur);
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

  /** Le parc des autres : jamais mes propres annonces, jamais un vendeur hors vendeur/concessionnaire. */
  const parcDesAutres = useMemo(
    () =>
      vehicules.filter(
        (v) =>
          v.creator.id !== moi?.id &&
          (v.creator.role === "vendeur" || v.creator.role === "concessionnaire")
      ),
    [vehicules, moi]
  );

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();

    const liste = parcDesAutres.filter((vehicule) => {
      if (postType !== "tout" && vehicule.post_type !== postType) return false;
      if (q) {
        const cible =
          `${vehicule.description?.marque ?? ""} ${vehicule.description?.modele ?? ""} ${vehicule.creator.fullname}`.toLowerCase();
        if (!cible.includes(q)) return false;
      }
      return true;
    });

    return liste.sort((a, b) => {
      switch (tri) {
        case "prix_asc":
          return Number(a.prix) - Number(b.prix);
        case "prix_desc":
          return Number(b.prix) - Number(a.prix);
        case "vues":
          return b.views_count - a.views_count;
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [parcDesAutres, recherche, postType, tri]);

  if (chargement) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-8 h-12 w-full" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[26rem] w-full" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Parc auto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les véhicules publiés par les autres vendeurs et concessionnaires.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={recherche}
            onChange={(evenement) => setRecherche(evenement.target.value)}
            placeholder="Marque, modèle, vendeur…"
            className="pl-9"
          />
        </div>

        <Select
          value={postType}
          onValueChange={(valeur) => valeur && setPostType(valeur as PostTypeVehicule | "tout")}
        >
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tout">Vente et location</SelectItem>
            <SelectItem value="vente">À vendre</SelectItem>
            <SelectItem value="location">À louer</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex shrink-0 items-center gap-2">
          <Label htmlFor="tri" className="text-sm text-muted-foreground">
            Trier par
          </Label>
          <Select value={tri} onValueChange={(valeur) => valeur && setTri(valeur as Tri)}>
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
            <Car className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">Aucun véhicule ne correspond</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {recherche || postType !== "tout"
              ? "Élargissez vos critères de recherche."
              : "Aucun autre vendeur ou concessionnaire n'a encore publié de véhicule."}
          </p>
          {(recherche || postType !== "tout") && (
            <button
              type="button"
              onClick={() => {
                setRecherche("");
                setPostType("tout");
              }}
              className={cn(buttonVariants(), "effet-action mt-6")}
            >
              <RotateCcw className="size-4" />
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {resultats.map((vehicule, index) => (
            <CarteVehiculeCatalogue
              key={vehicule.id}
              vehicule={vehicule}
              avecAlertePrix={false}
              basePathVendeur="/partenaire/concessionnaire/vendeur"
              basePathVehicule="/partenaire/concessionnaire/parc-auto"
              // plafonné à 6 : au-delà, l'attente devient perceptible sur un grand catalogue
              delai={Math.min(index, 6) * 60}
            />
          ))}
        </div>
      )}
    </main>
  );
}
