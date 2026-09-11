"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, formaterDateHeure } from "@/lib/utils";
import { libelleVehicule } from "@/lib/vehicule";
import type { Signalement, StatutSignalement } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   MES SIGNALEMENTS (CLIENT) — /client/signalements
   Miroir de SignalementController::mesSignalements() (routes/api.php:117).
   Lecture seule : aucune route ne permet de modifier/retirer un signalement
   une fois envoyé, seul l'admin agit dessus (traiterSignalement).
   ──────────────────────────────────────────────────────────────────────────── */

const STYLE_STATUT_SIGNALEMENT: Record<StatutSignalement, { libelle: string; classes: string }> = {
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  traité: { libelle: "Traité", classes: "bg-accent text-accent-foreground" },
  rejeté: { libelle: "Rejeté", classes: "bg-destructive/10 text-destructive" },
};

/** Même contrat que GET /signalements/mes-signalements. */
const recupererMesSignalements = async (): Promise<Signalement[]> => {
  const reponse = await api.get<{ data: Signalement[] }>("signalements/mes-signalements");
  return reponse.data;
};

/** La cible affichée : le libellé du véhicule, le nom du compte, ou un repli si la cible a été supprimée depuis. */
const libelleCible = (signalement: Signalement): string => {
  if (signalement.cible_vehicule) {
    return libelleVehicule(signalement.cible_vehicule.description, signalement.cible_vehicule.id);
  }
  if (signalement.cible_user) {
    return signalement.cible_user.fullname;
  }
  return "Cible supprimée";
};

const PageMesSignalements = () => {
  const [signalements, setSignalements] = useState<Signalement[] | undefined>(undefined);
  const [rechargement, setRechargement] = useState(false);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let annule = false;

    recupererMesSignalements().then((liste) => {
      if (annule) return;
      setSignalements(liste);
      setRechargement(false);
    });

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setRechargement(true);
    setTentative((t) => t + 1);
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Mes signalements</h1>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Le suivi de ce que vous avez signalé, et où ça en est.
      </p>

      {signalements === undefined ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : signalements.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Flag className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold">Aucun signalement</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Un doute sur une annonce ou un compte ? Signalez-le depuis son menu options.
          </p>
          <Link href="/vehicules" className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}>
            Parcourir les véhicules
          </Link>
        </section>
      ) : (
        <ul className="mt-6 space-y-3">
          {signalements.map((signalement) => (
            <li key={signalement.id} className="rounded-2xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-base font-bold">{libelleCible(signalement)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {signalement.motif} · {formaterDateHeure(signalement.date_signalement)}
                  </p>
                </div>
                <Badge className={cn("shrink-0", STYLE_STATUT_SIGNALEMENT[signalement.statut].classes)}>
                  {STYLE_STATUT_SIGNALEMENT[signalement.statut].libelle}
                </Badge>
              </div>

              {signalement.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {signalement.description}
                </p>
              )}

              {signalement.note_admin && (
                <div className="mt-4 rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Réponse de l&apos;équipe
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{signalement.note_admin}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};

export default PageMesSignalements;
