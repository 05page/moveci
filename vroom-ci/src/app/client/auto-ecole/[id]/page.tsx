"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  MessageCircle,
  Star,
  Users,
  X,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { estErreurAuth } from "@/lib/erreurs";
import { cn, formaterFcfa, initiales } from "@/lib/utils";
import { ICONE_PERMIS, LIBELLE_PERMIS, STYLE_STATUT_ELEVE } from "@/lib/formation";
import type { FormationCatalogue, InscriptionFormationClient } from "@/types";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`. */
type ParametresPage = { params: Promise<{ id: string }> };

/** Même contrat que GET /api/formations/{id} : `null` sur un 404 (formation retirée/inexistante/pas encore validée). */
const recupererFormationFiche = async (id: string): Promise<FormationCatalogue | null> => {
  try {
    const reponse = await api.get<{ data: FormationCatalogue }>(`formations/${id}`);
    return reponse.data;
  } catch {
    return null;
  }
};

/** GET /api/formations/mes-inscriptions échoue en 401 pour un visiteur non connecté : pas d'inscription trouvée alors. */
const recupererMonInscription = async (
  formationId: string
): Promise<InscriptionFormationClient | null> => {
  try {
    const reponse = await api.get<{ data: InscriptionFormationClient[] }>(
      "formations/mes-inscriptions"
    );
    return reponse.data.find((i) => i.formation_id === formationId) ?? null;
  } catch {
    return null;
  }
};

export default function PageFicheFormation({ params }: ParametresPage) {
  const { id } = use(params);
  // `key={id}` démonte/remonte FicheFormation à chaque changement d'id : plus
  // simple et plus sûr qu'un reset manuel de l'état dans un useEffect.
  return <FicheFormation key={id} id={id} />;
}

function FicheFormation({ id }: { id: string }) {
  const router = useRouter();
  const [formation, setFormation] = useState<FormationCatalogue | null | undefined>(
    undefined
  );
  const [inscription, setInscription] = useState<InscriptionFormationClient | null>(null);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  // distinct de `formation === undefined` : un rechargement manuel garde l'ancienne
  // fiche affichée pendant l'appel, seule l'icône du bouton tourne
  const [rechargement, setRechargement] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    Promise.all([recupererFormationFiche(id), recupererMonInscription(id)]).then(
      ([resultat, monInscription]) => {
        if (annule) return;
        setFormation(resultat);
        setInscription(monInscription);
        setRechargement(false);
      }
    );

    return () => {
      annule = true;
    };
  }, [id, tentative]);

  const recharger = () => {
    setRechargement(true);
    setTentative((t) => t + 1);
  };

  const sInscrire = async () => {
    setEnCours(true);
    setErreur(null);

    try {
      await api.post<{ message: string }>(`formations/${id}/inscrire`);
      setInscription({
        id: crypto.randomUUID(),
        formation_id: id,
        statut_eleve: "préinscrit",
        date_examen: null,
        reussite: null,
        created_at: new Date().toISOString(),
      });
      toast.success("Préinscription enregistrée.");
    } catch (erreurRequete) {
      if (estErreurAuth(erreurRequete) && erreurRequete.status === 401) {
        router.push("/auth");
        return;
      }
      const message = estErreurAuth(erreurRequete)
        ? erreurRequete.message
        : "Impossible de vous préinscrire pour le moment.";
      setErreur(message);
      toast.error(message);
    } finally {
      setEnCours(false);
    }
  };

  const annuler = async () => {
    setEnCours(true);
    setErreur(null);

    try {
      await api.delete<{ message: string }>(`formations/${id}/inscrire`);
      setInscription(null);
      toast.success("Préinscription annulée.");
    } catch (erreurRequete) {
      const message = estErreurAuth(erreurRequete)
        ? erreurRequete.message
        : "Impossible d'annuler votre préinscription.";
      setErreur(message);
      toast.error(message);
    } finally {
      setEnCours(false);
    }
  };

  if (formation === undefined) return <SkeletonFiche />;
  if (formation === null) return <FicheIntrouvable />;

  const Icone = ICONE_PERMIS[formation.type_permis];
  const note = formation.auto_ecole.note_moyenne
    ? Number(formation.auto_ecole.note_moyenne)
    : null;

  const specs = [
    { libelle: "Type de permis", valeur: `${formation.type_permis} — ${LIBELLE_PERMIS[formation.type_permis]}` },
    { libelle: "Durée", valeur: `${formation.duree_heures}h` },
    formation.lieu && { libelle: "Lieu", valeur: formation.lieu },
    formation.nombre_places != null && {
      libelle: "Places",
      valeur: String(formation.nombre_places),
    },
  ].filter((spec): spec is { libelle: string; valeur: string } => Boolean(spec));

  // seule une préinscription fraîche peut encore être annulée — au-delà,
  // l'auto-école a commencé à traiter le dossier (InscriptionFormation::annulationBloquee())
  const annulationPossible = inscription?.statut_eleve === "préinscrit";

  return (
    <main className="relative mx-auto w-full max-w-6xl flex-1 overflow-hidden px-5 py-10">
      {/* filigrane pleine page : les deux mêmes icônes que sur la carte catalogue, mais à l'échelle
          de la page entière — posées directement sur <main>, pas dans une petite div isolée */}
      <GraduationCap
        aria-hidden
        strokeWidth={1}
        className="pointer-events-none absolute -left-24 -top-24 size-112 rotate-12 text-primary/5"
      />
      <Icone
        aria-hidden
        strokeWidth={1}
        className="pointer-events-none absolute -bottom-32 -right-24 size-128 -rotate-12 text-primary/5"
      />

      {/* relative : tout le vrai contenu doit peindre AU-DESSUS des icônes ci-dessus malgré leur faible opacité */}
      <div className="relative">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/client/auto-ecole"
          className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour aux formations
        </Link>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
        <div>
          <header>
            <Link
              href={`/client/auto-ecole/profile/${formation.auto_ecole.id}`}
              className="group inline-flex items-center gap-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initiales(formation.auto_ecole.fullname)}
              </span>
              <span className="text-sm text-muted-foreground">
                Proposée par{" "}
                <span className="lien-anime font-semibold text-foreground group-hover:text-primary">
                  {formation.auto_ecole.fullname}
                </span>
              </span>
              {note !== null && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="size-3.5 fill-primary text-primary" />
                  {note.toFixed(1)}
                </span>
              )}
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                Permis {formation.type_permis}
              </Badge>
              <Badge variant="outline">{LIBELLE_PERMIS[formation.type_permis]}</Badge>
            </div>

            <h1 className="mt-3 font-heading text-3xl font-bold">{formation.titre}</h1>

            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-3.5" />
              {formation.inscriptions_count.toLocaleString("fr-FR")} inscrit
              {formation.inscriptions_count > 1 ? "s" : ""}
            </p>
          </header>

          {/* pas de photo côté formation : l'icône du type de permis sert de vignette, comme sur la carte du catalogue */}
          <div
            className="relative mt-6 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-muted"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, color-mix(in oklch, var(--primary) 8%, transparent) 0px, color-mix(in oklch, var(--primary) 8%, transparent) 2px, transparent 2px, transparent 14px)",
            }}
          >
            <span className="flex size-28 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icone className="size-14" />
            </span>
          </div>

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

          <section className="mt-8">
            <h2 className="font-heading text-lg font-bold">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
              {formation.description}
            </p>
          </section>

          {formation.deroulement && (
            <section className="mt-8">
              <h2 className="font-heading text-lg font-bold">Déroulement</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                {formation.deroulement}
              </p>
            </section>
          )}
        </div>

        <aside className="mt-8 space-y-5 lg:sticky lg:top-20 lg:mt-0">
          <div className="rounded-2xl border border-border p-5">
            <p className="font-heading text-2xl font-bold tabular-nums">
              {formaterFcfa(Number(formation.prix))}
            </p>

            {erreur && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                <X className="mt-0.5 size-3.5 shrink-0" />
                {erreur}
              </p>
            )}

            {inscription ? (
              <>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <span className="text-sm font-medium">Votre statut</span>
                  <Badge className={STYLE_STATUT_ELEVE[inscription.statut_eleve].classes}>
                    {STYLE_STATUT_ELEVE[inscription.statut_eleve].libelle}
                  </Badge>
                </div>
                {annulationPossible && (
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={annuler}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "effet-action mt-3 w-full"
                    )}
                  >
                    {enCours ? "Annulation…" : "Annuler ma préinscription"}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                disabled={enCours}
                onClick={sInscrire}
                className={cn(buttonVariants(), "effet-action mt-5 w-full")}
              >
                <GraduationCap className="size-4" />
                {enCours ? "Préinscription…" : "Se préinscrire"}
              </button>
            )}

            <Link href="/messages" className={cn(buttonVariants({ variant: "outline" }), "effet-action mt-2 w-full")}>
              <MessageCircle className="size-4" />
              Contacter l&apos;auto-école
            </Link>
          </div>
        </aside>
      </div>
      </div>
    </main>
  );
}

function SkeletonFiche() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <Skeleton className="h-5 w-40" />
      <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
        <div>
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="mt-8 h-9 w-2/3" />
          <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="mt-8 h-56 w-full rounded-2xl lg:mt-0" />
      </div>
    </main>
  );
}

function FicheIntrouvable() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <section className="rounded-2xl border border-border p-12 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin className="size-7" />
        </span>
        <h1 className="mt-6 font-heading text-2xl font-bold">Cette formation est introuvable</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Elle a peut-être été retirée, ou l&apos;adresse est incorrecte.
        </p>
        <Link
          href="/client/auto-ecole"
          className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
        >
          Retour aux formations
        </Link>
      </section>
    </main>
  );
}
