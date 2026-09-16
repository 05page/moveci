"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, GraduationCap, Trophy, Users } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { StatsAutoEcole } from "@/types";

const LIEN_FORMATIONS = "/partenaire/auto_ecole/formations";

const recupererStats = async (): Promise<StatsAutoEcole> => {
  const reponse = await api.get<{ data: StatsAutoEcole }>("formations/mes-stats");
  return reponse.data;
};

export default function PageDashboardAutoEcole() {
  const [stats, setStats] = useState<StatsAutoEcole | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
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
        <Skeleton className="h-9 w-48" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </main>
    );
  }

  const stockVide = stats.nb_formations === 0;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La performance de vos formations, en un coup d&apos;œil.
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
          href={LIEN_FORMATIONS}
        />
        <CarteStat
          libelle="Élèves inscrits"
          valeur={stats.total_inscrits}
          icone={Users}
          precision="Toutes formations confondues"
          href={LIEN_FORMATIONS}
        />
        <CarteStat
          libelle="En cours"
          valeur={stats.en_cours}
          icone={Clock}
          precision="Formation démarrée, examen à venir"
          href={LIEN_FORMATIONS}
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
          href={LIEN_FORMATIONS}
        />
      </section>

      {stockVide && (
        <section className="mt-12 rounded-2xl border border-border p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">
            Votre première formation vous attend
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Titre, type de permis, durée et prix : comptez 5 minutes. La formation part en ligne
            dès qu&apos;un administrateur l&apos;a validée.
          </p>
          <Link
            href="/partenaire/auto_ecole/post-formation"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
          >
            <GraduationCap className="size-4" />
            Publier une formation
          </Link>
        </section>
      )}
    </main>
  );
}
