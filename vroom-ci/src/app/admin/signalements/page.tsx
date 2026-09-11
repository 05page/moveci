"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Flag, XCircle } from "lucide-react";

import CarteStat from "@/components/CarteStat";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { StatsAdmin } from "@/types";

/** Même contrat que GET /admin/stats — voir dashboard/page.tsx. */
const recupererStatsAdmin = async (): Promise<StatsAdmin> => {
  const reponse = await api.get<{ data: StatsAdmin }>("admin/stats");
  return reponse.data;
};

export default function PageSignalements() {
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

  const total = stats
    ? Object.values(stats.signalements_statut).reduce((s, n) => s + (n ?? 0), 0)
    : 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <h1 className="font-heading text-2xl font-bold md:text-3xl">Signalements</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Traitement des signalements de la plateforme.
      </p>

      {stats ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CarteStat libelle="Signalements au total" valeur={total} icone={Flag} />
          <CarteStat
            libelle="En attente"
            valeur={stats.signalements_statut.en_attente ?? 0}
            icone={ClipboardCheck}
            precision="À traiter"
            accent={(stats.signalements_statut.en_attente ?? 0) > 0}
          />
          <CarteStat
            libelle="Traités"
            valeur={stats.signalements_statut.traité ?? 0}
            icone={CheckCircle2}
          />
          <CarteStat
            libelle="Rejetés"
            valeur={stats.signalements_statut.rejeté ?? 0}
            icone={XCircle}
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
            <Flag className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-xl font-bold">Aucun signalement</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucun signalement n&apos;a été reçu pour l&apos;instant.
          </p>
        </section>
      )}

      {stats && total > 0 && (
        <section className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Flag className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-xl font-bold">Liste détaillée à venir</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {total} signalement{total > 1 ? "s" : ""} enregistré{total > 1 ? "s" : ""} —
            la liste avec traitement individuel arrive bientôt.
          </p>
        </section>
      )}
    </main>
  );
}
