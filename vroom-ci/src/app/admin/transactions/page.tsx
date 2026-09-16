"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, ClipboardCheck, Handshake, Receipt } from "lucide-react";

import CarteStat from "@/components/CarteStat";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formaterFcfa } from "@/lib/utils";
import type { StatsAdmin } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   TRANSACTIONS — /admin/transactions
   Cartes de stats branchées sur GET /admin/stats (transactions, ca_ventes).
   Le reste (liste, GET /admin/transactions, AdminController — routes/api.php:254)
   est encore une coquille : à construire, sur le modèle de parc-auto/page.tsx
   (fetch + tableau).
   ──────────────────────────────────────────────────────────────────────────── */

/** Même contrat que GET /admin/stats — voir dashboard/page.tsx. */
const recupererStatsAdmin = async (): Promise<StatsAdmin> => {
  const reponse = await api.get<{ data: StatsAdmin }>("admin/stats");
  return reponse.data;
};

export default function PageTransactions() {
  const [stats, setStats] = useState<StatsAdmin | null>(null);

  useEffect(() => {
    let annule = false;
    recupererStatsAdmin().then((resultat) => {
      if (!annule) setStats(resultat);
    });
    return () => {
      annule = true;
    };
  }, []);

  const total = stats ? stats.transactions.reduce((s, ligne) => s + ligne.total, 0) : 0;
  const confirmees = stats
    ? stats.transactions
        .filter((ligne) => ligne.statut === "confirmé")
        .reduce((s, ligne) => s + ligne.total, 0)
    : 0;
  const enAttente = stats
    ? stats.transactions
        .filter((ligne) => ligne.statut === "en_attente")
        .reduce((s, ligne) => s + ligne.total, 0)
    : 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <h1 className="font-heading text-2xl font-bold md:text-3xl">Transactions</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Suivi des transactions conclues sur la plateforme.
      </p>

      {stats ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CarteStat libelle="Transactions au total" valeur={total} icone={Handshake} />
          <CarteStat
            libelle="En attente de confirmation"
            valeur={enAttente}
            icone={ClipboardCheck}
            accent={enAttente > 0}
          />
          <CarteStat libelle="Confirmées" valeur={confirmees} icone={Handshake} />
          <CarteStat
            libelle="Chiffre d'affaires ventes"
            valeur={formaterFcfa(stats.ca_ventes)}
            icone={CircleDollarSign}
            precision="Ventes confirmées uniquement"
          />
        </section>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      )}

      {stats && total === 0 && (
        <section className="mt-8 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-xl font-bold">Aucune transaction</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucune transaction n&apos;a été conclue pour l&apos;instant.
          </p>
        </section>
      )}

      {stats && total > 0 && (
        <section className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-xl font-bold">Liste détaillée à venir</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {total} transaction{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""} —
            la liste avec détail par transaction arrive bientôt.
          </p>
        </section>
      )}
    </main>
  );
}
