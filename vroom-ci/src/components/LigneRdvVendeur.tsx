"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, Check, Clock, MapPin, MessageCircle, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cn,
  formaterHeure,
  initiales,
  tempsRelatif,
  urlPhoto,
} from "@/lib/utils";
import {
  estAConfirmer,
  estAnnulable,
  estTerminable,
  LIBELLES_TYPE_RDV,
  STYLE_STATUT_RDV,
} from "@/lib/rdv";
import { libelleVehicule, photoPrincipale } from "@/lib/vehicule";
import type { RendezVousVendeur } from "@/types";
import { toast } from "sonner";

/**
 * Une entrée de la frise de /vendeur/rdv. Miroir visuel de `LigneRdv` (côté
 * client), mais les actions divergent : ici le vendeur répond à une demande
 * (confirmer/refuser) ou clôt une rencontre passée (terminer) — jamais de
 * panneau d'avis, un vendeur ne note pas ses clients.
 */
export type LigneRdvVendeurProps = {
  rdv: RendezVousVendeur;
  /** Coupe le rail vertical sous la dernière entrée d'une section. */
  dernier: boolean;
  /** Le prochain rendez-vous vivant : le seul à porter l'or. */
  prochain?: boolean;
  /** Décalage d'apparition en ms, pour l'entrée en cascade de la frise. */
  delai?: number;
  onConfirmer: (id: string) => Promise<void>;
  onRefuser: (id: string) => Promise<void>;
  onAnnuler: (id: string, motif: string) => Promise<void>;
  onTerminer: (id: string) => Promise<void>;
};

type PanneauOuvert = "aucun" | "annulation";

const LigneRdvVendeur = ({
  rdv,
  dernier,
  prochain = false,
  delai = 0,
  onConfirmer,
  onRefuser,
  onAnnuler,
  onTerminer,
}: LigneRdvVendeurProps) => {
  const [panneau, setPanneau] = useState<PanneauOuvert>("aucun");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const date = new Date(rdv.date_heure);
  const statut = STYLE_STATUT_RDV[rdv.statut];
  const photo = photoPrincipale(rdv.vehicule.photos);
  const libelle = libelleVehicule(rdv.vehicule.description, rdv.vehicule.id);

  const soumettre = async (action: () => Promise<void>, messageSucces: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await action();
      setPanneau("aucun");
      toast.success(messageSucces);
    } catch {
      setErreur("L'opération a échoué. Réessayez dans un instant.");
      toast.error("L'opération a échoué. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <li
      // fill-mode-backwards : sans lui, la ligne est visible pendant tout son délai d'attente
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex gap-3 duration-500 sm:gap-4"
      style={{ animationDelay: `${delai}ms` }}
    >
      {/* bloc date : capitales étroites, chiffre en display — l'idiome d'un agenda */}
      <div className="w-12 shrink-0 pt-1 text-center sm:w-14">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date)}
        </p>
        <p
          className={cn(
            "font-heading text-2xl font-bold tabular-nums leading-tight",
            prochain && "text-primary"
          )}
        >
          {date.getDate()}
        </p>
        <p className="text-[11px] uppercase text-muted-foreground">
          {new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date)}
        </p>
      </div>

      {/* rail : le trait est en flex-1, il s'étire donc à la hauteur de la carte voisine */}
      <div className="hidden w-3 shrink-0 flex-col items-center sm:flex">
        <span
          className={cn(
            "mt-2 size-3 shrink-0 rounded-full border-2",
            prochain
              ? "border-primary bg-primary"
              : "border-border bg-background"
          )}
        />
        {!dernier && <span className="w-px flex-1 bg-border" />}
      </div>

      <div className={cn("min-w-0 flex-1", !dernier && "pb-6")}>
        <div
          className={cn(
            "rounded-2xl border p-4 transition-colors sm:p-5",
            prochain ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statut.classes}>{statut.libelle}</Badge>
            <span className="text-sm font-semibold">
              {LIBELLES_TYPE_RDV[rdv.type]}
            </span>
            {prochain && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Clock className="size-3.5" />
                {tempsRelatif(rdv.date_heure)}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {photo ? (
                // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
                <img
                  src={urlPhoto(photo.path)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground">
                  <Car className="size-5" />
                </span>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="truncate font-heading text-base font-bold">
                <Link
                  href={`/vehicules/${rdv.vehicule.id}`}
                  className="transition-colors hover:text-primary"
                >
                  {libelle}
                </Link>
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {formaterHeure(rdv.date_heure)}
                </span>
                {/* `lieu` est nullable : sans ce repli, "null" s'afficherait */}
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{rdv.lieu ?? "Lieu à convenir"}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {initiales(rdv.client.fullname)}
            </span>
            <span className="min-w-0 truncate text-sm font-medium">
              {rdv.client.fullname}
            </span>
          </div>

          {/* le motif n'est renseigné qu'au moment d'annuler */}
          {rdv.motif && (
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Motif : </span>
              {rdv.motif}
            </p>
          )}

          {erreur && (
            <p role="status" className="mt-3 text-sm text-destructive">
              {erreur}
            </p>
          )}

          {panneau === "aucun" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {estAConfirmer(rdv) && (
                <>
                  <button
                    type="button"
                    disabled={envoi}
                    onClick={() => soumettre(() => onConfirmer(rdv.id), "Rendez-vous confirmé.")}
                    className={cn(buttonVariants({ size: "sm" }), "effet-action")}
                  >
                    <Check className="size-4" />
                    Confirmer
                  </button>
                  <button
                    type="button"
                    disabled={envoi}
                    onClick={() => soumettre(() => onRefuser(rdv.id), "Rendez-vous refusé.")}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-destructive hover:bg-destructive/10 hover:text-destructive"
                    )}
                  >
                    <X className="size-4" />
                    Refuser
                  </button>
                </>
              )}

              {estTerminable(rdv) && (
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => soumettre(() => onTerminer(rdv.id), "Rendez-vous marqué terminé.")}
                  className={cn(buttonVariants({ size: "sm" }), "effet-action")}
                >
                  <Check className="size-4" />
                  Marquer terminé
                </button>
              )}

              {(estAConfirmer(rdv) || estTerminable(rdv)) && (
                <Link
                  href="/messages"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "effet-action"
                  )}
                >
                  <MessageCircle className="size-4" />
                  Contacter
                </Link>
              )}

              {estAnnulable(rdv) && (
                <button
                  type="button"
                  onClick={() => setPanneau("annulation")}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "text-destructive hover:bg-destructive/10 hover:text-destructive"
                  )}
                >
                  <X className="size-4" />
                  Annuler
                </button>
              )}
            </div>
          )}

          {panneau === "annulation" && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <Label htmlFor={`motif-${rdv.id}`} className="text-sm font-semibold">
                Pourquoi annulez-vous ?
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Facultatif, 500 caractères maximum. Le client recevra ce message
                avec la notification d&apos;annulation.
              </p>
              <Input
                id={`motif-${rdv.id}`}
                value={motif}
                onChange={(evenement) => setMotif(evenement.target.value)}
                maxLength={500}
                placeholder="Véhicule retiré, indisponibilité…"
                className="mt-3 bg-background"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => soumettre(() => onAnnuler(rdv.id, motif), "Rendez-vous annulé.")}
                  className={cn(
                    buttonVariants({ variant: "destructive", size: "sm" }),
                    "effet-action"
                  )}
                >
                  {envoi ? "Annulation…" : "Confirmer l'annulation"}
                </button>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => setPanneau("aucun")}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Garder le rendez-vous
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default LigneRdvVendeur;
