"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, History } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import LigneRdvVendeur from "@/components/LigneRdvVendeur";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { estAVenir } from "@/lib/rdv";
import type { RendezVousVendeur } from "@/types";

/* Même page que /vendeur/rdv, montée sous /partenaire/concessionnaire pour hériter du
   layout partenaire (sidebar). Aucun lien codé en dur à adapter ici. */

/** Même contrat que GET /api/rdv/nos-rdv : seul ce corps changera au branchement. */
const recupererRdv = async (): Promise<RendezVousVendeur[]> => {
  const reponse = await api.get<{ data: RendezVousVendeur[] }>("rdv/nos-rdv");
  return reponse.data;
};

/** Même contrat que POST /api/rdv/{id}/confirmer. */
const confirmerRdv = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`rdv/${id}/confirmer`);
};

/** Même contrat que POST /api/rdv/{id}/refuser. */
const refuserRdv = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`rdv/${id}/refuser`);
};

/** Même contrat que POST /api/rdv/{id}/annuler, corps `{ motif? }`. */
const annulerRdv = async (id: string, motif: string): Promise<void> => {
  await api.post<{ message: string }>(`rdv/${id}/annuler`, { motif });
};

/** Même contrat que POST /api/rdv/{id}/terminer — ouvre aussi une TransactionConclue côté back. */
const terminerRdv = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`rdv/${id}/terminer`);
};

const PageRdvConcessionnaire = () => {
  const [rdvs, setRdvs] = useState<RendezVousVendeur[]>([]);
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
    const parDate = (a: RendezVousVendeur, b: RendezVousVendeur) =>
      new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime();

    return {
      aVenir: rdvs.filter(estAVenir).sort(parDate),
      passes: rdvs.filter((rdv) => !estAVenir(rdv)).sort((a, b) => parDate(b, a)),
    };
  }, [rdvs]);

  const majStatut = (id: string, statut: RendezVousVendeur["statut"], motif?: string) => {
    setRdvs((liste) =>
      liste.map((rdv) =>
        rdv.id === id
          ? { ...rdv, statut, ...(motif !== undefined ? { motif: motif || null } : {}) }
          : rdv
      )
    );
  };

  const traiterConfirmer = async (id: string) => {
    await confirmerRdv(id);
    majStatut(id, "confirmé");
  };

  const traiterRefuser = async (id: string) => {
    await refuserRdv(id);
    majStatut(id, "refusé");
  };

  const traiterAnnulation = async (id: string, motif: string) => {
    await annulerRdv(id, motif);
    majStatut(id, "annulé", motif);
  };

  const traiterTerminer = async (id: string) => {
    await terminerRdv(id);
    majStatut(id, "terminé");
  };

  if (chargement) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-10">
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
      <main className="mx-auto w-full max-w-4xl px-5 py-10">
        <section className="rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarCheck className="size-7" />
          </span>
          <h1 className="mt-6 font-heading text-2xl font-bold">
            Aucun rendez-vous
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Les demandes de vos clients apparaîtront ici dès qu&apos;ils
            proposent un créneau depuis une de vos annonces.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Rendez-vous reçus
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {aVenir.length > 0
              ? `${aVenir.length} rendez-vous à traiter ou à venir. La rencontre a lieu hors plateforme : aucun paiement ne transite par Move CI.`
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
              <LigneRdvVendeur
                key={rdv.id}
                rdv={rdv}
                dernier={index === aVenir.length - 1}
                // seul le premier de la liste ascendante porte l'or
                prochain={index === 0}
                delai={index * 70}
                onConfirmer={traiterConfirmer}
                onRefuser={traiterRefuser}
                onAnnuler={traiterAnnulation}
                onTerminer={traiterTerminer}
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

          <ol className="mt-6">
            {passes.map((rdv, index) => (
              <LigneRdvVendeur
                key={rdv.id}
                rdv={rdv}
                dernier={index === passes.length - 1}
                delai={Math.min(index, 6) * 70}
                onConfirmer={traiterConfirmer}
                onRefuser={traiterRefuser}
                onAnnuler={traiterAnnulation}
                onTerminer={traiterTerminer}
              />
            ))}
          </ol>
        </section>
      )}
    </main>
  );
};

export default PageRdvConcessionnaire;
