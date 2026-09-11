"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  GraduationCap,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
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
import { cn, formaterFcfa, initiales, urlPhoto } from "@/lib/utils";
import type { FormationAdmin, StatutFormation, StatutValidationFormation } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   FICHE FORMATION (ADMIN) — /admin/formations/[id]
   Contrairement à /admin/parc-auto/[id] (qui doit fouiller GET /admin/vehicules
   faute d'endpoint dédié), cette fiche a sa propre route : GET
   /admin/formations/{id} (AdminController::formation()).
   ──────────────────────────────────────────────────────────────────────────── */

const STYLE_VALIDATION_FORMATION: Record<
  StatutValidationFormation,
  { libelle: string; classes: string }
> = {
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  validé: { libelle: "Validée", classes: "bg-accent text-accent-foreground" },
  rejeté: { libelle: "Rejetée", classes: "bg-destructive/10 text-destructive" },
};

const STYLE_STATUT_FORMATION: Record<StatutFormation, { libelle: string; classes: string }> = {
  disponible: { libelle: "Disponible", classes: "bg-accent text-accent-foreground" },
  retiree: { libelle: "Retirée", classes: "bg-destructive/10 text-destructive" },
};

type ParametresPage = { params: Promise<{ id: string }> };

/** Même contrat que GET /admin/formations/{id} : `null` si la formation n'existe pas (404). */
const recupererFormationAdmin = async (id: string): Promise<FormationAdmin | null> => {
  try {
    const reponse = await api.get<{ data: FormationAdmin }>(`admin/formations/${id}`);
    return reponse.data;
  } catch {
    return null;
  }
};

const validerFormationAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/formations/${id}/valider`);
};

const rejeterFormationAdmin = async (id: string, motif: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/formations/${id}/rejeter`, { motif });
};

const retirerFormationAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/formations/${id}/retirer`);
};

const restaurerFormationAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/formations/${id}/restaurer`);
};

const PageFormationAdmin = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <FicheFormationAdmin key={id} id={id} />;
};

export default PageFormationAdmin;

const FicheFormationAdmin = ({ id }: { id: string }) => {
  const [formation, setFormation] = useState<FormationAdmin | null | undefined>(undefined);
  const [tentative, setTentative] = useState(0);
  // distinct de `formation === undefined` : un rechargement manuel garde l'ancienne fiche affichée
  const [rechargement, setRechargement] = useState(false);
  const [idEnCours, setIdEnCours] = useState(false);
  const [dialogueRejet, setDialogueRejet] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");

  useEffect(() => {
    let annule = false;

    recupererFormationAdmin(id).then((resultat) => {
      if (annule) return;
      setFormation(resultat);
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

  if (formation === undefined) return <SkeletonFiche />;
  if (formation === null) return <FicheIntrouvable />;

  const valider = async () => {
    setIdEnCours(true);
    try {
      await validerFormationAdmin(id);
      setFormation((f) => f && { ...f, statut_validation: "validé" });
      toast.success("Formation validée.");
    } catch (e) {
      toast.error(messageErreur(e, "La validation a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const confirmerRejet = async () => {
    setIdEnCours(true);
    try {
      await rejeterFormationAdmin(id, motifRejet);
      setFormation((f) => f && { ...f, statut_validation: "rejeté" });
      setDialogueRejet(false);
      setMotifRejet("");
      toast.success("Formation rejetée.");
    } catch (e) {
      toast.error(messageErreur(e, "Le rejet a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const retirer = async () => {
    setIdEnCours(true);
    try {
      await retirerFormationAdmin(id);
      setFormation((f) => f && { ...f, statut: "retiree" });
      toast.success("Formation retirée.");
    } catch (e) {
      toast.error(messageErreur(e, "Le retrait a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const restaurer = async () => {
    setIdEnCours(true);
    try {
      await restaurerFormationAdmin(id);
      setFormation((f) => f && { ...f, statut: "disponible" });
      toast.success("Formation restaurée.");
    } catch (e) {
      toast.error(messageErreur(e, "La restauration a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const specs = [
    { libelle: "Permis", valeur: formation.type_permis },
    { libelle: "Durée", valeur: `${formation.duree_heures} h` },
    { libelle: "Lieu", valeur: formation.lieu },
    { libelle: "Places", valeur: `${formation.inscriptions_count}/${formation.nombre_places}` },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/formations"
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
              href={`/admin/utilisateurs/${formation.auto_ecole.id}`}
              className="group inline-flex items-center gap-2.5"
            >
              {formation.auto_ecole.avatar ? (
                <img
                  src={urlPhoto(formation.auto_ecole.avatar)}
                  alt=""
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initiales(formation.auto_ecole.fullname)}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Publiée par{" "}
                <span className="lien-anime font-semibold text-foreground group-hover:text-primary">
                  {formation.auto_ecole.fullname}
                </span>
              </span>
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge className={STYLE_VALIDATION_FORMATION[formation.statut_validation].classes}>
                {STYLE_VALIDATION_FORMATION[formation.statut_validation].libelle}
              </Badge>
              <Badge className={STYLE_STATUT_FORMATION[formation.statut].classes}>
                {STYLE_STATUT_FORMATION[formation.statut].libelle}
              </Badge>
            </div>

            <h1 className="mt-3 font-heading text-3xl font-bold">{formation.titre}</h1>
          </header>

          <div className="relative mt-6 flex aspect-[21/9] items-center justify-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
            <GraduationCap className="size-16" />
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

          {formation.description && (
            <section className="mt-8">
              <h2 className="font-heading text-lg font-bold">Description</h2>
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
                {formation.description}
              </p>
            </section>
          )}

          {formation.deroulement && (
            <section className="mt-8">
              <h2 className="font-heading text-lg font-bold">Déroulement</h2>
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
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
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {formation.inscriptions_count} inscrit{formation.inscriptions_count > 1 ? "s" : ""}
            </p>

            <div className="mt-5 space-y-2 border-t border-border pt-5">
              {formation.statut_validation === "en_attente" && (
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

              {formation.statut_validation === "validé" && (
                <>
                  {formation.statut === "disponible" ? (
                    <button
                      type="button"
                      disabled={idEnCours}
                      onClick={retirer}
                      className={cn(buttonVariants({ variant: "outline" }), "effet-action w-full")}
                    >
                      <Ban className="size-4" />
                      Retirer du catalogue
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={idEnCours}
                      onClick={restaurer}
                      className={cn(buttonVariants(), "effet-action w-full")}
                    >
                      <RotateCcw className="size-4" />
                      Restaurer
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Rejet : le back exige un motif (`motif`, requis, 500 caractères max) */}
      <Dialog open={dialogueRejet} onOpenChange={setDialogueRejet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter cette formation</DialogTitle>
            <DialogDescription>{formation.titre} — le motif est transmis à l&apos;auto-école.</DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="motif-rejet">Motif</Label>
            <Textarea
              id="motif-rejet"
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              maxLength={500}
              placeholder="Programme incomplet, tarif incohérent…"
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
    </main>
  );
};

const SkeletonFiche = () => (
  <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
    <Skeleton className="h-5 w-40" />
    <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
      <div>
        <Skeleton className="aspect-[21/9] w-full rounded-2xl" />
        <Skeleton className="mt-8 h-9 w-2/3" />
        <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
      </div>
      <Skeleton className="mt-8 h-56 w-full rounded-2xl lg:mt-0" />
    </div>
  </main>
);

const FicheIntrouvable = () => (
  <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
    <section className="rounded-2xl border border-border p-12 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <GraduationCap className="size-7" />
      </span>
      <h1 className="mt-6 font-heading text-2xl font-bold">Cette formation est introuvable</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Elle a peut-être été supprimée, ou l&apos;adresse est incorrecte.
      </p>
      <Link
        href="/admin/formations"
        className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
      >
        Retour aux formations
      </Link>
    </section>
  </main>
);
