"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import BoutonRecharger from "@/components/BoutonRecharger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterFcfa } from "@/lib/utils";
import type { Alerte } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   MES ALERTES (CLIENT) — /client/alertes
   Miroir de AlerteController (vroom-backend, routes/api.php:107-112).
   Une alerte n'est PAS liée à une annonce précise : marque/modèle/prix max/
   carburant, tous facultatifs (au moins un requis à la création — déjà géré
   par DialogueAlertePrix.tsx, sur la carte véhicule).
   ──────────────────────────────────────────────────────────────────────────── */

/** Même contrat que GET /alertes. */
const recupererMesAlertes = async (): Promise<Alerte[]> => {
  const reponse = await api.get<{ data: Alerte[] }>("alertes");
  return reponse.data;
};

/** Le résumé d'une alerte : "Toyota RAV4" si les deux sont renseignés, l'un des deux seul, ou "Tous les véhicules". */
const libelleAlerte = (alerte: Alerte): string => {
  const parties = [alerte.marque_cible, alerte.modele_cible].filter(Boolean);
  return parties.length > 0 ? parties.join(" ") : "Tous les véhicules";
};

const PageMesAlertes = () => {
  const [alertes, setAlertes] = useState<Alerte[] | undefined>(undefined);
  const [rechargement, setRechargement] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [idEnCours, setIdEnCours] = useState<string | null>(null);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => {
    let annule = false;

    recupererMesAlertes().then((liste) => {
      if (annule) return;
      setAlertes(liste);
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

  const basculerActive = async (alerte: Alerte) => {
    if (idEnCours) return;
    setIdEnCours(alerte.id);

    try {
      const reponse = await api.put<{ data: Alerte }>(`alertes/${alerte.id}`, {
        active: !alerte.active,
      });
      setAlertes((liste) => liste?.map((a) => (a.id === alerte.id ? reponse.data : a)));
      toast.success(reponse.data.active ? "Alerte réactivée." : "Alerte mise en pause.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "L'action a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  const confirmerSuppression = async () => {
    if (!idASupprimer) return;
    setSuppressionEnCours(true);

    try {
      await api.delete(`alertes/${idASupprimer}`);
      setAlertes((liste) => liste?.filter((a) => a.id !== idASupprimer));
      setIdASupprimer(null);
      toast.success("Alerte supprimée.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "La suppression a échoué."));
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const alerteASupprimer = alertes?.find((a) => a.id === idASupprimer);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Mes alertes</h1>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Vous êtes prévenu dès qu&apos;une annonce correspond à vos critères.
      </p>

      {alertes === undefined ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : alertes.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellRing className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold">Aucune alerte pour l&apos;instant</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Créez une alerte depuis le menu options d&apos;une annonce pour être prévenu quand son prix baisse.
          </p>
          <Link href="/vehicules" className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}>
            Parcourir les véhicules
          </Link>
        </section>
      ) : (
        <ul className="mt-6 space-y-3">
          {alertes.map((alerte) => (
            <li
              key={alerte.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-5"
            >
              <div className="min-w-0">
                <p className="font-heading text-base font-bold">{libelleAlerte(alerte)}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {alerte.prix_max && <span>Jusqu&apos;à {formaterFcfa(Number(alerte.prix_max))}</span>}
                  {alerte.carburant && <span className="capitalize">{alerte.carburant}</span>}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Badge
                  className={
                    alerte.active
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }
                >
                  {alerte.active ? "Active" : "En pause"}
                </Badge>

                <button
                  type="button"
                  onClick={() => basculerActive(alerte)}
                  disabled={idEnCours === alerte.id}
                  aria-label={alerte.active ? "Mettre en pause" : "Réactiver"}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {alerte.active ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIdASupprimer(alerte.id)}
                  aria-label="Supprimer"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={idASupprimer !== null} onOpenChange={(ouvert) => !ouvert && setIdASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette alerte ?</AlertDialogTitle>
            <AlertDialogDescription>
              {alerteASupprimer && libelleAlerte(alerteASupprimer)} — cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={suppressionEnCours} onClick={confirmerSuppression}>
              {suppressionEnCours ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default PageMesAlertes;
