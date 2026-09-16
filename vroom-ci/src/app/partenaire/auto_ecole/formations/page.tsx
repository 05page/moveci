"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookPlus,
  Clock,
  Eye,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

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
import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterDateCourte, formaterFcfa } from "@/lib/utils";
import {
  ICONE_PERMIS,
  LIBELLE_PERMIS,
  STYLE_STATUT_FORMATION,
  STYLE_STATUT_VALIDATION_FORMATION,
} from "@/lib/formation";
import type { FormationAutoEcole, StatsAutoEcole } from "@/types";

type DonneesFormations = {
  stats: StatsAutoEcole;
  formations: FormationAutoEcole[];
};

const recupererDonnees = async (): Promise<DonneesFormations> => {
  const [reponseStats, reponseFormations] = await Promise.all([
    api.get<{ data: StatsAutoEcole }>("formations/mes-stats"),
    api.get<{ data: FormationAutoEcole[] }>("formations/mes-formations"),
  ]);

  return { stats: reponseStats.data, formations: reponseFormations.data };
};

/** Même contrat que DELETE /formations/{id} (FormationController::destroy). */
const supprimerFormation = (id: string): Promise<void> =>
  api.delete<{ message: string }>(`formations/${id}`).then(() => undefined);

type DialogueConfirmation = { formation: FormationAutoEcole };

export default function PageFormationsAutoEcole() {
  const [donnees, setDonnees] = useState<DonneesFormations | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  const [idEnCours, setIdEnCours] = useState<string | null>(null);
  const [dialogueConfirmation, setDialogueConfirmation] = useState<DialogueConfirmation | null>(null);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererDonnees().then((resultat) => {
      if (annule) return;
      setDonnees(resultat);
      setChargement(false);
    });

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  const confirmerAction = async () => {
    if (!dialogueConfirmation) return;
    const { formation } = dialogueConfirmation;
    setIdEnCours(formation.id);
    try {
      await supprimerFormation(formation.id);
      // ajuste les stats localement : nb_formations et total_inscrits comptaient encore cette formation
      setDonnees((actuel) =>
        actuel && {
          stats: {
            ...actuel.stats,
            nb_formations: actuel.stats.nb_formations - 1,
            total_inscrits: actuel.stats.total_inscrits - formation.inscriptions_count,
          },
          formations: actuel.formations.filter((f) => f.id !== formation.id),
        }
      );
      setDialogueConfirmation(null);
      toast.success("Formation supprimée.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "La suppression a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  if (chargement || !donnees) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-9 w-40" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <Skeleton className="mt-12 h-64 w-full" />
      </main>
    );
  }

  const { stats, formations } = donnees;
  const stockVide = stats.nb_formations === 0;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Formation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos formations publiées et leur performance.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/partenaire/auto_ecole/post-formation"
            className={cn(buttonVariants(), "effet-action")}
          >
            <BookPlus className="size-4" />
            Publier une formation
          </Link>
          <BoutonRecharger onClick={recharger} chargement={chargement} />
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteStat
          libelle="Formations en ligne"
          valeur={stats.nb_formations}
          icone={GraduationCap}
          precision="Validées et disponibles"
        />
        <CarteStat
          libelle="Élèves inscrits"
          valeur={stats.total_inscrits}
          icone={Users}
          precision="Toutes formations confondues"
        />
        <CarteStat
          libelle="En cours"
          valeur={stats.en_cours}
          icone={Clock}
          precision="Formation démarrée, examen à venir"
        />
        <CarteStat
          libelle="Taux de réussite"
          valeur={stats.taux_reussite !== null ? `${stats.taux_reussite}%` : "—"}
          icone={Trophy}
          precision={
            stats.taux_reussite !== null
              ? `${stats.reussis} réussite(s) sur ${stats.termines} terminée(s)`
              : "Aucune formation terminée pour l'instant"
          }
        />
      </section>

      {stockVide ? (
        <section className="mt-12 rounded-2xl border border-border p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookPlus className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">
            Votre première formation vous attend
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Titre, type de permis, durée et prix : comptez 5 minutes. La formation part en ligne
            dès qu&apos;un administrateur l&apos;a validée.
          </p>
          <Link
            href="/partenaire/auto_ecole/post-formation"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
          >
            <BookPlus className="size-4" />
            Publier une formation
          </Link>
        </section>
      ) : (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold">Toutes vos formations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formations.length} formation{formations.length > 1 ? "s" : ""} au total.
          </p>

          <div className="mt-6 rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formation</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Élèves</TableHead>
                  <TableHead className="text-right">Publiée le</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {formations.map((formation) => {
                  const Icone = ICONE_PERMIS[formation.type_permis];
                  const styleValidation = STYLE_STATUT_VALIDATION_FORMATION[formation.statut_validation];
                  const styleStatut = STYLE_STATUT_FORMATION[formation.statut];
                  const enCours = idEnCours === formation.id;

                  return (
                    <TableRow key={formation.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icone className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-56 truncate font-semibold text-foreground sm:max-w-none">
                              {formation.titre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Permis {formation.type_permis} · {LIBELLE_PERMIS[formation.type_permis]}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formaterFcfa(Number(formation.prix))}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formation.duree_heures} h
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge className={cn("max-w-32 shrink truncate", styleValidation.classes)}>
                            {styleValidation.libelle}
                          </Badge>
                          {formation.statut_validation === "validé" && (
                            <Badge className={cn("max-w-32 shrink truncate", styleStatut.classes)}>
                              {styleStatut.libelle}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formation.inscriptions_count.toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formaterDateCourte(formation.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={enCours}
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            aria-label={`Actions pour ${formation.titre}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLinkItem
                              render={<Link href={`/partenaire/auto_ecole/formations/${formation.id}`} />}
                            >
                              <Eye className="size-4" />
                              Voir le détail
                            </DropdownMenuLinkItem>
                            <DropdownMenuLinkItem
                              render={<Link href={`/partenaire/auto_ecole/formations/${formation.id}/modifier`} />}
                            >
                              <Pencil className="size-4" />
                              Modifier
                            </DropdownMenuLinkItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDialogueConfirmation({ formation })}
                            >
                              <Trash2 className="size-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Suppression : simple confirmation, pas de champ à saisir — même mécanique que /admin/parc-auto */}
      <AlertDialog
        open={dialogueConfirmation !== null}
        onOpenChange={(ouvert) => !ouvert && setDialogueConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette formation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogueConfirmation?.formation.titre}
              {" — les élèves déjà inscrits perdent l'accès à leur suivi. Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={idEnCours !== null}
              onClick={confirmerAction}
            >
              {idEnCours ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
