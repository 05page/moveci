"use client";

import { useEffect, useState } from "react";
import {
    Eye,
    Info,
    Loader2,
    MoreHorizontal,
    Pencil,
    Trash2,
    Users,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { cn, formaterDateCourte, formaterFcfa, initiales } from "@/lib/utils";
import { ICONE_PERMIS, LIBELLE_PERMIS, STYLE_STATUT_ELEVE } from "@/lib/formation";
import type { DetailVersements, InscritAutoEcole, TypePermis, Versement } from "@/types";

type DonneInscrits = {
    inscrits: InscritAutoEcole[];
}

const OPTIONS_PERMIS: { valeur: TypePermis | "tous"; libelle: string }[] = [
    { valeur: "tous", libelle: "Tous les permis" },
    { valeur: "A", libelle: "Moto" },
    { valeur: "A2", libelle: "Moto (bridée)" },
    { valeur: "B", libelle: "Voiture" },
    { valeur: "B1", libelle: "Voiturette" },
    { valeur: "C", libelle: "Poids lourd" },
    { valeur: "D", libelle: "Transport en commun" },
];

const OPTIONS_SOLDE: { valeur: "tous" | "solde" | "non_solde"; libelle: string }[] = [
    { valeur: "tous", libelle: "Tous" },
    { valeur: "solde", libelle: "Soldé" },
    { valeur: "non_solde", libelle: "Non soldé" },
];

/** Même contrat que GET .../versements (VersementInscriptionController::index). */
const recupererVersements = (formationId: string, inscriptionId: string): Promise<{ data: DetailVersements }> =>
    api.get<{ data: DetailVersements }>(`formations/${formationId}/inscrits/${inscriptionId}/versements`);

/** Même contrat que POST .../versements (VersementInscriptionController::store). */
const ajouterVersement = (
    formationId: string,
    inscriptionId: string,
    donnees: { montant: string; date_versement: string; note: string }
): Promise<{ data: { versement: Versement; montant_paye: number; reste: number } }> =>
    api.post<{ data: { versement: Versement; montant_paye: number; reste: number } }>(
        `formations/${formationId}/inscrits/${inscriptionId}/versements`,
        {
            montant: donnees.montant,
            date_versement: donnees.date_versement || null,
            note: donnees.note || null,
        }
    );

/** Même contrat que DELETE .../versements/{versId} (VersementInscriptionController::destroy). */
const supprimerVersement = (formationId: string, inscriptionId: string, versementId: string): Promise<void> =>
    api
        .delete<{ message: string }>(`formations/${formationId}/inscrits/${inscriptionId}/versements/${versementId}`)
        .then(() => undefined);

export default function MesInscrits() {
    const [rechargement, setReChargement] = useState(true);
    const [tentative, setTentative] = useState(0);
    const [mesEleves, setMesEleves] = useState<InscritAutoEcole[]>([]);

    const recupererMesInscrits = async (): Promise<DonneInscrits> => {
        const reponse = await api.get<{ data: InscritAutoEcole[] }>("formations/mes-inscrits")
        console.log(reponse.data)
        return { inscrits: reponse.data };
    }

    useEffect(() => {
        let annule = false;
        recupererMesInscrits().then((liste) => {
            if (annule) return;
            setMesEleves(liste.inscrits);
            setReChargement(false);
        });
        return () => {
            annule = true;
        }
    }, [tentative]);

    const recharger = () => {
        setReChargement(true);
        setTentative((t) => t + 1);
    };

    const [filtrePermis, setFiltrePermis] = useState<TypePermis | "tous">("tous");
    const [filtreSolde, setFiltreSolde] = useState<"tous" | "solde" | "non_solde">("tous");

    const estSolde = (montantPaye: number | null, prixFormation: string): boolean => {
        return (montantPaye ?? 0) >= Number(prixFormation);
    };

    const mesElevesFiltres = mesEleves.filter((m) => {
        return (filtrePermis === "tous" || m.formation.type_permis === filtrePermis) && (filtreSolde === "tous" || (filtreSolde === "solde") === estSolde(m.montant_paye, m.formation.prix));
    });

    // ÉTAPE 1 : dialogueDetail garde le même principe que dialogueVersements juste en dessous
    // (un seul state EleveInscrit | null, pas un booléen séparé — voir la question qu'on avait
    // faite plus tôt sur pourquoi "null" plutôt qu'un boolean).
    const [dialogueDetail, setDialogueDetail] = useState<InscritAutoEcole | null>(null);

    const [dialogueVersements, setDialogueVersements] = useState<InscritAutoEcole | null>(null);
    const [detailVersements, setDetailVersements] = useState<DetailVersements | null>(null);
    const [chargementVersements, setChargementVersements] = useState(false);
    const [montantVersement, setMontantVersement] = useState("");
    const [dateVersement, setDateVersement] = useState("");
    const [noteVersement, setNoteVersement] = useState("");
    const [envoiVersement, setEnvoiVersement] = useState(false);
    const [erreurVersement, setErreurVersement] = useState<string | null>(null);
    const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);

    const ouvrirVersements = (eleve: InscritAutoEcole) => {
        setDialogueVersements(eleve);
        setDetailVersements(null);
        setErreurVersement(null);
        setMontantVersement("");
        setDateVersement("");
        setNoteVersement("");
        setChargementVersements(true);
        recupererVersements(eleve.formation.id, eleve.id)
            .then((reponse) => setDetailVersements(reponse.data))
            .catch(() => setErreurVersement("Impossible de charger les versements."))
            .finally(() => setChargementVersements(false));
    };

    const fermerVersements = () => {
        setDialogueVersements(null);
        setDetailVersements(null);
    };

    const envoyerVersement = async () => {
        if (!dialogueVersements || !montantVersement.trim() || envoiVersement) return;

        setEnvoiVersement(true);
        setErreurVersement(null);

        try {
            const { data } = await ajouterVersement(dialogueVersements.formation.id, dialogueVersements.id, {
                montant: montantVersement,
                date_versement: dateVersement,
                note: noteVersement,
            });

            setDetailVersements(
                (actuel) =>
                    actuel && {
                        ...actuel,
                        versements: [data.versement, ...actuel.versements],
                        montant_paye: data.montant_paye,
                        reste_a_payer: data.reste,
                    }
            );
            // la colonne "Soldé" du tableau doit refléter le nouveau montant sans recharger toute la page
            setMesEleves((actuel) =>
                actuel.map((m) => (m.id === dialogueVersements.id ? { ...m, montant_paye: data.montant_paye } : m))
            );
            setMontantVersement("");
            setDateVersement("");
            setNoteVersement("");
            toast.success("Versement enregistré.");
        } catch (erreurCatch) {
            const message = messageErreur(erreurCatch, "L'enregistrement du versement a échoué.");
            setErreurVersement(message);
            toast.error(message);
        } finally {
            setEnvoiVersement(false);
        }
    };

    const retirerVersement = async (versement: Versement) => {
        if (!dialogueVersements) return;

        setSuppressionEnCours(versement.id);
        try {
            await supprimerVersement(dialogueVersements.formation.id, dialogueVersements.id, versement.id);

            setDetailVersements((actuel) => {
                if (!actuel) return actuel;
                const montantPaye = actuel.montant_paye - Number(versement.montant);
                return {
                    ...actuel,
                    versements: actuel.versements.filter((v) => v.id !== versement.id),
                    montant_paye: montantPaye,
                    reste_a_payer: Math.max(0, actuel.montant_total - montantPaye),
                };
            });
            setMesEleves((actuel) =>
                actuel.map((m) =>
                    m.id === dialogueVersements.id
                        ? { ...m, montant_paye: (m.montant_paye ?? 0) - Number(versement.montant) }
                        : m
                )
            );
            toast.success("Versement supprimé.");
        } catch (erreurCatch) {
            toast.error(messageErreur(erreurCatch, "La suppression a échoué."));
        } finally {
            setSuppressionEnCours(null);
        }
    };

    if (rechargement && mesEleves.length === 0) {
        return (
            <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="mt-8 h-64 w-full" />
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl font-bold md:text-3xl">Mes élèves</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Tous vos élèves inscrits, toutes formations confondues.
                    </p>
                </div>
                <BoutonRecharger onClick={recharger} chargement={rechargement} />
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
                <div className="w-48">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Type de permis
                    </Label>
                    <Select
                        value={filtrePermis}
                        onValueChange={(valeur) => valeur && setFiltrePermis(valeur as TypePermis | "tous")}
                    >
                        <SelectTrigger className="mt-2 w-full">
                            <SelectValue>
                                {(valeur: TypePermis | "tous") =>
                                    OPTIONS_PERMIS.find((o) => o.valeur === valeur)?.libelle
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {OPTIONS_PERMIS.map((t) => (
                                <SelectItem key={t.valeur} value={t.valeur}>
                                    {t.libelle}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-48">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Soldé
                    </Label>
                    <Select
                        value={filtreSolde}
                        onValueChange={(valeur) => valeur && setFiltreSolde(valeur as "tous" | "solde" | "non_solde")}
                    >
                        <SelectTrigger className="mt-2 w-full">
                            <SelectValue>
                                {(valeur: "tous" | "solde" | "non_solde") =>
                                    OPTIONS_SOLDE.find((o) => o.valeur === valeur)?.libelle
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {OPTIONS_SOLDE.map((t) => (
                                <SelectItem key={t.valeur} value={t.valeur}>
                                    {t.libelle}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {mesEleves.length === 0 ? (
                <section className="mt-12 rounded-2xl border border-border p-10 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Users className="size-6" />
                    </span>
                    <h2 className="mt-5 font-heading text-xl font-bold">Aucun élève pour l&apos;instant</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Dès qu&apos;un client s&apos;inscrira à une de vos formations, il apparaîtra ici.
                    </p>
                </section>
            ) : mesElevesFiltres.length === 0 ? (
                <section className="mt-12 rounded-2xl border border-border p-10 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Users className="size-6" />
                    </span>
                    <h2 className="mt-5 font-heading text-xl font-bold">Aucun élève ne correspond à ce filtre</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Essayez d&apos;élargir vos critères de recherche.
                    </p>
                </section>
            ) : (
                <section className="mt-8">
                    <p className="text-sm text-muted-foreground">
                        {mesElevesFiltres.length} élève{mesElevesFiltres.length > 1 ? "s" : ""} au total.
                    </p>

                    <div className="mt-4 rounded-2xl border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom complet</TableHead>
                                    <TableHead>Téléphone</TableHead>
                                    <TableHead>Adresse</TableHead>
                                    <TableHead>Type de permis</TableHead>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Soldé</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mesElevesFiltres.map((m) => {
                                    const Icone = ICONE_PERMIS[m.formation.type_permis];
                                    const solde = estSolde(m.montant_paye, m.formation.prix);

                                    return (
                                        <TableRow key={m.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {m.client.avatar ? (
                                                        // <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns
                                                        <img
                                                            src={m.client.avatar}
                                                            alt=""
                                                            className="size-10 shrink-0 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                                            {initiales(m.client.fullname)}
                                                        </span>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="max-w-40 truncate font-semibold text-foreground sm:max-w-none">
                                                            {m.client.fullname}
                                                        </p>
                                                        <p className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-none">
                                                            {m.client.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-muted-foreground">
                                                {m.client.telephone ?? "—"}
                                            </TableCell>

                                            <TableCell className="text-muted-foreground">
                                                {m.client.adresse ?? "—"}
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <Icone className="size-4" />
                                                    </span>
                                                    <span className="text-sm">
                                                        {LIBELLE_PERMIS[m.formation.type_permis]}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell className="max-w-48 truncate">{m.formation.titre}</TableCell>

                                            <TableCell>
                                                <Badge
                                                    className={cn(
                                                        solde
                                                            ? "bg-accent text-accent-foreground"
                                                            : "bg-secondary text-secondary-foreground"
                                                    )}
                                                >
                                                    {solde ? "Soldé" : "Non soldé"}
                                                </Badge>
                                            </TableCell>

                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                                                        aria-label={`Actions pour ${m.client.fullname}`}
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setDialogueDetail(m)}>
                                                            <Info className="size-4" />
                                                            Voir le détail
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => ouvrirVersements(m)}>
                                                            <Eye className="size-4" />
                                                            Versements
                                                        </DropdownMenuItem>
                                                        <DropdownMenuLinkItem>
                                                            <Pencil className="size-4" />
                                                            Modifier
                                                        </DropdownMenuLinkItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                        >
                                                            <Trash2 className="size-4" />
                                                            Supprimer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            )}

            <Dialog open={dialogueDetail !== null} onOpenChange={(ouvert) => !ouvert && setDialogueDetail(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogueDetail?.client.fullname}
                        </DialogTitle>
                        <DialogDescription>{dialogueDetail?.formation.titre}</DialogDescription>
                    </DialogHeader>
                    {dialogueDetail && (
                        <div className="space-y-4">
                            <Badge className={STYLE_STATUT_ELEVE[dialogueDetail.statut_eleve].classes}>
                                {STYLE_STATUT_ELEVE[dialogueDetail.statut_eleve].libelle}
                            </Badge>

                            <div className="space-y-1 text-sm">
                                <p>{dialogueDetail.client.email}</p>
                                <p className="text-muted-foreground">{dialogueDetail.client.telephone ?? "—"}</p>
                                <p className="text-muted-foreground">{dialogueDetail.client.adresse ?? "—"}</p>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                {(() => {
                                    const Icone = ICONE_PERMIS[dialogueDetail.formation.type_permis];
                                    return <Icone className="size-4 text-primary" />;
                                })()}
                                {LIBELLE_PERMIS[dialogueDetail.formation.type_permis]}
                            </div>

                            <p className="text-sm">
                                {formaterFcfa(dialogueDetail.montant_paye ?? 0)} / {formaterFcfa(Number(dialogueDetail.formation.prix))} payé
                                {" — "}
                                {estSolde(dialogueDetail.montant_paye, dialogueDetail.formation.prix) ? "Soldé" : "Non soldé"}
                            </p>

                            <p className="text-sm text-muted-foreground">
                                {dialogueDetail.date_examen
                                    ? `Examen le ${formaterDateCourte(dialogueDetail.date_examen)}`
                                    : "Pas encore passé l'examen"}
                                {dialogueDetail.reussite === true && " — Réussi"}
                                {dialogueDetail.reussite === false && " — Échoué"}
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setDialogueDetail(null)}
                            className={cn(buttonVariants({ variant: "outline" }))}
                        >
                            Fermer
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogueVersements !== null} onOpenChange={(ouvert) => !ouvert && fermerVersements()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Versements</DialogTitle>
                        <DialogDescription>
                            {dialogueVersements?.client.fullname} — {dialogueVersements?.formation.titre}
                        </DialogDescription>
                    </DialogHeader>

                    {chargementVersements ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : detailVersements ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
                                <span className="text-muted-foreground">
                                    {formaterFcfa(detailVersements.montant_paye)} / {formaterFcfa(detailVersements.montant_total)} payé
                                </span>
                                <span className="font-semibold">
                                    Reste : {formaterFcfa(detailVersements.reste_a_payer)}
                                </span>
                            </div>

                            {detailVersements.versements.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground">
                                    Aucun versement enregistré pour l&apos;instant.
                                </p>
                            ) : (
                                <ul className="max-h-48 space-y-2 overflow-y-auto">
                                    {detailVersements.versements.map((versement) => (
                                        <li
                                            key={versement.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-semibold tabular-nums">
                                                    {formaterFcfa(Number(versement.montant))}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {formaterDateCourte(versement.date_versement)}
                                                    {versement.note ? ` — ${versement.note}` : ""}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={suppressionEnCours === versement.id}
                                                onClick={() => retirerVersement(versement)}
                                                aria-label="Supprimer ce versement"
                                                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                                <div>
                                    <Label htmlFor="montant-versement">Montant (FCFA) *</Label>
                                    <Input
                                        id="montant-versement"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        value={montantVersement}
                                        onChange={(e) => setMontantVersement(e.target.value)}
                                        placeholder="20000"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="date-versement">Date</Label>
                                    <Input
                                        id="date-versement"
                                        type="date"
                                        value={dateVersement}
                                        onChange={(e) => setDateVersement(e.target.value)}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="note-versement">Note</Label>
                                    <Input
                                        id="note-versement"
                                        value={noteVersement}
                                        onChange={(e) => setNoteVersement(e.target.value)}
                                        placeholder="Acompte"
                                        className="mt-2"
                                    />
                                </div>
                            </div>

                            {erreurVersement && (
                                <p role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                                    {erreurVersement}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-destructive">
                            {erreurVersement ?? "Impossible de charger les versements."}
                        </p>
                    )}

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={fermerVersements}
                            className={cn(buttonVariants({ variant: "outline" }))}
                        >
                            Fermer
                        </button>
                        <button
                            type="button"
                            disabled={!montantVersement.trim() || envoiVersement || chargementVersements}
                            onClick={envoyerVersement}
                            className={cn(buttonVariants())}
                        >
                            {envoiVersement ? "Enregistrement…" : "Ajouter le versement"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}