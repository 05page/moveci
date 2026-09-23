"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookmarkPlus,
  CalendarClock,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react";

import BadgeEcartPrix from "@/components/BadgeEcartPrix";
import BoutonRecharger from "@/components/BoutonRecharger";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, messageErreur } from "@/lib/api";
import { estErreurAuth } from "@/lib/erreurs";
import { cn, formaterDateCourte, formaterFcfa, initiales, urlPhoto } from "@/lib/utils";
import { libelleVehicule, STYLE_DOCUMENT, STYLE_HISTORIQUE } from "@/lib/vehicule";
import type { Favori, StatutDocument, VehiculeFiche } from "@/types";
import RdvDialogue from "@/components/RdvDialogue";
import { toast } from "sonner";

type FicheVehiculeContentProps = {
  id: string;
  /** Racine du lien vers le profil du vendeur — défaut `/vendeurs` (public). */
  basePathVendeur?: string;

  avecActionsAcheteur?: boolean;
};

/** Même contrat que GET /api/vehicules/{id} : `null` sur un 404 (annonce retirée/vendue/inexistante). */
const recupererVehiculeFiche = async (id: string): Promise<VehiculeFiche | null> => {
  try {
    const reponse = await api.get<{ data: VehiculeFiche }>(`vehicules/${id}`);
    return reponse.data;
  } catch {
    return null;
  }
};

/** GET /api/favoris échoue en 401 pour un visiteur non connecté : le cœur part alors non coché. */
const estDejaFavori = async (vehiculeId: string): Promise<boolean> => {
  try {
    const reponse = await api.get<{ data: Favori[] }>("favoris");
    return reponse.data.some((favori) => favori.vehicule_id === vehiculeId);
  } catch {
    return false;
  }
};

const FicheVehiculeContent = ({
  id,
  basePathVendeur = "/vendeurs",
  avecActionsAcheteur = true,
}: FicheVehiculeContentProps) => {
  const router = useRouter();
  const [vehicule, setVehicule] = useState<VehiculeFiche | null | undefined>(undefined);
  const [photoActive, setPhotoActive] = useState(0);
  const [estFavori, setEstFavori] = useState(false);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  // distinct de `vehicule === undefined` : un rechargement manuel garde l'ancienne
  // fiche affichée pendant l'appel, seule l'icône du bouton tourne
  const [rechargement, setRechargement] = useState(false);
  const [reservationEnCours, setReservationEnCours] = useState(false);
  const [reservationFaite, setReservationFaite] = useState(false);
  const [erreur, setErreur] = useState("")
  const [erreurReservation, setErreurReservation] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let annule = false;

    Promise.all([recupererVehiculeFiche(id), estDejaFavori(id)]).then(([resultat, favori]) => {
      if (annule) return;
      setVehicule(resultat);
      setEstFavori(favori);
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

  const basculerFavori = async () => {
    const dejaFavori = estFavori;
    setEstFavori(!dejaFavori);

    try {
      if (dejaFavori) {
        await api.delete<{ message: string }>(`favoris/${id}`);
      } else {
        await api.post<{ message: string }>(`favoris/${id}`);
      }
      toast.success(dejaFavori ? "Retiré des favoris." : "Ajouté aux favoris.");
    } catch (erreur) {
      setEstFavori(dejaFavori);

      // pas de session : direction la connexion plutôt qu'un cœur qui ne "prend" jamais
      if (estErreurAuth(erreur) && erreur.status === 401) {
        router.push("/auth");
        return;
      }
      toast.error(messageErreur(erreur, "L'action a échoué."));
    }
  };

  /** POST /reservations (ReservationController::store) — rejette déjà en 422/403 le self-reserve, le doublon, un statut ≠ "a_venir". */
  const reserverVehicule = async () => {
    if (reservationEnCours || reservationFaite) return;
    setReservationEnCours(true);
    setErreurReservation(null);

    try {
      await api.post("reservations", { vehicule_id: id });
      setReservationFaite(true);
      toast.success("Réservation effectuée.");
    } catch (erreurCatch) {
      if (estErreurAuth(erreurCatch) && erreurCatch.status === 401) {
        router.push("/auth");
        return;
      }
      const message = messageErreur(erreurCatch, "La réservation a échoué.");
      setErreurReservation(message);
      toast.error(message);
    } finally {
      setReservationEnCours(false);
    }
  };

  if (vehicule === undefined) return <SkeletonFiche />;
  if (vehicule === null) return <FicheIntrouvable />;

  const description = vehicule.description;
  const libelle = libelleVehicule(description, vehicule.id);
  const photos = vehicule.photos;
  const estLocation = vehicule.post_type === "location";
  const photo = photos[photoActive] ?? photos[0];

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
            <Link
              href={`${basePathVendeur}/${vehicule.creator.id}`}
              className="group inline-flex items-center gap-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initiales(vehicule.creator.fullname)}
              </span>
              <span className="text-sm text-muted-foreground">
                Proposé par{" "}
                <span className="lien-anime font-semibold text-foreground group-hover:text-primary">
                  {vehicule.creator.fullname}
                </span>
              </span>
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  estLocation ? "bg-background text-foreground" : "bg-primary text-primary-foreground"
                )}
              >
                {estLocation ? "Location" : "Vente"}
              </Badge>
              {vehicule.type === "neuf" && (
                <Badge className="bg-accent text-accent-foreground">Neuf</Badge>
              )}
            </div>

            <h1 className="mt-3 font-heading text-3xl font-bold">{libelle}</h1>

            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="size-3.5" />
              {vehicule.views_count.toLocaleString("fr-FR")} vue
              {vehicule.views_count > 1 ? "s" : ""}
            </p>
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

            {vehicule.statut === "a_venir" && (
              <Badge className="absolute left-4 top-4 gap-1 bg-foreground text-background">
                <Clock className="size-3" />
                Bientôt disponible
              </Badge>
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
              {estLocation && (
                <span className="text-sm font-normal text-muted-foreground"> / jour</span>
              )}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {vehicule.negociable && <Badge variant="outline">Négociable</Badge>}
              <BadgeEcartPrix prix={vehicule.prix} prixSuggere={vehicule.prix_suggere} />
            </div>

            {avecActionsAcheteur && (
              <>
                {vehicule.statut === "a_venir" && (
                  <>
                    <button
                      type="button"
                      onClick={reserverVehicule}
                      disabled={reservationEnCours || reservationFaite}
                      className={cn(buttonVariants(), "effet-action mt-5 w-full")}
                    >
                      <BookmarkPlus className="size-4" />
                      {reservationFaite
                        ? "Réservé"
                        : reservationEnCours
                          ? "Réservation..."
                          : "Réserver ce véhicule"}
                    </button>
                    {reservationFaite && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Retrouvez cette réservation sur{" "}
                        <Link href="/client/reservations" className="lien-anime font-medium text-foreground">
                          Mes réservations
                        </Link>
                        .
                      </p>
                    )}
                    {erreurReservation && (
                      <p className="mt-2 text-xs text-destructive">{erreurReservation}</p>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={basculerFavori}
                  aria-pressed={estFavori}
                  className={cn(buttonVariants({ variant: "outline" }), "effet-action mt-5 w-full")}
                >
                  <Heart className={cn("size-4", estFavori && "fill-current text-primary")} />
                  {estFavori ? "Dans vos favoris" : "Ajouter aux favoris"}
                </button>

                <Link href="/messages" className={cn(buttonVariants(), "effet-action mt-2 w-full")}>
                  <MessageCircle className="size-4" />
                  Contacter le vendeur
                </Link>

                {/* durk */}
                <Button
                  onClick={() => setIsOpen(true)}
                  className={cn(buttonVariants({ variant: "outline" }), "effet-action mt-2 w-full")}
                >
                  <CalendarClock className="size-4" />
                  Prendre rendez-vous
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>
      {/* ÉTAPE 4 — Ajoute `vehiculeId={vehicule.id}` ici : `vehicule` est garanti non-null à
          ce stade du composant (les deux `return` anticipés lignes 135-136 l'ont déjà écarté). */}
      <RdvDialogue
        open={isOpen}
        onOpenChange={setIsOpen}
        vehiculeId={vehicule.id}
        date=""
        type=""
        motif=""
      />
    </main>

  );
};

export default FicheVehiculeContent;

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
          L&apos;annonce a peut-être été retirée, vendue, ou l&apos;adresse est incorrecte.
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
