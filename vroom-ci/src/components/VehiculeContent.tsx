"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Car, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

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
import { api } from "@/lib/api";
import { cn, formaterDateCourte, formaterFcfa, urlPhoto } from "@/lib/utils";
import { libelleVehicule, STYLE_DOCUMENT, STYLE_HISTORIQUE, STYLE_STATUT } from "@/lib/vehicule";
import type { StatutDocument, VehiculeFiche } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   MA FICHE VÉHICULE — contenu partagé entre /vendeur/vehicule/[id] et
   /partenaire/concessionnaire/vehicule/[id] : GET /vehicules/mon-vehicule/{id}
   (VehiculesController::monVehicule(), routes/api.php:80) scope déjà la
   requête sur `created_by = user.id`, quel que soit le rôle (vendeur,
   concessionnaire, auto_ecole) — le composant ignore totalement d'où il est
   monté, comme ProfileContent.
   Pas de modération ici (valider/rejeter/suspendre) — c'est le rôle de
   /admin/parc-auto/[id], une page distincte avec son propre endpoint.
   ──────────────────────────────────────────────────────────────────────────── */

type VehiculeContentProps = {
  id: string;
  /** Omis : le bouton "Modifier" disparaît (concessionnaire n'a pas encore de flux d'édition). */
  basePathModifier?: string;
};

/**
 * Même contrat que GET /vehicules/mon-vehicule/{id}, ramené à `null` en cas
 * d'erreur : monVehicule() n'a PAS de catch dédié à ModelNotFoundException
 * (contrairement à AdminController::vehicule()) — un id inexistant OU
 * appartenant à un autre compte renvoie donc un 500 générique, pas un 404.
 * api.get() throw dans les deux cas : on capture tout ici pour uniformiser
 * sur `null`, traité par FicheIntrouvable plus bas.
 */
const recupererMonVehicule = async (id: string): Promise<VehiculeFiche | null> => {
  try {
    const reponse = await api.get<{ data: VehiculeFiche }>(`vehicules/mon-vehicule/${id}`);
    return reponse.data;
  } catch {
    return null;
  }
};

/** Même contrat que DELETE /vehicules/{id} (VehiculesController::deleteVehicule). */
const supprimerMonVehicule = async (id: string): Promise<void> => {
  await api.delete<{ message: string }>(`vehicules/${id}`);
};

const VehiculeContent = ({ id, basePathModifier }: VehiculeContentProps) => {
  const router = useRouter();
  const [vehicule, setVehicule] = useState<VehiculeFiche | null | undefined>(undefined);
  const [photoActive, setPhotoActive] = useState(0);
  const [tentative, setTentative] = useState(0);
  // distinct de `vehicule === undefined` : un rechargement manuel garde l'ancienne fiche affichée
  const [rechargement, setRechargement] = useState(false);
  const [idEnCours, setIdEnCours] = useState(false);
  const [dialogueSuppression, setDialogueSuppression] = useState(false);

  useEffect(() => {
    let annule = false;

    recupererMonVehicule(id).then((resultat) => {
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

  const confirmerSuppression = async () => {
    setIdEnCours(true);
    try {
      await supprimerMonVehicule(id);
      router.back();
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
        {/* router.back() et non un href fixe : ce composant est monté sur plusieurs routes différentes, chacune avec son propre point de départ */}
        <button
          type="button"
          onClick={() => router.back()}
          className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour
        </button>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
        <div>
          <header>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge className={STYLE_STATUT[vehicule.statut].classes}>
                {STYLE_STATUT[vehicule.statut].libelle}
              </Badge>
            </div>

            <h1 className="mt-3 font-heading text-3xl font-bold">{libelle}</h1>
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
              {basePathModifier && (
                <Link
                  href={`${basePathModifier}/${id}/modifier`}
                  className={cn(buttonVariants(), "effet-action w-full")}
                >
                  <Pencil className="size-4" />
                  Modifier
                </Link>
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

      {/* Suppression : simple confirmation, pas de champ à saisir */}
      <AlertDialog open={dialogueSuppression} onOpenChange={setDialogueSuppression}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              {libelle} — cette action est définitive, l&apos;annonce ne peut pas être restaurée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={idEnCours} onClick={confirmerSuppression}>
              {idEnCours ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default VehiculeContent;

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

const FicheIntrouvable = () => {
  const router = useRouter();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <section className="rounded-2xl border border-border p-12 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Car className="size-7" />
        </span>
        <h1 className="mt-6 font-heading text-2xl font-bold">Ce véhicule est introuvable</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Il a peut-être été supprimé, ou l&apos;adresse est incorrecte.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
        >
          Retour
        </button>
      </section>
    </main>
  );
};
