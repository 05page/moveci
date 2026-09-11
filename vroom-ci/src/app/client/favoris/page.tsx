"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, Heart, Search, TriangleAlert } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteFavori from "@/components/CarteFavori";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { estDisponible } from "@/lib/vehicule";
import type { Favori } from "@/types";

/** Même contrat que GET /api/favoris : le back ne filtre rien, un favori vendu/réservé reste dans la liste. */
const recupererFavoris = async (): Promise<Favori[]> => {
  const reponse = await api.get<{ data: Favori[] }>("favoris");
  return reponse.data;
};

/** Même contrat que DELETE /api/favoris/{vehiculeId}. Rejette (404) pour déclencher le retour en arrière. */
const retirerFavori = async (vehiculeId: string): Promise<void> => {
  await api.delete<{ message: string }>(`favoris/${vehiculeId}`);
};

type Filtre = "tout" | "disponibles" | "indisponibles";

const LIBELLES_FILTRE: Record<Filtre, string> = {
  tout: "Tous",
  disponibles: "Encore disponibles",
  indisponibles: "Plus disponibles",
};

export default function PageFavoris() {
  const [favoris, setFavoris] = useState<Favori[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [erreur, setErreur] = useState<string | null>(null);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererFavoris().then((liste) => {
      if (annule) return;
      setFavoris(liste);
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

  // useMemo : ces trois partitions se recalculeraient à chaque frappe sans lui
  const { disponibles, indisponibles } = useMemo(
    () => ({
      disponibles: favoris.filter((f) => estDisponible(f.vehicule.statut)),
      indisponibles: favoris.filter((f) => !estDisponible(f.vehicule.statut)),
    }),
    [favoris]
  );

  const COMPTEURS: Record<Filtre, number> = {
    tout: favoris.length,
    disponibles: disponibles.length,
    indisponibles: indisponibles.length,
  };

  const listeAffichee =
    filtre === "disponibles"
      ? disponibles
      : filtre === "indisponibles"
        ? indisponibles
        : favoris;

  /**
   * Retrait optimiste : la carte disparaît AVANT la réponse du serveur, sinon
   * l'interface paraît figée pendant l'aller-retour. `precedents` conserve la
   * liste d'origine pour la remettre en place si l'appel échoue.
   */
  const retirer = (vehiculeId: string) => {
    const precedents = favoris;

    setErreur(null);
    setFavoris((liste) => liste.filter((f) => f.vehicule.id !== vehiculeId));

    retirerFavori(vehiculeId)
      .then(() => toast.success("Retiré des favoris."))
      .catch(() => {
        setFavoris(precedents);
        setErreur("Le retrait a échoué. Le favori a été remis dans la liste.");
        toast.error("Le retrait a échoué. Le favori a été remis dans la liste.");
      });
  };

  if (chargement) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-96" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-96 w-full" />
          ))}
        </div>
      </main>
    );
  }

  if (favoris.length === 0) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <section className="rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="size-7" />
          </span>
          <h1 className="mt-6 font-heading text-2xl font-bold">
            Aucun favori pour l&apos;instant
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Le cœur sur une annonce la met de côté ici. Vous y retrouvez son prix,
            et surtout vous êtes prévenu quand elle n&apos;est plus disponible.
          </p>
          <Link
            href="/vehicules"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
          >
            <Search className="size-4" />
            Parcourir les véhicules
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
            Mes favoris
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {favoris.length} véhicule{favoris.length > 1 ? "s" : ""} mis de côté.
            Les annonces vendues ou réservées restent affichées : c&apos;est ainsi
            que vous voyez le marché bouger.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      {/* l'information la plus utile de la page passe avant la grille */}
      {indisponibles.length > 0 && (
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-primary bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <strong className="font-semibold">
                {indisponibles.length} de vos favoris
              </strong>{" "}
              ne {indisponibles.length > 1 ? "sont" : "est"} plus disponible
              {indisponibles.length > 1 ? "s" : ""}. Créez une alerte pour être
              prévenu dès qu&apos;un modèle équivalent est publié.
            </span>
          </p>

          <Link
            href="/client/alertes"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "effet-action shrink-0 bg-background"
            )}
          >
            <BellRing className="size-4" />
            Créer une alerte
          </Link>
        </div>
      )}

      {/* role="status" : le lecteur d'écran annonce l'échec sans que le focus bouge */}
      {erreur && (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {erreur}
        </p>
      )}

      <div role="tablist" className="mt-8 flex flex-wrap gap-2">
        {(["tout", "disponibles", "indisponibles"] as const).map((valeur) => (
          <button
            key={valeur}
            type="button"
            role="tab"
            aria-selected={valeur === filtre}
            onClick={() => setFiltre(valeur)}
            className={cn(
              "inline-flex items-center gap-2 rounded-4xl px-4 py-2 text-sm font-semibold transition-colors",
              valeur === filtre
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
            )}
          >
            {LIBELLES_FILTRE[valeur]}
            <span className="tabular-nums opacity-70">{COMPTEURS[valeur]}</span>
          </button>
        ))}
      </div>

      {/* un filtre peut ne rien laisser : sans ce cas, la grille disparaît sans explication */}
      {listeAffichee.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
          Aucun favori dans cette catégorie.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listeAffichee.map((favori, index) => (
            <CarteFavori
              key={favori.id}
              favori={favori}
              onRetirer={retirer}
              // 60 ms d'écart : la grille se remplit en cascade au lieu d'apparaître d'un bloc
              delai={index * 60}
            />
          ))}
        </div>
      )}
    </main>
  );
}
