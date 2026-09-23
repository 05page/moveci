"use client";

import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  ClipboardCheck,
  GraduationCap,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, formaterCompact, formaterFcfa } from "@/lib/utils";
import { STYLE_STATUT, STYLE_VALIDATION } from "@/lib/vehicule";
import type { StatsAdmin, StatutValidation, StatutVehicule } from "@/types";

/** "2026-03" -> "mars". Distinct de l'`abregerMois` de /vendeur/profile : la source y est 1-12, ici une string ISO. */
const abregerMoisIso = (moisIso: string): string => {
  const [annee, mois] = moisIso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(
    new Date(annee, mois - 1, 1)
  );
};

const recupererStatsAdmin = async (): Promise<StatsAdmin> => {
  const reponse = await api.get<{ data: StatsAdmin }>("admin/stats");
  return reponse.data;
};

export default function PageDashboardAdmin() {
  const [stats, setStats] = useState<StatsAdmin | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererStatsAdmin().then((resultat) => {
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
      <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <Skeleton className="h-9 w-56" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </main>
    );
  }

  const totalUtilisateurs = Object.values(stats.users_par_statut).reduce(
    (somme, n) => somme + (n ?? 0),
    0
  );
  const totalVehicules = Object.values(stats.vehicules_statut).reduce(
    (somme, n) => somme + (n ?? 0),
    0
  );
  const maxInscriptions = Math.max(1, ...stats.inscriptions_par_mois.map((p) => p.total));
  // "2026-08" : même technique que `dateLocaleIso` dans /vendeur/profile, locale fr-CA = format ISO
  const moisCourantIso = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  const enAttenteModeration = stats.vehicules_validation.en_attente ?? 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Vue d&apos;ensemble de la plateforme : modération, marché et partenaires.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteStat
          libelle="Véhicules en attente"
          valeur={enAttenteModeration}
          icone={ClipboardCheck}
          precision="Modération à traiter"
          accent={enAttenteModeration > 0}
          href="/admin/parc-auto"
        />
        <CarteStat
          libelle="Signalements ouverts"
          valeur={stats.signalements_statut.en_attente ?? 0}
          icone={ShieldAlert}
          precision={`${stats.signalements_statut.traité ?? 0} traités au total`}
        />
        <CarteStat
          libelle="Utilisateurs actifs"
          valeur={formaterCompact(stats.users_par_statut.actif ?? 0)}
          icone={Users}
          precision={`sur ${formaterCompact(totalUtilisateurs)} comptes`}
        />
        <CarteStat
          libelle="Chiffre d'affaires"
          valeur={formaterFcfa(stats.ca_ventes)}
          icone={CircleDollarSign}
          precision="Ventes confirmées, cumul"
        />
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-heading text-lg font-bold">Inscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nouveaux comptes, 6 derniers mois.
          </p>

          <div className="mt-6 flex items-end gap-2 sm:gap-3" aria-hidden>
            {stats.inscriptions_par_mois.map((point) => (
              <div key={point.mois} className="flex min-w-0 flex-1 flex-col items-center">
                <span
                  className={cn(
                    "mb-2 text-[11px] font-semibold tabular-nums",
                    point.mois === moisCourantIso ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {point.total > 0 ? point.total : ""}
                </span>

                <div className="flex h-32 w-full items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-[height] duration-500 ease-out",
                      point.mois === moisCourantIso ? "bg-primary" : "bg-muted"
                    )}
                    style={{ height: `${(point.total / maxInscriptions) * 100}%` }}
                  />
                </div>

                <span
                  className={cn(
                    "mt-2 text-xs capitalize",
                    point.mois === moisCourantIso
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {abregerMoisIso(point.mois)}
                </span>
              </div>
            ))}
          </div>

          {/* le graphe est en aria-hidden : voici les mêmes chiffres pour un lecteur d'écran */}
          <table className="sr-only">
            <caption>Inscriptions par mois</caption>
            <thead>
              <tr>
                <th scope="col">Mois</th>
                <th scope="col">Nouveaux comptes</th>
              </tr>
            </thead>
            <tbody>
              {stats.inscriptions_par_mois.map((point) => (
                <tr key={point.mois}>
                  <td>{point.mois}</td>
                  <td>{point.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-heading text-lg font-bold">Véhicules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formaterCompact(totalVehicules)} véhicules, tous statuts confondus.
          </p>

          <ul className="mt-6 space-y-3">
            {(Object.entries(stats.vehicules_statut) as [StatutVehicule, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([statut, total]) => (
                <li key={statut} className="flex items-center gap-3">
                  <Badge className={cn("w-28 shrink-0 justify-center", STYLE_STATUT[statut].classes)}>
                    {STYLE_STATUT[statut].libelle}
                  </Badge>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${totalVehicules > 0 ? (total / totalVehicules) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {total}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-heading text-lg font-bold">Modération des annonces</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cycle de validation Gemini, vu depuis l&apos;admin.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {(Object.entries(stats.vehicules_validation) as [StatutValidation, number][]).map(
              ([statut, total]) => (
                <li key={statut}>
                  <Badge className={STYLE_VALIDATION[statut].classes}>
                    {STYLE_VALIDATION[statut].libelle} · {total}
                  </Badge>
                </li>
              )
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-heading text-lg font-bold">Partenaires</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Concessionnaires et auto-écoles inscrits.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store className="size-4" />
              </span>
              <p className="mt-3 font-heading text-2xl font-bold tabular-nums">
                {stats.partenaires_par_type.concessionnaire ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Concessionnaires</p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="size-4" />
              </span>
              <p className="mt-3 font-heading text-2xl font-bold tabular-nums">
                {stats.partenaires_par_type.auto_ecole ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Auto-écoles</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
