"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, History, Search } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import LigneRdv from "@/components/LigneRdv";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { estAVenir } from "@/lib/rdv";
import type { RendezVousClient } from "@/types";
import { api } from "@/lib/api";

/** Même contrat que GET /api/rdv/mes-rdv : seul ce corps changera au branchement. */
const recupererRdv = async(): Promise<RendezVousClient[]> => {
  const reponse = await api.get<{data: RendezVousClient[]}>("/rdv/mes-rdv")
  return reponse.data;
}

/** Même contrat que POST /api/rdv/{id}/annuler, corps `{ motif? }`. */
const  annulerRdv = async(id: string, motif: string): Promise<void> => {
  const response = await api.post<{data: void}>(`/rdv/${id}/annuler`,{ motif });
  return response.data;
}

/** Même contrat que POST /api/avis, corps `{ rdv_id, note, commentaire? }`. */
const envoyerAvis = async(
  rdvId: string,
  note: number,
  commentaire: string
): Promise<void> => {
  const response = await api.post<{data: void}>("/avis", {rdv_id: rdvId, note, commentaire});
  return response.data;
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PageRdv() {
  const [rdvs, setRdvs] = useState<RendezVousClient[]>([]);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererRdv().then((liste) => {
      if (annule) return;
      setRdvs(liste);
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

  /**
   * Le back trie tout en `date_heure` DESC, à venir et passés confondus. On
   * coupe le flux en deux et on INVERSE le tri des rendez-vous à venir : sur ce
   * qui est devant soi, c'est le plus proche qui compte, pas le plus lointain.
   * L'historique, lui, garde l'ordre décroissant — le plus récent en tête.
   */
  const { aVenir, passes } = useMemo(() => {
    const parDate = (a: RendezVousClient, b: RendezVousClient) =>
      new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime();

    return {
      aVenir: rdvs.filter(estAVenir).sort(parDate),
      passes: rdvs.filter((rdv) => !estAVenir(rdv)).sort((a, b) => parDate(b, a)),
    };
  }, [rdvs]);

  const traiterAnnulation = async (id: string, motif: string) => {
    await annulerRdv(id, motif);

    setRdvs((liste) =>
      liste.map((rdv) =>
        rdv.id === id
          ? { ...rdv, statut: "annulé" as const, motif: motif || null }
          : rdv
      )
    );
  };

  const traiterAvis = async (
    rdvId: string,
    note: number,
    commentaire: string
  ) => {
    await envoyerAvis(rdvId, note, commentaire);

    // `has_avis` se calcule sur le couple (client, VENDEUR) : noter une fois
    // éteint le bouton sur TOUS les rendez-vous passés avec ce même vendeur.
    const vendeurId = rdvs.find((rdv) => rdv.id === rdvId)?.vendeur_id;

    setRdvs((liste) =>
      liste.map((rdv) =>
        rdv.vendeur_id === vendeurId ? { ...rdv, has_avis: true } : rdv
      )
    );
  };

  if (chargement) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-4 h-5 w-96" />
        <div className="mt-10 space-y-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full" />
          ))}
        </div>
      </main>
    );
  }

  if (rdvs.length === 0) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <section className="rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarCheck className="size-7" />
          </span>
          <h1 className="mt-6 font-heading text-2xl font-bold">
            Aucun rendez-vous
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Depuis la fiche d&apos;un véhicule, proposez un créneau au vendeur
            pour une visite ou un essai. Il confirme, et le rendez-vous apparaît
            ici.
          </p>
          <Link
            href="/vehicules"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
          >
            <Search className="size-4" />
            Trouver un véhicule
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Mes rendez-vous
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {aVenir.length > 0
              ? `${aVenir.length} rendez-vous à venir. La rencontre a lieu hors plateforme : aucun paiement ne transite par Move CI.`
              : "Aucun rendez-vous devant vous pour l'instant. Votre historique est plus bas."}
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      {aVenir.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <CalendarCheck className="size-5 text-primary" />
            À venir
            <span className="text-base font-normal tabular-nums text-muted-foreground">
              {aVenir.length}
            </span>
          </h2>

          <ol className="mt-6">
            {aVenir.map((rdv, index) => (
              <LigneRdv
                key={rdv.id}
                rdv={rdv}
                dernier={index === aVenir.length - 1}
                // seul le premier de la liste ascendante porte l'or
                prochain={index === 0}
                delai={index * 70}
                onAnnuler={traiterAnnulation}
                onNoter={traiterAvis}
              />
            ))}
          </ol>
        </section>
      )}

      {passes.length > 0 && (
        <section className="mt-14">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <History className="size-5 text-muted-foreground" />
            Historique
            <span className="text-base font-normal tabular-nums text-muted-foreground">
              {passes.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Après une rencontre terminée, votre avis aide les prochains acheteurs
            à choisir.
          </p>

          <ol className="mt-6">
            {passes.map((rdv, index) => (
              <LigneRdv
                key={rdv.id}
                rdv={rdv}
                dernier={index === passes.length - 1}
                delai={Math.min(index, 6) * 70}
                onAnnuler={traiterAnnulation}
                onNoter={traiterAvis}
              />
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
