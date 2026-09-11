"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  GraduationCap,
  MoreHorizontal,
  RotateCcw,
  XCircle,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterDateCourte, formaterFcfa } from "@/lib/utils";
import type {
  FormationAdmin,
  Paginateur,
  StatsAdmin,
  StatutFormation,
  StatutValidationFormation,
} from "@/types";

/** Style + libellé des 3 valeurs de StatutValidationFormation. Local à cette page, comme STYLE_STATUT_USER dans utilisateurs/page.tsx. */
const STYLE_VALIDATION_FORMATION: Record<
  StatutValidationFormation,
  { libelle: string; classes: string }
> = {
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  validé: { libelle: "Validée", classes: "bg-accent text-accent-foreground" },
  rejeté: { libelle: "Rejetée", classes: "bg-destructive/10 text-destructive" },
};

/** Style + libellé des 2 valeurs de `StatutFormation` — visibilité publique, distincte de la validation. */
const STYLE_STATUT_FORMATION: Record<StatutFormation, { libelle: string; classes: string }> = {
  disponible: { libelle: "Disponible", classes: "bg-accent text-accent-foreground" },
  retiree: { libelle: "Retirée", classes: "bg-destructive/10 text-destructive" },
};

const OPTIONS_VALIDATION: { valeur: StatutValidationFormation | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Toute validation" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "validé", libelle: "Validées" },
  { valeur: "rejeté", libelle: "Rejetées" },
];

/** Même contrat que GET /admin/stats — voir dashboard/page.tsx. Chaque page admin fetch ses propres stats, pas de cache partagé dans ce projet. */
const recupererStatsAdmin = async (): Promise<StatsAdmin> => {
  const reponse = await api.get<{ data: StatsAdmin }>("admin/stats");
  return reponse.data;
};

// ÉTAPE A — récupérer une page de formations.
// Modèle exact : `recupererUtilisateurs` dans utilisateurs/page.tsx (lignes 42-54).
const recupererFormations = async (
  page: number,
  filtreValidation: StatutValidationFormation | "tout"
): Promise<Paginateur<FormationAdmin>> => {
  const params = new URLSearchParams({ page: String(page) });
  if (filtreValidation !== "tout") {
    params.set("statut_validation", filtreValidation)
  }
  const reponse = await api.get<{ data: Paginateur<FormationAdmin> }>(`/admin/formations?${params}`);
  return reponse.data;
}

const validerFormationAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`/admin/formations/${id}/valider`)

};

const rejeterFormationAdmin = async (id: string, motif: string): Promise<void> => {
  await api.post<{ message: string }>(`/admin/formations/${id}/rejeter`, { motif })
};

/** Même contrat que POST /admin/formations/{id}/retirer — sort la formation du catalogue public sans la supprimer. */
const retirerFormationAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`/admin/formations/${id}/retirer`);
};

/** Même contrat que POST /admin/formations/{id}/restaurer. */
const restaurerFormationAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`/admin/formations/${id}/restaurer`);
};

type DialogueRejet = { formation: FormationAdmin };
type DialogueConfirmation = { action: "retirer" | "restaurer"; formation: FormationAdmin }
export default function PageFormations() {
  const [stats, setStats] = useState<StatsAdmin | null>(null);
  const [pagination, setPagination] = useState<Paginateur<FormationAdmin> | null>(null);
  const [chargement, setChargement] = useState(true);
  const [filtreValidation, setFiltreValidation] = useState<StatutValidationFormation | "tout">(
    "tout"
  );
  const [page, setPage] = useState(1);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche les deux useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  const [idEnCours, setIdEnCours] = useState<string | null>(null);
  const [dialogueRejet, setDialogueRejet] = useState<DialogueRejet | null>(null);
  const [dialogueConfirmation, setDialogueConfirmation] = useState<DialogueConfirmation | null>(null);
  const [motifRejet, setMotifRejet] = useState("");

  // Cartes de stats : indépendantes de la pagination de la liste, donc un effet séparé.
  useEffect(() => {
    let annule = false;
    recupererStatsAdmin().then((resultat) => {
      if (!annule) setStats(resultat);
    });
    return () => {
      annule = true;
    };
  }, [tentative]);

  useEffect(() => {
    let annule = false;
    recupererFormations(page, filtreValidation).then((resultat) => {
      if (annule) return
      setPagination(resultat)
      setChargement(false)
    })
    return () => { annule = true }
  }, [page, filtreValidation, tentative])

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  const changerFiltre = (valeur: StatutValidationFormation | "tout") => {
    setFiltreValidation(valeur);
    setPage(1);
  };

  const majValidationLocale = (id: string, statut_validation: StatutValidationFormation) => {
    setPagination((actuel) =>
      actuel && {
        ...actuel,
        data: actuel.data.map((formation) =>
          formation.id === id ? { ...formation, statut_validation } : formation
        ),
      }
    );
  };

  const majStatutLocal = (id: string, statut: StatutFormation) => {
    setPagination((actuel) =>
      actuel && {
        ...actuel,
        data: actuel.data.map((formation) =>
          formation.id === id ? { ...formation, statut } : formation
        ),
      }
    );
  };

  const traiterValider = async (formation: FormationAdmin) => {
    // À implémenter — voir ÉTAPE F
    setIdEnCours(formation.id);
    try {
      await validerFormationAdmin(formation.id);
      majValidationLocale(formation.id, "validé")
      toast.success("Formation validée.");
    } catch (e) {
      toast.error(messageErreur(e, "La validation a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  const confirmerRejet = async () => {
    if (!dialogueRejet) return;
    const id = dialogueRejet.formation.id;
    setIdEnCours(id);
    try {
      await rejeterFormationAdmin(id, motifRejet);
      majValidationLocale(id, "rejeté");
      setDialogueRejet(null);
      setMotifRejet("");
      toast.success("Formation rejetée.");
    } catch (e) {
      toast.error(messageErreur(e, "Le rejet a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  //confirmation
  const confirmerAction = async () => {
    if (!dialogueConfirmation) return;
    const { action, formation } = dialogueConfirmation;
    if (action === "retirer") {
      await traiterRetirer(formation);
    } else {
      await traiterRestaurer(formation);
    }
    setDialogueConfirmation(null)
  }

  const traiterRetirer = async (formation: FormationAdmin) => {
    setIdEnCours(formation.id);
    try {
      await retirerFormationAdmin(formation.id);
      majStatutLocal(formation.id, "retiree");
      toast.success("Formation retirée.");
    } catch (e) {
      toast.error(messageErreur(e, "Le retrait a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  const traiterRestaurer = async (formation: FormationAdmin) => {
    setIdEnCours(formation.id);
    try {
      await restaurerFormationAdmin(formation.id);
      majStatutLocal(formation.id, "disponible");
      toast.success("Formation restaurée.");
    } catch (e) {
      toast.error(messageErreur(e, "La restauration a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  const tauxReussite =
    stats && stats.examens_total > 0
      ? Math.round((stats.examens_reussis / stats.examens_total) * 100)
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Formations</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {pagination
              ? `${pagination.total} formation${pagination.total > 1 ? "s" : ""} publiée${pagination.total > 1 ? "s" : ""} par les auto-écoles.`
              : "Validation des formations des auto-écoles."}
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      {stats ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CarteStat
            libelle="Formations au total"
            valeur={pagination?.total ?? "…"}
            icone={GraduationCap}
            precision="Toutes auto-écoles confondues"
          />
          <CarteStat
            libelle="En attente de validation"
            valeur={stats.formations_validation.en_attente ?? 0}
            icone={ClipboardCheck}
            precision="Modération à traiter"
            accent={(stats.formations_validation.en_attente ?? 0) > 0}
          />
          <CarteStat
            libelle="Validées"
            valeur={stats.formations_validation.validé ?? 0}
            icone={CheckCircle2}
            precision="Visibles par les élèves"
          />
          <CarteStat
            libelle="Taux de réussite aux examens"
            valeur={tauxReussite !== null ? `${tauxReussite} %` : "—"}
            icone={GraduationCap}
            precision={`${stats.examens_reussis}/${stats.examens_total} examens réussis`}
          />
        </section>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      )}

      <div className="mt-6 w-56">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Validation
        </Label>
        <Select
          value={filtreValidation}
          onValueChange={(valeur) =>
            valeur && changerFiltre(valeur as StatutValidationFormation | "tout")
          }
        >
          <SelectTrigger className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS_VALIDATION.map((o) => (
              <SelectItem key={o.valeur} value={o.valeur}>
                {o.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chargement || !pagination ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : pagination.data.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <GraduationCap className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">Aucune formation</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucune formation ne correspond à ce filtre.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formation</TableHead>
                  <TableHead>Auto-école</TableHead>
                  <TableHead>Permis</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead className="text-right">Inscrits</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Publiée le</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.data.map((formation) => {
                  const enCours = idEnCours === formation.id;

                  return (
                    <TableRow key={formation.id}>
                      <TableCell className="text-sm font-semibold">{formation.titre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formation.auto_ecole?.fullname}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formation.type_permis}
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {formaterFcfa(Number(formation.prix))}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formation.inscriptions_count}/{formation.nombre_places}
                      </TableCell>
                      <TableCell>
                        <Badge className={STYLE_VALIDATION_FORMATION[formation.statut_validation].classes}>
                          {STYLE_VALIDATION_FORMATION[formation.statut_validation].libelle}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STYLE_STATUT_FORMATION[formation.statut].classes}>
                          {STYLE_STATUT_FORMATION[formation.statut].libelle}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
                            <DropdownMenuLinkItem render={<Link href={`/admin/formations/${formation.id}`} />}>
                              <Eye className="size-4" />
                              Voir la fiche
                            </DropdownMenuLinkItem>

                            {formation.statut_validation === "en_attente" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => traiterValider(formation)}>
                                  <CheckCircle2 className="size-4" />
                                  Valider
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDialogueRejet({ formation });
                                    setMotifRejet("");
                                  }}
                                >
                                  <XCircle className="size-4" />
                                  Rejeter
                                </DropdownMenuItem>
                              </>
                            )}

                            {formation.statut_validation === "validé" && (
                              <>
                                <DropdownMenuSeparator />
                                {formation.statut === "disponible" ? (
                                  <DropdownMenuItem onClick={() => setDialogueConfirmation({action: "retirer", formation})}>
                                    <Ban className="size-4" />
                                    Retirer du catalogue
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setDialogueConfirmation({action: "restaurer",formation})}>
                                    <RotateCcw className="size-4" />
                                    Restaurer
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {pagination.last_page > 1 && (
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={pagination.current_page === 1}
                onClick={() => setPage((p) => p - 1)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Précédent
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.current_page} sur {pagination.last_page}
              </span>
              <button
                type="button"
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {/* Rejet : le back exige un motif (`motif`, requis, 500 caractères max) */}
      <Dialog
        open={dialogueRejet !== null}
        onOpenChange={(ouvert) => !ouvert && setDialogueRejet(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter cette formation</DialogTitle>
            <DialogDescription>
              {dialogueRejet?.formation.titre}
              {" — le motif est transmis à l'auto-école."}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="motif-rejet-formation">Motif</Label>
            <Textarea
              id="motif-rejet-formation"
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
              onClick={() => setDialogueRejet(null)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={motifRejet.trim().length === 0 || idEnCours !== null}
              onClick={confirmerRejet}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {idEnCours ? "Rejet…" : "Rejeter"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation retirer/restaurer — même mécanique que le Dialog Rejet ci-dessus,
          mais un seul champ dynamique change selon dialogueConfirmation.action. */}
      <Dialog
        open={dialogueConfirmation !== null}
        onOpenChange={(ouvert) => !ouvert && setDialogueConfirmation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogueConfirmation?.action === "retirer" ? "Retirer cette formation" : "Restaurer cette formation"}
            </DialogTitle>
            <DialogDescription>
              {dialogueConfirmation?.formation.titre}
              {dialogueConfirmation?.action === "retirer"
                ? " — sera masquée du catalogue public."
                : " — redevient visible dans le catalogue public."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogueConfirmation(null)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={idEnCours !== null}
              onClick={confirmerAction}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              {idEnCours
                ? "…"
                : dialogueConfirmation?.action === "retirer"
                  ? "Retirer"
                  : "Restaurer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
