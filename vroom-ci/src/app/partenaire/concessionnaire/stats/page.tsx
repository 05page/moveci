"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, Eye, Handshake, ImagePlus, KeyRound, Wallet } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import GrapheBarresTemporel, { type PointGrapheTemporel } from "@/components/GrapheBarresTemporel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, formaterCompact, formaterFcfa, urlPhoto, variationPourcent } from "@/lib/utils";
import { libelleVehicule, photoPrincipale, STYLE_STATUT } from "@/lib/vehicule";
import type { StatsVendeur } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   STATS CONCESSIONNAIRE — /partenaire/concessionnaire/stats
   Le détail que Dashboard n'affiche plus : le graphe "Votre rythme" (seul rôle
   avec une série temporelle côté back, voir StatsVendeur.stats_semaine/mensuel)
   et le classement des véhicules les plus vus. Même stats/mes-stats que Dashboard.
   ──────────────────────────────────────────────────────────────────────────── */

type Periode = "semaine" | "mois";

/** Mois abrégé sans collision : slice(0,3) donnerait "jui" pour juin ET juillet. */
const abregerMois = (mois: number): string =>
  new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(2000, mois - 1, 1));

/** Aplatit `stats_semaine` ou `stats_mensuel` vers la forme commune attendue par GrapheBarresTemporel. */
const construirePoints = (stats: StatsVendeur, periode: Periode): PointGrapheTemporel[] => {
  if (periode === "semaine") {
    return stats.stats_semaine.map((point) => ({
      etiquette: point.nom_jour,
      vues: point.vues,
      ventes: point.ventes,
    }));
  }

  return stats.stats_mensuel.map((point) => ({
    etiquette: abregerMois(point.mois),
    vues: point.vues,
    ventes: point.ventes,
  }));
};

const recupererStats = async (): Promise<StatsVendeur> => {
  const reponse = await api.get<{ data: StatsVendeur }>("stats/mes-stats");
  return reponse.data;
};

export default function PageStatsConcessionnaire() {
  const [stats, setStats] = useState<StatsVendeur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [periode, setPeriode] = useState<Periode>("semaine");
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let annule = false;

    recupererStats().then((resultat) => {
      if (annule) return;
      setStats(resultat);
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

  if (chargement || !stats) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-9 w-32" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <Skeleton className="mt-12 h-64 w-full" />
      </main>
    );
  }

  const stockVide = stats.stats.total_vehicule === 0 && stats.stats.total_vues === 0;
  const pointsGraphe = construirePoints(stats, periode);

  // en janvier, l'index -1 rend undefined : variationPourcent renvoie alors undefined et la prop n'est pas passée
  const moisCourant = new Date().getMonth() + 1;
  const tendanceVues = variationPourcent(
    stats.stats_mensuel[moisCourant - 1]?.vues,
    stats.stats_mensuel[moisCourant - 2]?.vues
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Le détail de vos performances : rythme des vues et véhicules qui cartonnent.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} />
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CarteStat
          libelle="Véhicules en ligne"
          valeur={stats.stats.total_vehicule}
          icone={Car}
          precision="Au statut disponible"
        />
        <CarteStat
          libelle="Vendus"
          valeur={stats.stats.total_vehicule_vendu}
          icone={Handshake}
          precision={`${stats.rdv.total_rdv} rendez-vous confirmés`}
        />
        <CarteStat
          libelle="Loués"
          valeur={stats.stats.total_vehicule_loue}
          icone={KeyRound}
          precision="Véhicules en location"
        />
        <CarteStat
          libelle="Vues au total"
          valeur={formaterCompact(stats.stats.total_vues)}
          icone={Eye}
          tendance={tendanceVues}
          precision={`${stats.stats.total_vues_jour} aujourd'hui`}
        />
        <CarteStat
          libelle="Revenus du mois"
          valeur={`${formaterCompact(stats.stats.total_revenus)} F`}
          icone={Wallet}
          precision={formaterFcfa(stats.stats.total_revenus)}
        />
      </section>

      {stockVide ? (
        <section className="mt-12 rounded-2xl border border-border p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">Pas encore de données</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Publiez un véhicule pour commencer à récolter des vues et suivre votre rythme.
          </p>
          <Link
            href="/partenaire/concessionnaire/post-vehicule"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
          >
            <ImagePlus className="size-4" />
            Publier un véhicule
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold">Votre rythme</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les vues et ventes reçues par vos annonces.
                </p>
              </div>

              <div role="tablist" className="flex gap-2">
                {(["semaine", "mois"] as const).map((valeur) => (
                  <button
                    key={valeur}
                    type="button"
                    role="tab"
                    aria-selected={valeur === periode}
                    onClick={() => setPeriode(valeur)}
                    className={cn(
                      "rounded-4xl px-4 py-2 text-sm font-semibold capitalize transition-colors",
                      valeur === periode
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    )}
                  >
                    {valeur}
                  </button>
                ))}
              </div>
            </div>

            <GrapheBarresTemporel
              donnees={pointsGraphe}
              series={[
                { cle: "vues", libelle: "Vues", couleur: "var(--primary)" },
                { cle: "ventes", libelle: "Ventes", couleur: "var(--chart-2)" },
              ]}
            />
          </section>

          <section className="mt-16">
            <h2 className="font-heading text-xl font-bold">Vos annonces les plus vues</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les cinq véhicules qui attirent le plus de visiteurs.
            </p>

            <ul className="mt-6 divide-y divide-border border-y border-border">
              {stats.top_vehicule_vues.my_top_vehicle_most_vues.map((vehicule, index) => {
                const statut = STYLE_STATUT[vehicule.statut];
                const libelle = libelleVehicule(vehicule.description, vehicule.id);
                const photo = photoPrincipale(vehicule.photos);

                return (
                  <li key={vehicule.id}>
                    <Link
                      href={`/partenaire/concessionnaire/vehicule/${vehicule.id}`}
                      className="group flex items-center gap-3 py-4 transition-colors hover:bg-muted/40 sm:gap-4"
                    >
                      <span className="w-6 shrink-0 font-heading text-sm font-bold tabular-nums text-primary sm:w-7">
                        {`0${index + 1}`}
                      </span>

                      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-16">
                        {photo ? (
                          // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
                          <img
                            src={urlPhoto(photo.path)}
                            alt=""
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-muted-foreground">
                            <Car className="size-6" />
                          </span>
                        )}
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                        <span className="min-w-0 sm:flex-1">
                          <span className="block truncate font-semibold transition-colors group-hover:text-primary">
                            {libelle}
                          </span>
                          <span className="mt-0.5 block text-sm tabular-nums text-muted-foreground">
                            {/* Number() obligatoire : `prix` est une string, un + concatènerait */}
                            {formaterFcfa(Number(vehicule.prix))}
                            {vehicule.post_type === "location" && " / jour"}
                          </span>
                        </span>

                        <span className="flex items-center justify-between gap-3 sm:justify-end">
                          <Badge className={cn("max-w-32 shrink truncate", statut.classes)}>
                            {statut.libelle}
                          </Badge>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums sm:w-20 sm:justify-end">
                            <Eye className="size-4 text-muted-foreground" />
                            {vehicule.views_count.toLocaleString("fr-FR")}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
