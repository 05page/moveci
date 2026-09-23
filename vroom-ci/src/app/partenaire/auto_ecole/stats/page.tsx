"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, GraduationCap, Trophy, Users } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import GrapheBarresTemporel, { type PointGrapheTemporel } from "@/components/GrapheBarresTemporel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ICONE_PERMIS, LIBELLE_PERMIS, STYLE_STATUT_VALIDATION_FORMATION } from "@/lib/formation";
import type { FormationAutoEcole, StatsAutoEcole } from "@/types";

const NOMBRE_TOP_FORMATIONS = 5;

type Periode = "semaine" | "mois";

/** Aplatit stats_semaine ou stats_mensuel vers la forme commune attendue par GrapheBarresTemporel. */
const construirePoints = (stats: StatsAutoEcole, periode: Periode): PointGrapheTemporel[] => {
  if (periode === "semaine") {
    return stats.stats_semaine.map((point) => ({
      etiquette: point.nom_jour,
      inscriptions: point.inscriptions,
    }));
  }

  return stats.stats_mensuel.map((point) => ({
    etiquette: point.nom_mois.slice(0, 3),
    inscriptions: point.inscriptions,
  }));
};

type DonneesStatsAutoEcole = {
  stats: StatsAutoEcole;
  formations: FormationAutoEcole[];
};

const recupererDonnees = async (): Promise<DonneesStatsAutoEcole> => {
  const [reponseStats, reponseFormations] = await Promise.all([
    api.get<{ data: StatsAutoEcole }>("formations/mes-stats"),
    api.get<{ data: FormationAutoEcole[] }>("formations/mes-formations"),
  ]);

  return { stats: reponseStats.data, formations: reponseFormations.data };
};

export default function PageStatsAutoEcole() {
  const [donnees, setDonnees] = useState<DonneesStatsAutoEcole | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  const [periode, setPeriode] = useState<Periode>("semaine");

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererDonnees().then((resultat) => {
      if (annule) return;
      setDonnees(resultat);
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

  if (chargement || !donnees) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-9 w-32" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <Skeleton className="mt-12 h-64 w-full" />
      </main>
    );
  }

  const { stats, formations } = donnees;
  const stockVide = stats.nb_formations === 0;

  const topFormations: FormationAutoEcole[] = [...formations]
  .toSorted((a, b) => b.inscriptions_count - a.inscriptions_count)
  .slice(0, NOMBRE_TOP_FORMATIONS);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Le détail de vos performances : formations qui cartonnent et taux de réussite.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} />
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteStat
          libelle="Formations en ligne"
          valeur={stats.nb_formations}
          icone={GraduationCap}
          precision="Validées et disponibles"
        />
        <CarteStat
          libelle="Élèves inscrits"
          valeur={stats.total_inscrits}
          icone={Users}
          precision="Toutes formations confondues"
        />
        <CarteStat
          libelle="En cours"
          valeur={stats.en_cours}
          icone={Clock}
          precision="Formation démarrée, examen à venir"
        />
        <CarteStat
          libelle="Taux de réussite"
          valeur={stats.taux_reussite !== null ? `${stats.taux_reussite}%` : "—"}
          icone={Trophy}
          precision={
            stats.taux_reussite !== null
              ? `${stats.reussis} réussite(s) sur ${stats.termines} terminée(s)`
              : "Aucune formation terminée pour l'instant"
          }
        />
      </section>

      {stockVide ? (
        <section className="mt-12 rounded-2xl border border-border p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">Pas encore de données</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Publiez une formation pour commencer à récolter des inscriptions et suivre votre taux de réussite.
          </p>
          <Link
            href="/partenaire/auto_ecole/post-formation"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
          >
            <GraduationCap className="size-4" />
            Publier une formation
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold">Inscriptions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nouvelles inscriptions reçues sur la période.
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
              donnees={construirePoints(stats, periode)}
              series={[{ cle: "inscriptions", libelle: "Inscriptions", couleur: "var(--primary)" }]}
            />
          </section>

          <section className="mt-12">
          <h2 className="font-heading text-xl font-bold">Vos formations les plus suivies</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les {NOMBRE_TOP_FORMATIONS} formations qui comptent le plus d&apos;élèves inscrits.
          </p>

          <ul className="mt-6 divide-y divide-border border-y border-border">
            {topFormations.map((formation, index) => {
              const Icone = ICONE_PERMIS[formation.type_permis];
              const styleValidation = STYLE_STATUT_VALIDATION_FORMATION[formation.statut_validation];

              return (
                <li key={formation.id}>
                  <Link
                    href={`/partenaire/auto_ecole/formations/${formation.id}`}
                    className="group flex items-center gap-3 py-4 transition-colors hover:bg-muted/40 sm:gap-4"
                  >
                    <span className="w-6 shrink-0 font-heading text-sm font-bold tabular-nums text-primary sm:w-7">
                      {`0${index + 1}`}
                    </span>

                    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-16">
                      <Icone className="size-6" />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="min-w-0 sm:flex-1">
                        <span className="block truncate font-semibold transition-colors group-hover:text-primary">
                          {formation.titre}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          Permis {formation.type_permis} · {LIBELLE_PERMIS[formation.type_permis]}
                        </span>
                      </span>

                      <span className="flex items-center justify-between gap-3 sm:justify-end">
                        <Badge className={cn("max-w-32 shrink truncate", styleValidation.classes)}>
                          {styleValidation.libelle}
                        </Badge>
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums sm:w-20 sm:justify-end">
                          <Users className="size-4 text-muted-foreground" />
                          {formation.inscriptions_count.toLocaleString("fr-FR")}
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
