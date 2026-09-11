"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Car,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterDateCourte, formaterFcfa, LIBELLES_ROLE, urlPhoto } from "@/lib/utils";
import {
  libelleVehicule,
  photoPrincipale,
  STYLE_STATUT,
  STYLE_VALIDATION,
} from "@/lib/vehicule";
import type { RoleUser, StatutValidation, StatutVehicule, VehiculeAdmin } from "@/types";

/** Même contrat que GET /admin/vehicules. */
const recupererVehiculesAdmin = async (): Promise<VehiculeAdmin[]> => {
  const reponse = await api.get<{ data: VehiculeAdmin[] }>("admin/vehicules");
  return reponse.data;
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

const restaurerVehiculeAdmin = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`/admin/vehicules/${id}/restaurer`)
}

/** Même contrat que DELETE /admin/vehicules/{id}. */
const supprimerVehiculeAdmin = async (id: string): Promise<void> => {
  await api.delete<{ message: string }>(`admin/vehicules/${id}`);
};

/** L'input `<select>` natif n'a pas de valeur "tout" possible : on la porte au niveau du filtre. */
const OPTIONS_STATUT: { valeur: StatutVehicule | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Tous les statuts" },
  { valeur: "disponible", libelle: "Disponible" },
  { valeur: "a_venir", libelle: "À venir" },
  { valeur: "réservé", libelle: "Réservé" },
  { valeur: "vendu", libelle: "Vendu" },
  { valeur: "loué", libelle: "Loué" },
  { valeur: "suspendu", libelle: "Suspendu" },
  { valeur: "banni", libelle: "Banni" },
  { valeur: "en_transaction", libelle: "En transaction" },
];

const OPTIONS_VALIDATION: { valeur: StatutValidation | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Toute validation" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "validee", libelle: "Validé" },
  { valeur: "rejetee", libelle: "Rejeté" },
  { valeur: "suspendu", libelle: "Suspendu" },
  { valeur: "restauree", libelle: "Restauré" },
];

/** Client, admin et auto_ecole ne publient jamais de véhicule (règle métier) : pas d'option pour ces trois rôles. */
const OPTIONS_ROLE: { valeur: RoleUser | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Tous les vendeurs" },
  { valeur: "vendeur", libelle: LIBELLES_ROLE.vendeur },
  { valeur: "concessionnaire", libelle: LIBELLES_ROLE.concessionnaire },
];

type DialogueRejet = { vehicule: VehiculeAdmin };
type DialogueConfirmation = { action: "valider" | "suspendre" | "restaurer" | "supprimer"; vehicule: VehiculeAdmin };

export default function PageParcAuto() {
  const [vehicules, setVehicules] = useState<VehiculeAdmin[]>([]);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<StatutVehicule | "tout">("tout");
  const [filtreValidation, setFiltreValidation] = useState<StatutValidation | "tout">("tout");
  const [filtreRole, setFiltreRole] = useState<RoleUser | "tout">("tout");
  const [idEnCours, setIdEnCours] = useState<string | null>(null);
  const [dialogueRejet, setDialogueRejet] = useState<DialogueRejet | null>(null);
  const [motifRejet, setMotifRejet] = useState("");
  const [dialogueConfirmation, setDialogueConfirmation] = useState<DialogueConfirmation | null>(null);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererVehiculesAdmin().then((liste) => {
      if (annule) return;
      setVehicules(liste);
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

  /** Comptes sur `vehicules` (liste complète, non filtrée) — les cards restent stables quand on tape dans la recherche. */
  const compteurs = useMemo(
    () => ({
      enAttente: vehicules.filter((v) => v.status_validation === "en_attente").length,
      disponibles: vehicules.filter((v) => v.statut === "disponible").length,
      suspendus: vehicules.filter((v) => v.statut === "suspendu").length,
    }),
    [vehicules]
  );

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();

    return vehicules.filter((v) => {
      if (filtreStatut !== "tout" && v.statut !== filtreStatut) return false;
      if (filtreValidation !== "tout" && v.status_validation !== filtreValidation) return false;
      if (filtreRole !== "tout" && v.creator.role !== filtreRole) return false;

      if (q) {
        const cible =
          `${v.description?.marque ?? ""} ${v.description?.modele ?? ""} ${v.creator.fullname}`.toLowerCase();
        if (!cible.includes(q)) return false;
      }

      return true;
    });
  }, [vehicules, filtreStatut, filtreValidation, filtreRole, recherche]);

  const confirmerRejet = async () => {
    if (!dialogueRejet) return;
    const id = dialogueRejet.vehicule.id;
    setIdEnCours(id);
    try {
      await rejeterVehiculeAdmin(id, motifRejet);
      setVehicules((liste) =>
        liste.map((v) => (v.id === id ? { ...v, status_validation: "rejetee" } : v))
      );
      setDialogueRejet(null);
      setMotifRejet("");
      toast.success("Véhicule rejeté.");
    } catch (e) {
      toast.error(messageErreur(e, "Le rejet a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  const confirmerAction = async () => {
    if (!dialogueConfirmation) return;
    const { action, vehicule } = dialogueConfirmation;
    setIdEnCours(vehicule.id);
    try {
      if (action === "valider") {
        await validerVehiculeAdmin(vehicule.id);
        setVehicules((liste) =>
          liste.map((v) => (v.id === vehicule.id ? { ...v, status_validation: "validee" } : v))
        );
        toast.success("Véhicule validé.");
      } else if (action === "suspendre") {
        await suspendreVehiculeAdmin(vehicule.id);
        setVehicules((liste) =>
          liste.map((v) => (v.id === vehicule.id ? { ...v, statut: "suspendu" } : v))
        );
        toast.success("Véhicule suspendu.");
      } else if (action === "restaurer") {
        await restaurerVehiculeAdmin(vehicule.id);
        setVehicules((l) =>
          l.map((v) => (v.id === vehicule.id ? { ...v, statut: "disponible" } : v))
        );
        toast.success("Véhicule restauré.");
      }
      else {
        await supprimerVehiculeAdmin(vehicule.id);
        setVehicules((liste) => liste.filter((v) => v.id !== vehicule.id));
        toast.success("Véhicule supprimé.");
      }
      setDialogueConfirmation(null);
    } catch (e) {
      toast.error(messageErreur(e, "L'action a échoué."));
    } finally {
      setIdEnCours(null);
    }
  };

  if (chargement) {
    return (
      <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-8 h-12 w-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Parc auto</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {vehicules.length} annonce{vehicules.length > 1 ? "s" : ""}, tous vendeurs
            confondus — particuliers, concessionnaires et auto-écoles.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteStat
          libelle="Annonces au total"
          valeur={vehicules.length}
          icone={Car}
          precision="Tous vendeurs confondus"
        />
        <CarteStat
          libelle="En attente de validation"
          valeur={compteurs.enAttente}
          icone={ClipboardCheck}
          precision="Modération à traiter"
          accent={compteurs.enAttente > 0}
        />
        <CarteStat
          libelle="Disponibles"
          valeur={compteurs.disponibles}
          icone={CheckCircle2}
          precision="Visibles dans le catalogue public"
        />
        <CarteStat
          libelle="Suspendues"
          valeur={compteurs.suspendus}
          icone={Ban}
          precision="Retirées du catalogue public"
        />
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Marque, modèle, vendeur…"
            className="pl-9"
          />
        </div>

        <Select value={filtreRole} onValueChange={(v) => v && setFiltreRole(v as RoleUser | "tout")}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS_ROLE.map((o) => (
              <SelectItem key={o.valeur} value={o.valeur}>
                {o.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtreStatut} onValueChange={(v) => v && setFiltreStatut(v as StatutVehicule | "tout")}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS_STATUT.map((o) => (
              <SelectItem key={o.valeur} value={o.valeur}>
                {o.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtreValidation}
          onValueChange={(v) => v && setFiltreValidation(v as StatutValidation | "tout")}
        >
          <SelectTrigger className="sm:w-52">
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

      {resultats.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Car className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">Aucun véhicule ne correspond</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Élargissez la recherche ou réinitialisez les filtres.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Véhicule</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead className="text-right">Vues</TableHead>
                <TableHead>Publié le</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultats.map((v) => {
                const libelle = libelleVehicule(v.description, v.id);
                const photo = photoPrincipale(v.photos);
                const enCours = idEnCours === v.id;

                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {photo ? (
                            // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
                            <img src={urlPhoto(photo.path)} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-muted-foreground">
                              <Car className="size-4" />
                            </span>
                          )}
                        </span>
                        <Link
                          href={`/admin/parc-auto/${v.id}`}
                          className="truncate text-sm font-semibold hover:text-primary"
                        >
                          {libelle}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.creator.fullname}
                      <span className="block text-xs">{LIBELLES_ROLE[v.creator.role]}</span>
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {formaterFcfa(Number(v.prix))}
                    </TableCell>
                    <TableCell>
                      <Badge className={STYLE_STATUT[v.statut].classes}>{STYLE_STATUT[v.statut].libelle}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STYLE_VALIDATION[v.status_validation].classes}>
                        {STYLE_VALIDATION[v.status_validation].libelle}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {v.views_count.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formaterDateCourte(v.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={enCours}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                          aria-label={`Actions pour ${libelle}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLinkItem
                            render={<Link href={`/admin/parc-auto/${v.id}`} />}
                          >
                            <ExternalLink className="size-4" />
                            Voir la fiche
                          </DropdownMenuLinkItem>

                          {v.status_validation === "en_attente" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDialogueConfirmation({ action: "valider", vehicule: v })}
                              >
                                <CheckCircle2 className="size-4" />
                                Valider
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setDialogueRejet({ vehicule: v });
                                  setMotifRejet("");
                                }}
                              >
                                <XCircle className="size-4" />
                                Rejeter
                              </DropdownMenuItem>
                            </>
                          )}

                          {v.statut !== "suspendu" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDialogueConfirmation({ action: "suspendre", vehicule: v })}
                              >
                                <Ban className="size-4" />
                                Suspendre
                              </DropdownMenuItem>
                            </>
                          )}

                          {v.statut == "suspendu" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDialogueConfirmation({ action: "restaurer", vehicule: v })}
                              >
                                <RotateCcw className="size-4" />
                                Restaurer
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDialogueConfirmation({ action: "supprimer", vehicule: v })}
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
      )}

      {/* Rejet : le back exige un motif (`details`, requis, 500 caractères max) */}
      <Dialog
        open={dialogueRejet !== null}
        onOpenChange={(ouvert) => !ouvert && setDialogueRejet(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter cette annonce</DialogTitle>
            <DialogDescription>
              {dialogueRejet && libelleVehicule(dialogueRejet.vehicule.description, dialogueRejet.vehicule.id)}
              {" — le motif est transmis au concessionnaire."}
            </DialogDescription>
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

      {/* Suspendre / Supprimer : simple confirmation, pas de champ à saisir */}
      <AlertDialog
        open={dialogueConfirmation !== null}
        onOpenChange={(ouvert) => !ouvert && setDialogueConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogueConfirmation?.action === "supprimer" ? "Supprimer cette annonce ?" :
               dialogueConfirmation?.action === "restaurer" ? "Restaurer ce véhicule ?" :
               dialogueConfirmation?.action === "valider" ? "Valider cette annonce ?" :
              "Suspendre cette annonce ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogueConfirmation &&
                libelleVehicule(
                  dialogueConfirmation.vehicule.description,
                  dialogueConfirmation.vehicule.id
                )}
              {dialogueConfirmation?.action === "supprimer"
                ? " — l'annonce quitte définitivement le parc auto. Cette action est irréversible."
                : dialogueConfirmation?.action === "restaurer"
                ? " — l'annonce réapparaît dans le catalogue public."
                : dialogueConfirmation?.action === "valider"
                ? " — l'annonce devient visible dans le catalogue public."
                : " — l'annonce reste en ligne mais n'apparaît plus dans le catalogue public."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant={dialogueConfirmation?.action === "supprimer" ? "destructive" : "default"}
              disabled={idEnCours !== null}
              onClick={confirmerAction}
            >
              {dialogueConfirmation?.action === "supprimer" ? "Supprimer" :
               dialogueConfirmation?.action === "restaurer" ? "Restaurer" :
               dialogueConfirmation?.action === "valider" ? "Valider" :
               "Suspendre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
