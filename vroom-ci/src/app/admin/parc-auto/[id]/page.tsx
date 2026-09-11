"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  XCircle,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import {
  cn,
  formaterDateCourte,
  formaterFcfa,
  initiales,
  LIBELLES_ROLE,
  urlPhoto,
} from "@/lib/utils";
import {
  libelleVehicule,
  STYLE_DOCUMENT,
  STYLE_HISTORIQUE,
  STYLE_STATUT,
  STYLE_VALIDATION,
} from "@/lib/vehicule";
import type { StatutDocument, VehiculeAdmin } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   FICHE VÉHICULE (ADMIN) — /admin/parc-auto/[id]
   Pas d'endpoint dédié GET admin/vehicules/{id} côté back : on réutilise
   GET /admin/vehicules (AdminController::vehicules(), sans filtre de statut/
   validation) et on cherche l'id côté front — même limite que /admin/parc-auto,
   dont cette page est le prolongement (moderation inline plutôt qu'un menu).
   ──────────────────────────────────────────────────────────────────────────── */

type ParametresPage = { params: Promise<{ id: string }> };

/** Même contrat que GET /admin/vehicules : `null` si aucun véhicule de la liste n'a cet id. */
const recupererVehiculeAdmin = async (id: string): Promise<VehiculeAdmin | null> => {
  const reponse = await api.get<{ data: VehiculeAdmin[] }>("admin/vehicules");
  return reponse.data.find((vehicule) => vehicule.id === id) ?? null;
};

/** Même contrat que POST /admin/vehicules/{id}/valider. */
const validerVehiculeAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/vehicules/${id}/valider`);
};

/** Même contrat que POST /admin/vehicules/{id}/rejeter, corps `{ details }` requis. */
const rejeterVehiculeAdmin = async (id: string, details: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/vehicules/${id}/rejeter`, { details });
};

/** Même contrat que POST /admin/vehicules/{id}/suspendre. */
const suspendreVehiculeAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/vehicules/${id}/suspendre`);
};

/** Même contrat que DELETE /admin/vehicules/{id}. */
const supprimerVehiculeAdmin = async (id: string): Promise<void> => {
  await api.delete<{ message: string }>(`admin/vehicules/${id}`);
};

const PageVehiculeAdmin = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <FicheVehiculeAdmin key={id} id={id} />;
};

export default PageVehiculeAdmin;

const FicheVehiculeAdmin = ({ id }: { id: string }) => {
  const router = useRouter();
  const [vehicule, setVehicule] = useState<VehiculeAdmin | null | undefined>(undefined);
  const [photoActive, setPhotoActive] = useState(0);
  const [tentative, setTentative] = useState(0);
  // distinct de `vehicule === undefined` : un rechargement manuel garde l'ancienne fiche affichée
  const [rechargement, setRechargement] = useState(false);
  const [idEnCours, setIdEnCours] = useState(false);
  const [dialogueRejet, setDialogueRejet] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");
  const [dialogueSuppression, setDialogueSuppression] = useState(false);

  useEffect(() => {
    let annule = false;

    recupererVehiculeAdmin(id).then((resultat) => {
      if (annule) return;
      setVehicule(resultat);
      setRechargement(false);
    });

    return () => {
      annule = true;
    };
  }, [id, tentative]);

  const recharger = () => {
    setRechargement(true);
    setTentative((t) => t + 1);
  };

  if (vehicule === undefined) return <SkeletonFiche />;
  if (vehicule === null) return <FicheIntrouvable />;

  const description = vehicule.description;
  const libelle = libelleVehicule(description, vehicule.id);
  const photos = vehicule.photos;
  const photo = photos[photoActive] ?? photos[0];

  const valider = async () => {
    setIdEnCours(true);
    try {
      await validerVehiculeAdmin(id);
      setVehicule((v) => v && { ...v, status_validation: "validee" });
      toast.success("Véhicule validé.");
    } catch (e) {
      toast.error(messageErreur(e, "La validation a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const confirmerRejet = async () => {
    setIdEnCours(true);
    try {
      await rejeterVehiculeAdmin(id, motifRejet);
      setVehicule((v) => v && { ...v, status_validation: "rejetee", description_validation: motifRejet });
      setDialogueRejet(false);
      setMotifRejet("");
      toast.success("Véhicule rejeté.");
    } catch (e) {
      toast.error(messageErreur(e, "Le rejet a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const suspendre = async () => {
    setIdEnCours(true);
    try {
      await suspendreVehiculeAdmin(id);
      setVehicule((v) => v && { ...v, statut: "suspendu" });
      toast.success("Véhicule suspendu.");
    } catch (e) {
      toast.error(messageErreur(e, "La suspension a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const confirmerSuppression = async () => {
    setIdEnCours(true);
    try {
      await supprimerVehiculeAdmin(id);
      toast.success("Véhicule supprimé.");
      router.push("/admin/parc-auto");
    } catch (e) {
      toast.error(messageErreur(e, "La suppression a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const specs = (
    description
      ? [
          description.annee && { libelle: "Année", valeur: String(description.annee) },
          description.kilometrage != null && {
            libelle: "Kilométrage",
            valeur: `${description.kilometrage.toLocaleString("fr-FR")} km`,
          },
          description.carburant && { libelle: "Carburant", valeur: description.carburant },
          description.transmission && { libelle: "Transmission", valeur: description.transmission },
          description.carrosserie && { libelle: "Carrosserie", valeur: description.carrosserie },
          description.couleur && { libelle: "Couleur", valeur: description.couleur },
          description.nombre_portes != null && {
            libelle: "Portes",
            valeur: String(description.nombre_portes),
          },
          description.nombre_places != null && {
            libelle: "Places",
            valeur: String(description.nombre_places),
          },
        ]
      : []
  ).filter((spec): spec is { libelle: string; valeur: string } => Boolean(spec));

  type DocumentAffiche = { libelle: string; statut: StatutDocument; date: string | null };

  const documents = (
    description
      ? [
          {
            libelle: "Visite technique",
            statut: description.visite_technique,
            date: description.date_visite_technique,
          },
          { libelle: "Carte grise", statut: description.carte_grise, date: description.date_carte_grise },
          { libelle: "Assurance", statut: description.assurance, date: null },
        ]
      : []
  ).filter((doc): doc is DocumentAffiche => doc.statut !== null);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/parc-auto"
          className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour au parc auto
        </Link>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
        <div>
          <header>
            <Link
              href={`/admin/utilisateurs/${vehicule.creator.id}`}
              className="group inline-flex items-center gap-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initiales(vehicule.creator.fullname)}
              </span>
              <span className="text-sm text-muted-foreground">
                Publié par{" "}
                <span className="lien-anime font-semibold text-foreground group-hover:text-primary">
                  {vehicule.creator.fullname}
                </span>{" "}
                · {LIBELLES_ROLE[vehicule.creator.role]}
              </span>
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge className={STYLE_STATUT[vehicule.statut].classes}>
                {STYLE_STATUT[vehicule.statut].libelle}
              </Badge>
              <Badge className={STYLE_VALIDATION[vehicule.status_validation].classes}>
                {STYLE_VALIDATION[vehicule.status_validation].libelle}
              </Badge>
            </div>

            <h1 className="mt-3 font-heading text-3xl font-bold">{libelle}</h1>

            {/* motif de rejet, saisi par un admin au moment de rejeter() */}
            {vehicule.status_validation === "rejetee" && vehicule.description_validation && (
              <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <span className="font-semibold text-destructive">Motif du rejet : </span>
                {vehicule.description_validation}
              </p>
            )}
          </header>

          <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl bg-muted">
            {photo ? (
              // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
              <img src={urlPhoto(photo.path)} alt={libelle} className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <Car className="size-16" />
              </span>
            )}

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoActive((i) => (i - 1 + photos.length) % photos.length)}
                  aria-label="Photo précédente"
                  className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur hover:text-primary"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoActive((i) => (i + 1) % photos.length)}
                  aria-label="Photo suivante"
                  className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur hover:text-primary"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>

          {photos.length > 1 && (
            <div className="sans-barre-scroll mt-3 flex gap-2 overflow-x-auto">
              {photos.map((p, index) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhotoActive(index)}
                  aria-current={index === photoActive}
                  aria-label={`Photo ${index + 1}`}
                  className={cn(
                    "size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                    index === photoActive
                      ? "border-primary"
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={urlPhoto(p.path)} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {specs.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-border p-5 sm:grid-cols-4">
              {specs.map((spec) => (
                <div key={spec.libelle}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {spec.libelle}
                  </dt>
                  <dd className="mt-1 font-heading text-base font-bold">{spec.valeur}</dd>
                </div>
              ))}
            </dl>
          )}

          {description?.equipements && description.equipements.length > 0 && (
            <section className="mt-8">
              <h2 className="font-heading text-lg font-bold">Équipements</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {description.equipements.map((equipement) => (
                  <Badge key={equipement} variant="outline">
                    {equipement}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {(documents.length > 0 || description?.historique_accidents) && (
            <section className="mt-8">
              <h2 className="font-heading text-lg font-bold">Papiers &amp; historique</h2>
              <div className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.libelle}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <span className="text-sm font-medium">{doc.libelle}</span>
                    <span className="flex items-center gap-2">
                      {doc.date && (
                        <span className="text-xs text-muted-foreground">
                          {formaterDateCourte(doc.date)}
                        </span>
                      )}
                      <Badge className={STYLE_DOCUMENT[doc.statut].classes}>
                        {STYLE_DOCUMENT[doc.statut].libelle}
                      </Badge>
                    </span>
                  </div>
                ))}

                {description?.historique_accidents && (
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <span className="text-sm font-medium">Historique accidents</span>
                    <Badge className={STYLE_HISTORIQUE[description.historique_accidents].classes}>
                      {STYLE_HISTORIQUE[description.historique_accidents].libelle}
                    </Badge>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="mt-8 space-y-5 lg:sticky lg:top-20 lg:mt-0">
          <div className="rounded-2xl border border-border p-5">
            <p className="font-heading text-2xl font-bold tabular-nums">
              {formaterFcfa(Number(vehicule.prix))}
              {vehicule.post_type === "location" && (
                <span className="text-sm font-normal text-muted-foreground"> / jour</span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Publié le {formaterDateCourte(vehicule.created_at)} ·{" "}
              {vehicule.views_count.toLocaleString("fr-FR")} vues
            </p>

            <div className="mt-5 space-y-2 border-t border-border pt-5">
              {vehicule.status_validation === "en_attente" && (
                <>
                  <button
                    type="button"
                    disabled={idEnCours}
                    onClick={valider}
                    className={cn(buttonVariants(), "effet-action w-full")}
                  >
                    <CheckCircle2 className="size-4" />
                    Valider
                  </button>
                  <button
                    type="button"
                    disabled={idEnCours}
                    onClick={() => {
                      setDialogueRejet(true);
                      setMotifRejet("");
                    }}
                    className={cn(buttonVariants({ variant: "outline" }), "effet-action w-full")}
                  >
                    <XCircle className="size-4" />
                    Rejeter
                  </button>
                </>
              )}

              {vehicule.statut !== "suspendu" && (
                <button
                  type="button"
                  disabled={idEnCours}
                  onClick={suspendre}
                  className={cn(buttonVariants({ variant: "outline" }), "effet-action w-full")}
                >
                  <Ban className="size-4" />
                  Suspendre
                </button>
              )}

              <button
                type="button"
                disabled={idEnCours}
                onClick={() => setDialogueSuppression(true)}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "effet-action w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                )}
              >
                <Trash2 className="size-4" />
                Supprimer
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Rejet : le back exige un motif (`details`, requis, 500 caractères max) */}
      <Dialog open={dialogueRejet} onOpenChange={setDialogueRejet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter cette annonce</DialogTitle>
            <DialogDescription>{libelle} — le motif est transmis au vendeur.</DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="motif-rejet">Motif</Label>
            <Textarea
              id="motif-rejet"
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              maxLength={500}
              placeholder="Photos non conformes, kilométrage incohérent…"
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogueRejet(false)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={motifRejet.trim().length === 0 || idEnCours}
              onClick={confirmerRejet}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {idEnCours ? "Rejet…" : "Rejeter"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression : simple confirmation, pas de champ à saisir */}
      <AlertDialog open={dialogueSuppression} onOpenChange={setDialogueSuppression}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              {libelle} — l&apos;annonce quitte le parc auto. Cette action reste
              réversible depuis la corbeille.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={idEnCours} onClick={confirmerSuppression}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

const SkeletonFiche = () => (
  <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
    <Skeleton className="h-5 w-40" />
    <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
      <div>
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="mt-8 h-9 w-2/3" />
        <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
      </div>
      <Skeleton className="mt-8 h-72 w-full rounded-2xl lg:mt-0" />
    </div>
  </main>
);

const FicheIntrouvable = () => (
  <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
    <section className="rounded-2xl border border-border p-12 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Car className="size-7" />
      </span>
      <h1 className="mt-6 font-heading text-2xl font-bold">Ce véhicule est introuvable</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Il a peut-être été supprimé, ou l&apos;adresse est incorrecte.
      </p>
      <Link
        href="/admin/parc-auto"
        className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
      >
        Retour au parc auto
      </Link>
    </section>
  </main>
);
