"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Car,
  Fuel,
  Heart,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import GrapheClassement from "@/components/GrapheClassement";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formaterCompact } from "@/lib/utils";
import type { StatsMarche } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   STATISTIQUES — /admin/stats
   Page d'analyse dédiée au comportement acheteurs — le dashboard
   (/admin/dashboard) couvre déjà GET /admin/stats (comptes, véhicules,
   transactions). Ici : GET /admin/stats/marche (AdminController,
   routes/api.php:247).
   ──────────────────────────────────────────────────────────────────────────── */

type DonneesStats = {
  marche: StatsMarche;
};

const recupererStats = async (): Promise<DonneesStats> => {
  const reponseMarche = await api.get<{ data: StatsMarche }>("admin/stats/marche");

  return { marche: reponseMarche.data };
};

export default function PageStats() {
  const [donnees, setDonnees] = useState<DonneesStats | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererStats().then((resultat) => {
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

  const { marche } = donnees;
  const conversion = marche.conversion_rdv_transaction;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Statistiques</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Comportement acheteurs — les comptes et véhicules eux-mêmes sont
            sur le dashboard.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CarteStat
          libelle="Rendez-vous terminés"
          valeur={conversion.rdv_termines}
          icone={CalendarCheck}
          precision={`sur ${conversion.total_rdv} au total`}
        />
        <CarteStat
          libelle="Transactions confirmées"
          valeur={conversion.transactions_confirmees}
          icone={ShieldCheck}
        />
        <CarteStat
          libelle="Taux de conversion"
          valeur={`${conversion.taux_conversion} %`}
          icone={Wallet}
          precision="RDV terminé → transaction confirmée"
        />
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <Heart className="size-4 text-primary" />
            Marques les plus favorites
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Favoris cumulés, vues de la marque entre parenthèses.
          </p>
          <GrapheClassement
            suffixeValeur="favoris"
            lignes={marche.top_marques_favoris.map((point) => ({
              libelle: point.marque,
              valeur: point.favoris,
              detail: `${formaterCompact(point.vues)} vues`,
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <Car className="size-4 text-primary" />
            Modèles les plus favoris
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tous vendeurs confondus, indépendamment de la marque.
          </p>
          <GrapheClassement
            suffixeValeur="favoris"
            lignes={marche.top_modeles_favoris.map((point) => ({
              libelle: `${point.marque} ${point.modele}`,
              valeur: point.favoris,
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <Fuel className="size-4 text-primary" />
            Carburant demandé
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Favoris par type de carburant, vues entre parenthèses.
          </p>
          <GrapheClassement
            suffixeValeur="favoris"
            lignes={marche.repartition_carburant_demande.map((point) => ({
              libelle: point.carburant,
              valeur: point.favoris,
              detail: `${formaterCompact(point.vues)} vues`,
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <Wallet className="size-4 text-primary" />
            Budget recherché
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Favoris par tranche de prix du véhicule.
          </p>
          <GrapheClassement
            suffixeValeur="favoris"
            lignes={marche.tranches_prix_demande.map((point) => ({
              libelle: point.tranche,
              valeur: point.favoris,
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-background p-6 lg:col-span-2">
          <h2 className="font-heading text-lg font-bold">Marques les plus vues</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Classement par vues, indépendant du top favoris ci-dessus.
          </p>
          <GrapheClassement
            suffixeValeur="vues"
            lignes={marche.top_marques_vues.map((point) => ({
              libelle: point.marque,
              valeur: point.vues,
            }))}
          />
        </section>
      </div>
    </main>
  );
}
