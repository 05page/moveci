"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Ticket,
  Trash2,
  Trophy,
  Users,
  XCircle,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterDateCourte, formaterFcfa, initiales, urlPhoto } from "@/lib/utils";
import {
  ICONE_PERMIS,
  LIBELLE_PERMIS,
  STYLE_STATUT_ELEVE,
  STYLE_STATUT_FORMATION,
  STYLE_STATUT_VALIDATION_FORMATION,
} from "@/lib/formation";
import type { EleveInscrit, FormationAutoEcole, Promotion, StatsFormation, StatutEleve, TypeRemise } from "@/types";

type ParametresPage = { params: Promise<{ id: string }> };

type DonneesDetail = {
  formation: FormationAutoEcole;
  stats: StatsFormation;
  inscrits: EleveInscrit[];
  promotions: Promotion[];
};

/** Pas de GET /formations/{id} pour l'auto-école : on filtre la liste complète côté client. */
const recupererFormation = async (id: string): Promise<FormationAutoEcole | null> => {
  const reponse = await api.get<{ data: FormationAutoEcole[] }>("formations/mes-formations");
  return reponse.data.find((formation) => formation.id === id) ?? null;
};

const recupererDetail = async (id: string): Promise<DonneesDetail | null> => {
  const formation = await recupererFormation(id);
  if (!formation) return null;

  const [reponseStats, reponseInscrits, reponsePromotions] = await Promise.all([
    api.get<{ data: StatsFormation }>(`formations/${id}/stats`),
    api.get<{ data: EleveInscrit[] }>(`formations/${id}/inscrits`),
    api.get<{ data: Promotion[] }>(`formations/${id}/promotions`),
  ]);

  return {
    formation,
    stats: reponseStats.data,
    inscrits: reponseInscrits.data,
    promotions: reponsePromotions.data,
  };
};

type FormulairePromo = {
  code: string;
  type_remise: TypeRemise;
  valeur: string;
  date_debut: string;
  date_fin: string;
  usage_max: string;
};

const FORMULAIRE_PROMO_VIDE: FormulairePromo = {
  code: "",
  type_remise: "pourcentage",
  valeur: "",
  date_debut: "",
  date_fin: "",
  usage_max: "",
};

const FORMULAIRE_STATUT_VIDE: FormulaireStatut = {
  date_examen: "",
  reussite: true,
  statut_eleve: "en_cours"
}

/** Même contrat que POST /formations/{id}/promotions (PromotionsController::store). */
const creerPromotion = (formationId: string, donnees: FormulairePromo): Promise<{ data: Promotion }> =>
  api.post<{ data: Promotion }>(`formations/${formationId}/promotions`, {
    code: donnees.code,
    type_remise: donnees.type_remise,
    valeur: donnees.valeur,
    date_debut: donnees.date_debut || null,
    date_fin: donnees.date_fin || null,
    usage_max: donnees.usage_max || null,
  });

/** Même contrat que PUT /formations/{id}/promotions/{promoId} — seul `is_active` change ici. */
const togglerPromotion = (formationId: string, promotion: Promotion): Promise<{ data: Promotion }> =>
  api.put<{ data: Promotion }>(`formations/${formationId}/promotions/${promotion.id}`, {
    is_active: !promotion.is_active,
  });

/** Même contrat que DELETE /formations/{id}/promotions/{promoId} (soft delete côté back). */
const supprimerPromotion = (formationId: string, promotionId: string): Promise<void> =>
  api
    .delete<{ message: string }>(`formations/${formationId}/promotions/${promotionId}`)
    .then(() => undefined);

type FormulaireStatut = {
  statut_eleve: Exclude<StatutEleve, "préinscrit">;
  date_examen: string;
  reussite: boolean | null;
};

/** Les 6 valeurs que `updateInscrit` accepte (Rule::in) — "préinscrit" est le statut initial,
 * jamais une cible de mise à jour manuelle. */
const OPTIONS_STATUT_ELEVE: { valeur: Exclude<StatutEleve, "préinscrit">; libelle: string }[] = [
  { valeur: "paiement_en_cours", libelle: "Paiement en cours" },
  { valeur: "inscrit", libelle: "Inscrit" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "examen_passe", libelle: "Examen passé" },
  { valeur: "terminé", libelle: "Terminé" },
  { valeur: "abandonné", libelle: "Abandonné" },
];

/** Même contrat que PUT /formations/{formationId}/inscrits/{inscriptionId} (FormationController::updateInscrit). */
const mettreAJourStatutEleve = (
  formationId: string,
  inscriptionId: string,
  donnees: FormulaireStatut
): Promise<{ data: EleveInscrit }> =>
  api.put<{ data: EleveInscrit }>(`formations/${formationId}/inscrits/${inscriptionId}`, {
    statut_eleve: donnees.statut_eleve,
    date_examen: donnees.date_examen || null,
    reussite: donnees.reussite,
  });

/** "10%" ou "5 000 FCFA" selon le type de remise — `valeur` est une string (decimal:2 côté back). */
const libelleRemise = (promotion: Promotion): string =>
  promotion.type_remise === "pourcentage"
    ? `${promotion.valeur}%`
    : formaterFcfa(Number(promotion.valeur));

/** Fenêtre de validité lisible — les deux bornes sont optionnelles côté back. */
const fenetreValidite = (promotion: Promotion): string => {
  if (!promotion.date_debut && !promotion.date_fin) return "Toujours valide";
  if (promotion.date_debut && promotion.date_fin) {
    return `${formaterDateCourte(promotion.date_debut)} → ${formaterDateCourte(promotion.date_fin)}`;
  }
  if (promotion.date_debut) return `Depuis le ${formaterDateCourte(promotion.date_debut)}`;
  return `Jusqu'au ${formaterDateCourte(promotion.date_fin as string)}`;
};

const PageDetailFormation = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <DetailFormation key={id} id={id} />;
};

export default PageDetailFormation;

const DetailFormation = ({ id }: { id: string }) => {
  const [donnees, setDonnees] = useState<DonneesDetail | null | undefined>(undefined);
  const [tentative, setTentative] = useState(0);
  // distinct de `donnees === undefined` : un rechargement manuel garde la fiche affichée
  const [rechargement, setRechargement] = useState(false);
  const [dialogueCreationPromo, setDialogueCreationPromo] = useState(false);
  const [formulairePromo, setFormulairePromo] = useState<FormulairePromo>(FORMULAIRE_PROMO_VIDE);
  const [envoiPromo, setEnvoiPromo] = useState(false);
  const [erreurPromo, setErreurPromo] = useState<string | null>(null);
  const [idPromoEnCours, setIdPromoEnCours] = useState<string | null>(null);
  const [formulaireStatut, setFormulaireStatut] = useState<FormulaireStatut>(FORMULAIRE_STATUT_VIDE)
  const [suppressionPromo, setSuppressionPromo] = useState<Promotion | null>(null);
  const [dialogueStatut, setDialogueStatut] = useState<EleveInscrit | null>(null);
  const [envoiStatut, setEnvoiStatut] = useState(false);
  const [erreurStatut, setErreurStatut] = useState(null);

  useEffect(() => {
    let annule = false;

    recupererDetail(id).then((resultat) => {
      if (annule) return;
      setDonnees(resultat);
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

  if (donnees === undefined) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-9 w-72" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="mt-10 h-64 w-full" />
      </main>
    );
  }

  if (donnees === null) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-16 text-center">
        <h1 className="font-heading text-xl font-bold">Formation introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Elle a peut-être déjà été supprimée.
        </p>
        <Link
          href="/partenaire/auto_ecole/formations"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
        >
          <ArrowLeft className="size-4" />
          Retour aux formations
        </Link>
      </main>
    );
  }

  const { formation, stats, inscrits, promotions } = donnees;

  const definirChampPromo = <C extends keyof FormulairePromo>(champ: C, valeur: FormulairePromo[C]) => {
    setFormulairePromo((actuel) => ({ ...actuel, [champ]: valeur }));
  };

  const pretAEnvoyerPromo =
    formulairePromo.code.trim().length > 0 && formulairePromo.valeur.trim().length > 0;

  const envoyerPromo = async () => {
    if (!pretAEnvoyerPromo || envoiPromo) return;

    setEnvoiPromo(true);
    setErreurPromo(null);

    try {
      const { data: nouvellePromo } = await creerPromotion(id, formulairePromo);
      setDonnees((actuel) => actuel && { ...actuel, promotions: [nouvellePromo, ...actuel.promotions] });
      setFormulairePromo(FORMULAIRE_PROMO_VIDE);
      setDialogueCreationPromo(false);
      toast.success("Code promo créé.");
    } catch {
      const message = "La création du code promo a échoué. Le code est peut-être déjà utilisé.";
      setErreurPromo(message);
      toast.error(message);
    } finally {
      setEnvoiPromo(false);
    }
  };

  const definirChampStatut = <C extends keyof FormulaireStatut>(champ: C, valeur: FormulaireStatut[C]) => {
    setFormulaireStatut((actuel) => actuel && { ...actuel, [champ]: valeur });
  }

  const ouvrirDialogueStatut = (eleve: EleveInscrit) => {
    const statutDepart = eleve.statut_eleve === "préinscrit" ? "paiement_en_cours" : eleve.statut_eleve;
    setFormulaireStatut({ statut_eleve: statutDepart, date_examen: eleve.date_examen?.slice(0, 10) ?? "", reussite: eleve.reussite })
    setDialogueStatut(eleve);
    setErreurStatut(null)
    if (envoiStatut === true || dialogueStatut === null) return;
    setEnvoiStatut(true);
  }

  const envoyerStatut = async () => {
    setEnvoiStatut(true)
    setErreurStatut(null);
    try {
      if (envoiStatut || !dialogueStatut) return;
      const reponse = await mettreAJourStatutEleve(id, dialogueStatut.id, formulaireStatut);
      setDialogueStatut(null);
      toast.success("Modification réussie")
      setDonnees(
        (actuel) =>
          actuel && {
            ...actuel,
            inscrits: actuel.inscrits.map((eleve) => (eleve.id === reponse.data.id ? reponse.data : eleve)),
          }
      );

    } catch (e) {
      toast.error(messageErreur(e, "La mise à jour a échoué."));

    } finally {
      setEnvoiStatut(false)
    }
  }
  const basculerActivation = async (promotion: Promotion) => {
    setIdPromoEnCours(promotion.id);
    try {
      const { data: promoMaj } = await togglerPromotion(id, promotion);
      setDonnees(
        (actuel) =>
          actuel && {
            ...actuel,
            promotions: actuel.promotions.map((p) => (p.id === promoMaj.id ? promoMaj : p)),
          }
      );
      toast.success(promoMaj.is_active ? "Code promo activé." : "Code promo désactivé.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "L'action a échoué."));
    } finally {
      setIdPromoEnCours(null);
    }
  };

  const confirmerSuppressionPromo = async () => {
    if (!suppressionPromo) return;
    setIdPromoEnCours(suppressionPromo.id);
    try {
      await supprimerPromotion(id, suppressionPromo.id);
      setDonnees(
        (actuel) =>
          actuel && { ...actuel, promotions: actuel.promotions.filter((p) => p.id !== suppressionPromo.id) }
      );
      setSuppressionPromo(null);
      toast.success("Code promo supprimé.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "La suppression a échoué."));
    } finally {
      setIdPromoEnCours(null);
    }
  };

  const Icone = ICONE_PERMIS[formation.type_permis];
  const styleValidation = STYLE_STATUT_VALIDATION_FORMATION[formation.statut_validation];
  const styleStatut = STYLE_STATUT_FORMATION[formation.statut];

  const specs = [
    { libelle: "Permis", valeur: `${formation.type_permis} · ${LIBELLE_PERMIS[formation.type_permis]}` },
    { libelle: "Durée", valeur: `${formation.duree_heures} h` },
    { libelle: "Prix", valeur: formaterFcfa(Number(formation.prix)) },
    { libelle: "Lieu", valeur: formation.lieu ?? "Non précisé" },
    {
      libelle: "Places",
      valeur: formation.nombre_places ? `${formation.inscriptions_count}/${formation.nombre_places}` : "Illimitées",
    },
    { libelle: "Publiée le", valeur: formaterDateCourte(formation.created_at) },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/partenaire/auto_ecole/formations"
          className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour aux formations
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/partenaire/auto_ecole/formations/${id}/modifier`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="size-4" />
            Modifier
          </Link>
          <BoutonRecharger onClick={recharger} chargement={rechargement} />
        </div>
      </div>

      <header className="mt-6 flex flex-wrap items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icone className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-bold md:text-3xl">{formation.titre}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className={styleValidation.classes}>{styleValidation.libelle}</Badge>
            {formation.statut_validation === "validé" && (
              <Badge className={styleStatut.classes}>{styleStatut.libelle}</Badge>
            )}
          </div>
        </div>
      </header>

      <p className="mt-6 max-w-3xl whitespace-pre-line text-sm text-muted-foreground">
        {formation.description}
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-border p-5 sm:grid-cols-3 lg:grid-cols-6">
        {specs.map((spec) => (
          <div key={spec.libelle}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {spec.libelle}
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold text-foreground">{spec.valeur}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteStat
          libelle="Élèves inscrits"
          valeur={stats.total}
          icone={Users}
          precision="Toutes situations confondues"
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
              : "Aucun élève n'a terminé pour l'instant"
          }
        />
        <CarteStat
          libelle="Abandons"
          valeur={stats.abandonnes}
          icone={XCircle}
          precision="Élèves ayant quitté la formation"
        />
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">Codes promo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {promotions.length} code{promotions.length > 1 ? "s" : ""} créé{promotions.length > 1 ? "s" : ""}
              {" "}sur cette formation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormulairePromo(FORMULAIRE_PROMO_VIDE);
              setErreurPromo(null);
              setDialogueCreationPromo(true);
            }}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Plus className="size-4" />
            Nouveau code
          </button>
        </div>

        {promotions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border p-10 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Ticket className="size-6" />
            </span>
            <h3 className="mt-5 font-heading text-lg font-bold">Aucun code promo</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Créez un code pour offrir une réduction sur cette formation.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Remise</TableHead>
                  <TableHead>Fenêtre</TableHead>
                  <TableHead className="text-right">Utilisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promotion) => {
                  const enCours = idPromoEnCours === promotion.id;

                  return (
                    <TableRow key={promotion.id}>
                      <TableCell className="font-mono text-sm font-semibold text-foreground">
                        {promotion.code}
                      </TableCell>
                      <TableCell className="tabular-nums">{libelleRemise(promotion)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fenetreValidite(promotion)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {promotion.usage_count}
                        {promotion.usage_max !== null ? `/${promotion.usage_max}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            promotion.is_active
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {promotion.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={enCours}
                            onClick={() => basculerActivation(promotion)}
                            aria-label={promotion.is_active ? "Désactiver ce code" : "Activer ce code"}
                            title={promotion.is_active ? "Désactiver" : "Activer"}
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                          >
                            {promotion.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                          </button>
                          <button
                            type="button"
                            disabled={enCours}
                            onClick={() => setSuppressionPromo(promotion)}
                            aria-label="Supprimer ce code"
                            title="Supprimer"
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-heading text-xl font-bold">Élèves inscrits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {inscrits.length} élève{inscrits.length > 1 ? "s" : ""} sur cette formation.
        </p>

        {inscrits.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border p-10 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-6" />
            </span>
            <h3 className="mt-5 font-heading text-lg font-bold">Aucun élève inscrit</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Dès qu&apos;un client s&apos;inscrit, il apparaît ici.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Examen</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscrits.map((eleve) => {
                  const styleEleve = STYLE_STATUT_ELEVE[eleve.statut_eleve];

                  return (
                    <TableRow key={eleve.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {eleve.client.avatar ? (
                            <img
                              src={urlPhoto(eleve.client.avatar)}
                              alt=""
                              className="size-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-xs font-bold text-primary-foreground">
                              {initiales(eleve.client.fullname)}
                            </span>
                          )}
                          <span className="min-w-0 truncate font-semibold text-foreground">
                            {eleve.client.fullname}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          <p className="truncate">{eleve.client.email}</p>
                          {eleve.client.telephone && <p>{eleve.client.telephone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("max-w-32 shrink truncate", styleEleve.classes)}>
                          {styleEleve.libelle}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formaterDateCourte(eleve.date_inscription)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {eleve.date_examen?.slice(0, 10) ? (
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {eleve.reussite === true && <CheckCircle2 className="size-4 text-primary" />}
                            {eleve.reussite === false && <XCircle className="size-4 text-destructive" />}
                            <span className="text-muted-foreground">
                              {formaterDateCourte(eleve.date_examen)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => ouvrirDialogueStatut(eleve)}>
                          <Pencil className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Création d'un code promo — même mécanique que le Dialog Rejet d'admin/formations/page.tsx */}
      <Dialog open={dialogueCreationPromo} onOpenChange={setDialogueCreationPromo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau code promo</DialogTitle>
            <DialogDescription>S&apos;applique uniquement à {formation.titre}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="code-promo">Code *</Label>
              <Input
                id="code-promo"
                value={formulairePromo.code}
                onChange={(e) => definirChampPromo("code", e.target.value)}
                placeholder="ETE2026"
                className="mt-2"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="type-remise">Type de remise *</Label>
                <Select
                  value={formulairePromo.type_remise}
                  onValueChange={(v) => v && definirChampPromo("type_remise", v as TypeRemise)}
                >
                  <SelectTrigger id="type-remise" className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pourcentage">Pourcentage</SelectItem>
                    <SelectItem value="montant_fixe">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valeur-promo">
                  Valeur * {formulairePromo.type_remise === "pourcentage" ? "(%)" : "(FCFA)"}
                </Label>
                <Input
                  id="valeur-promo"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={formulairePromo.valeur}
                  onChange={(e) => definirChampPromo("valeur", e.target.value)}
                  placeholder={formulairePromo.type_remise === "pourcentage" ? "10" : "5000"}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="date-debut-promo">Début (optionnel)</Label>
                <Input
                  id="date-debut-promo"
                  type="date"
                  value={formulairePromo.date_debut}
                  onChange={(e) => definirChampPromo("date_debut", e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="date-fin-promo">Fin (optionnel)</Label>
                <Input
                  id="date-fin-promo"
                  type="date"
                  value={formulairePromo.date_fin}
                  onChange={(e) => definirChampPromo("date_fin", e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="usage-max-promo">Quota d&apos;utilisation (optionnel)</Label>
                <Input
                  id="usage-max-promo"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={formulairePromo.usage_max}
                  onChange={(e) => definirChampPromo("usage_max", e.target.value)}
                  placeholder="Illimité"
                  className="mt-2"
                />
              </div>
            </div>

            {erreurPromo && (
              <p role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                {erreurPromo}
              </p>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogueCreationPromo(false)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!pretAEnvoyerPromo || envoiPromo}
              onClick={envoyerPromo}
              className={cn(buttonVariants())}
            >
              {envoiPromo ? "Création…" : "Créer le code"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogueStatut !== null} onOpenChange={(ouvert) => !ouvert && setDialogueStatut(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
            <DialogDescription>{dialogueStatut?.client.fullname}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="statut-eleve">Statut</Label>
              <Select
                value={formulaireStatut.statut_eleve}
                onValueChange={(valeur) =>
                  valeur && definirChampStatut("statut_eleve", valeur as FormulaireStatut["statut_eleve"])
                }
              >
                <SelectTrigger id="statut-eleve" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_STATUT_ELEVE.map((o) => (
                    <SelectItem key={o.valeur} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formulaireStatut.statut_eleve === "examen_passe" || formulaireStatut.statut_eleve === "terminé") && (
              <>
                <div>
                  <Label htmlFor="date-examen">Date d&apos;examen</Label>
                  <Input
                    id="date-examen"
                    type="date"
                    value={formulaireStatut.date_examen}
                    onChange={(e) => definirChampStatut("date_examen", e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="reussite">Résultat</Label>
                  {/* reussite est boolean | null côté state, mais Select ne parle qu'en strings —
                      d'où cette table de correspondance dans les deux sens (affichage puis onValueChange). */}
                  <Select
                    value={
                      formulaireStatut.reussite === true
                        ? "reussi"
                        : formulaireStatut.reussite === false
                          ? "echoue"
                          : "non_renseigne"
                    }
                    onValueChange={(valeur) => {
                      if (valeur === "reussi") definirChampStatut("reussite", true);
                      if (valeur === "echoue") definirChampStatut("reussite", false);
                      if (valeur === "non_renseigne") definirChampStatut("reussite", null);
                    }}
                  >
                    <SelectTrigger id="reussite" className="mt-2 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_renseigne">Pas encore renseigné</SelectItem>
                      <SelectItem value="reussi">Réussi</SelectItem>
                      <SelectItem value="echoue">Échoué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {erreurStatut && (
              <p role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                {erreurStatut}
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogueStatut(null)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={envoiStatut}
              onClick={() => envoyerStatut()}
              className={cn(buttonVariants())}
            >
              {envoiStatut ? "Modification…" : "Modifier"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression d'un code promo : simple confirmation, même mécanique que Supprimer formation */}
      <AlertDialog
        open={suppressionPromo !== null}
        onOpenChange={(ouvert) => !ouvert && setSuppressionPromo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce code promo ?</AlertDialogTitle>
            <AlertDialogDescription>
              {suppressionPromo?.code}
              {" — les élèves ne pourront plus l'utiliser. Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={idPromoEnCours !== null}
              onClick={confirmerSuppressionPromo}
            >
              {idPromoEnCours ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};
