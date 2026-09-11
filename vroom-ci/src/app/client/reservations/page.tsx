"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, Clock } from "lucide-react";

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
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterFcfa, joursRestants } from "@/lib/utils";
import { libelleVehicule } from "@/lib/vehicule";
import type { Reservation, StatutReservation } from "@/types";

const STYLE_STATUT_RESERVATION: Record<StatutReservation, { libelle: string; classes: string }> = {
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  confirmee: { libelle: "Confirmée", classes: "bg-accent text-accent-foreground" },
  annulee: { libelle: "Annulée", classes: "bg-destructive/10 text-destructive" },
  expiree: { libelle: "Expirée", classes: "bg-destructive/10 text-destructive" },
};

/** Même contrat que GET /reservations. */
const recupererMesReservations = async (): Promise<Reservation[]> => {
  const reponse = await api.get<{ data: Reservation[] }>("reservations")
  return reponse.data
};

const PageMesReservations = () => {
  const [reservations, setReservations] = useState<Reservation[] | undefined>(undefined);
  const [rechargement, setRechargement] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);
  const [idEnCours, setIdEnCours] = useState(false);

  useEffect(() => {
    let annule = false;

    recupererMesReservations().then((liste) => {
      if (annule) return;
      setReservations(liste);
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

  const confirmerAnnulation = async () => {
    if (!idASupprimer) return;
    setIdEnCours(true);
    try {
      await api.post(`reservations/${idASupprimer}/cancel`);
      setReservations((liste) =>
        liste?.map((r) => (r.id === idASupprimer ? { ...r, statut: "annulee" } : r))
      );
      setIdASupprimer(null);
      toast.success("Réservation annulée.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "L'annulation a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const reservationASupprimer = reservations?.find((r) => r.id === idASupprimer);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Mes réservations</h1>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Les véhicules « à venir » que vous avez mis de côté en attendant leur disponibilité.
      </p>

      {reservations === undefined ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Car className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold">Aucune réservation</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Réservez un véhicule « à venir » depuis sa fiche pour le retrouver ici.
          </p>
          <Link href="/vehicules" className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}>
            Parcourir les véhicules
          </Link>
        </section>
      ) : (
        <ul className="mt-6 space-y-3">
          {reservations.map((reservation) => {
            const libelle = libelleVehicule(
              reservation.vehicule.description,
              reservation.vehicule.id
            );

            return (
              <li
                key={reservation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/vehicules/${reservation.vehicule.id}`}
                    className="lien-anime font-heading text-base font-bold hover:text-primary"
                  >
                    {libelle}
                  </Link>
                  <p className="mt-1 font-heading text-sm font-bold tabular-nums">
                    {formaterFcfa(Number(reservation.vehicule.prix))}
                  </p>
                  {reservation.statut === "en_attente" && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      Expire dans {joursRestants(reservation.expires_at)} jour
                      {joursRestants(reservation.expires_at) > 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Badge className={STYLE_STATUT_RESERVATION[reservation.statut].classes}>
                    {STYLE_STATUT_RESERVATION[reservation.statut].libelle}
                  </Badge>

                  {reservation.statut === "en_attente" && (
                    <button
                      type="button"
                      onClick={() => setIdASupprimer(reservation.id)}
                      className="lien-anime text-sm font-medium text-destructive hover:text-destructive/80"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={idASupprimer !== null} onOpenChange={(ouvert) => !ouvert && setIdASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {reservationASupprimer &&
                libelleVehicule(reservationASupprimer.vehicule.description, reservationASupprimer.vehicule.id)}
              {" "}— au-delà de 2 annulations sur le même véhicule, vous ne pourrez plus le réserver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={idEnCours} onClick={confirmerAnnulation}>
              {idEnCours ? "Annulation…" : "Annuler la réservation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default PageMesReservations;
