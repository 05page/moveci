"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Car, MapPin, Phone, Star } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteFormationCatalogue from "@/components/CarteFormationCatalogue";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formaterFcfa, formaterMoisAnnee, initiales, LIBELLES_ROLE, urlPhoto } from "@/lib/utils";
import { libelleVehicule, photoPrincipale, STYLE_STATUT } from "@/lib/vehicule";
import type { ProfilPublic } from "@/types";


type ProfileContentProps = {
  userId: string;
  /** Racine du lien vers une fiche véhicule — défaut `/vehicules` (public). `/admin/parc-auto` pour l'admin. */
  basePathVehicule?: string;
};

/** Même contrat que GET /api/users/{id}/profil : seul ce corps changera au branchement. */
const recupererProfilPublic = async (id: string): Promise<ProfilPublic> => {
  const reponse = await api.get<{ data: ProfilPublic }>(`users/${id}/profil`);
  return reponse.data;
};

const ProfileContent = ({ userId, basePathVehicule = "/vehicules" }: ProfileContentProps) => {
  const router = useRouter();
  const [donnees, setDonnees] = useState<ProfilPublic | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererProfilPublic(userId).then((resultat) => {
      if (annule) return;
      setDonnees(resultat);
      setChargement(false);
    });

    return () => {
      annule = true;
    };
  }, [userId, tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  if (chargement || !donnees) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="mt-8 h-64 w-full" />
      </main>
    );
  }

  const { vendeur, vehicules, formations, avis } = donnees;
  // note_moyenne/nb_avis/vehicules/formations/avis sont forcés à 0/[] côté back pour un client — les afficher ferait croire à un compte mal noté
  const estVendeurPublic = vendeur.role !== "client";
  // un auto_ecole ne publie jamais de véhicule (règle métier, voir parc-auto/page.tsx) : la section
  // "offre" montre ses formations à la place, jamais les deux en même temps
  const estAutoEcole = vendeur.role === "auto_ecole";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        {/* router.back() et non un href fixe : ce composant est monté sur 3 routes différentes, chacune avec son propre point de départ */}
        <button
          type="button"
          onClick={() => router.back()}
          className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour
        </button>
        <BoutonRecharger onClick={recharger} chargement={chargement} />
      </div>

      <section className="mt-6 rounded-2xl border border-border p-6 sm:p-8">
        <div className="flex items-center gap-5">
          {/* <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns de next.config.ts */}
          {vendeur.avatar ? (
            <img
              src={vendeur.avatar}
              alt=""
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground">
              {initiales(vendeur.fullname)}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-bold md:text-3xl">
                {vendeur.fullname}
              </h1>
              <Badge variant="secondary">{LIBELLES_ROLE[vendeur.role]}</Badge>
            </div>

            {estVendeurPublic && (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                  <Star className="size-4 fill-primary text-primary" />
                  {vendeur.note_moyenne.toFixed(1)}
                  <span className="font-normal text-muted-foreground">
                    ({vendeur.nb_avis} avis)
                  </span>
                </span>
                {vendeur.adresse && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {vendeur.adresse}
                  </span>
                )}
                {vendeur.telephone && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-3.5" />
                    {vendeur.telephone}
                  </span>
                )}
              </p>
            )}

            <p className="mt-1 text-sm text-muted-foreground">
              Membre depuis {formaterMoisAnnee(vendeur.membre_since)}
            </p>
          </div>
        </div>
      </section>

      {estVendeurPublic && estAutoEcole && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold">Formations proposées</h2>

          {formations.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
              Aucune formation en ligne pour l&apos;instant.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {formations.map((formation, index) => (
                <CarteFormationCatalogue
                  key={formation.id}
                  formation={formation}
                  delai={Math.min(index, 6) * 60}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {estVendeurPublic && !estAutoEcole && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold">Véhicules disponibles</h2>

          {vehicules.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
              Aucune annonce en ligne pour l&apos;instant.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {vehicules.map((vehicule) => {
                const photo = photoPrincipale(vehicule.photos);
                const libelle = libelleVehicule(vehicule.description, vehicule.id);
                const statut = STYLE_STATUT[vehicule.statut];

                return (
                  <Link
                    key={vehicule.id}
                    href={`${basePathVehicule}/${vehicule.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border transition-colors hover:border-primary"
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-muted">
                      {photo ? (
                        // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
                        <img
                          src={urlPhoto(photo.path)}
                          alt=""
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-muted-foreground">
                          <Car className="size-8" />
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <p className="truncate font-semibold transition-colors group-hover:text-primary">
                        {libelle}
                      </p>
                      <p className="font-heading text-lg font-bold tabular-nums">
                        {/* Number() obligatoire : `prix` est une string, un + concatènerait */}
                        {formaterFcfa(Number(vehicule.prix))}
                        {vehicule.post_type === "location" && (
                          <span className="text-sm font-normal text-muted-foreground"> / jour</span>
                        )}
                      </p>
                      <Badge className={`w-fit ${statut.classes}`}>{statut.libelle}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {estVendeurPublic && (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold">Avis</h2>

          {avis.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
              Aucun avis pour l&apos;instant.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {avis.map((unAvis) => (
                <li key={unAvis.id} className="rounded-2xl border border-border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{unAvis.client.fullname}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                      <Star className="size-4 fill-primary text-primary" />
                      {unAvis.note}
                    </span>
                  </div>
                  {unAvis.commentaire && (
                    <p className="mt-2 text-sm text-muted-foreground">{unAvis.commentaire}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formaterMoisAnnee(unAvis.date_avis)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
};

export default ProfileContent;
