"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, Eye, Handshake, ImagePlus, KeyRound, Wallet } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, formaterCompact, formaterFcfa, variationPourcent } from "@/lib/utils";
import type { StatsVendeur } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   DASHBOARD CONCESSIONNAIRE — /partenaire/concessionnaire/dashboard
   Même traitement que /partenaire/auto_ecole/dashboard : vue d'ensemble PURE,
   aucune donnée de profil. Le graphe et le top véhicules vivent désormais sur
   /partenaire/concessionnaire/stats — chaque carte y renvoie.
   ──────────────────────────────────────────────────────────────────────────── */

const LIEN_STATS = "/partenaire/concessionnaire/stats";

const recupererStats = async (): Promise<StatsVendeur> => {
  const reponse = await api.get<{ data: StatsVendeur }>("stats/mes-stats");
  return reponse.data;
};

export default function PageDashboardConcessionnaire() {
  const [stats, setStats] = useState<StatsVendeur | null>(null);
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      </main>
    );
  }

  // en janvier, l'index -1 rend undefined : variationPourcent renvoie alors undefined et la prop n'est pas passée
  const moisCourant = new Date().getMonth() + 1;
  const tendanceVues = variationPourcent(
    stats.stats_mensuel[moisCourant - 1]?.vues,
    stats.stats_mensuel[moisCourant - 2]?.vues
  );

  const stockVide = stats.stats.total_vehicule === 0 && stats.stats.total_vues === 0;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La performance de votre parc auto, en un coup d&apos;œil.
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
          href={LIEN_STATS}
        />
        <CarteStat
          libelle="Vendus"
          valeur={stats.stats.total_vehicule_vendu}
          icone={Handshake}
          precision={`${stats.rdv.total_rdv} rendez-vous confirmés`}
          href={LIEN_STATS}
        />
        <CarteStat
          libelle="Loués"
          valeur={stats.stats.total_vehicule_loue}
          icone={KeyRound}
          precision="Véhicules en location"
          href={LIEN_STATS}
        />
        <CarteStat
          libelle="Vues au total"
          valeur={formaterCompact(stats.stats.total_vues)}
          icone={Eye}
          tendance={tendanceVues}
          precision={`${stats.stats.total_vues_jour} aujourd'hui`}
          href={LIEN_STATS}
        />
        {/* compact sur la valeur, montant exact en précision : un gros total déborderait en text-3xl */}
        <CarteStat
          libelle="Revenus du mois"
          valeur={`${formaterCompact(stats.stats.total_revenus)} F`}
          icone={Wallet}
          precision={formaterFcfa(stats.stats.total_revenus)}
          href={LIEN_STATS}
        />
      </section>

      {stockVide && (
        <section className="mt-12 rounded-2xl border border-border p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">
            Votre premier véhicule vous attend
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Photos, marque, modèle, kilométrage et prix : comptez 5 minutes. L&apos;annonce part
            en ligne dès que la vérification automatique confirme les informations.
          </p>
          <Link
            href="/partenaire/concessionnaire/post-vehicule"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
          >
            <ImagePlus className="size-4" />
            Publier un véhicule
          </Link>
        </section>
      )}
    </main>
  );
}
