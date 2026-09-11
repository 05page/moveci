"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Car, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterDateCourte, formaterFcfa, urlPhoto } from "@/lib/utils";
import { libelleVehicule, photoPrincipale, STYLE_STATUT } from "@/lib/vehicule";
import type { PostTypeVehicule, StatutVehicule, TypeVehicule, VehiculeFiche } from "@/types";

/** Même contrat que GET /vehicules/mes-vehicules — `data.stats` n'est pas utilisé ici. */
const recupererMesVehicules = async (): Promise<VehiculeFiche[]> => {
  const reponse = await api.get<{ data: { vehicules: VehiculeFiche[] } }>("vehicules/mes-vehicules");
  return reponse.data.vehicules;
};

/** Même contrat que DELETE /vehicules/{id} (VehiculesController::deleteVehicule). */
const supprimerMonVehicule = async (id: string): Promise<void> => {
  await api.delete<{ message: string }>(`vehicules/${id}`);
};

/**
 * `mesVehicules()` ne renvoie jamais suspendu/banni/en_transaction/réservé
 * (whereIn côté back, routes/api.php:78) : ces 4 statuts sont donc les seuls
 * pertinents ici, contrairement à OPTIONS_STATUT de /admin/parc-auto.
 */
const OPTIONS_STATUT: { valeur: StatutVehicule | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Tous les statuts" },
  { valeur: "disponible", libelle: "Disponible" },
  { valeur: "a_venir", libelle: "À venir" },
  { valeur: "vendu", libelle: "Vendu" },
  { valeur: "loué", libelle: "Loué" },
];

const OPTIONS_TYPE: { valeur: TypeVehicule | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Tous les véhicules" },
  { valeur: "neuf", libelle: "Neuf" },
  { valeur: "occasion", libelle: "Occasion" },
];

const OPTIONS_POST_TYPE: { valeur: PostTypeVehicule | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Vente et location" },
  { valeur: "vente", libelle: "À vendre" },
  { valeur: "location", libelle: "À louer" },
];

/** `?statut=` lié depuis vendeur/profile/page.tsx (CarteStat "Vendus"/"Loués") → valeur réelle de `StatutVehicule`. */
const STATUT_PAR_PARAM: Record<string, StatutVehicule> = { vendu: "vendu", loue: "loué" };

/** useSearchParams() exige un Suspense autour du composant qui l'appelle. */
const PageMesVehicules = () => (
  <Suspense fallback={null}>
    <ListeMesVehicules />
  </Suspense>
);

export default PageMesVehicules;

const ListeMesVehicules = () => {
  const searchParams = useSearchParams();

  const [vehicules, setVehicules] = useState<VehiculeFiche[] | undefined>(undefined);
  const [rechargement, setRechargement] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);
  const [idEnCours, setIdEnCours] = useState(false);
  // Init une seule fois depuis ?statut= (lien vendeur/profile) — l'utilisateur reprend la main ensuite via les Select.
  const [filtreStatut, setFiltreStatut] = useState<StatutVehicule | "tout">(
    () => STATUT_PAR_PARAM[searchParams.get("statut") ?? ""] ?? "tout"
  );
  const [filtreType, setFiltreType] = useState<TypeVehicule | "tout">("tout");
  const [filtrePostType, setFiltrePostType] = useState<PostTypeVehicule | "tout">("tout");

  useEffect(() => {
    let annule = false;

    recupererMesVehicules().then((resultat) => {
      if (annule) return;
      setVehicules(resultat);
      setRechargement(false);
    });

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setRechargement(true);
    setTentative((t) => t + 1);
  };

  const confirmerSuppression = async () => {
    if (!idASupprimer) return;
    setIdEnCours(true);
    try {
      await supprimerMonVehicule(idASupprimer);
      setVehicules((liste) => liste?.filter((v) => v.id !== idASupprimer));
      setIdASupprimer(null);
      toast.success("Annonce supprimée.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "La suppression a échoué."));
    } finally {
      setIdEnCours(false);
    }
  };

  const vehiculeASupprimer = vehicules?.find((v) => v.id === idASupprimer);

  const filtresActifs = filtreStatut !== "tout" || filtreType !== "tout" || filtrePostType !== "tout";

  const reinitialiserFiltres = () => {
    setFiltreStatut("tout");
    setFiltreType("tout");
    setFiltrePostType("tout");
  };

  const vehiculesAffiches = useMemo(() => {
    return vehicules?.filter((v) => {
      if (filtreStatut !== "tout" && v.statut !== filtreStatut) return false;
      if (filtreType !== "tout" && v.type !== filtreType) return false;
      if (filtrePostType !== "tout" && v.post_type !== filtrePostType) return false;
      return true;
    });
  }, [vehicules, filtreStatut, filtreType, filtrePostType]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Mes véhicules</h1>
        <div className="flex items-center gap-3">
          <BoutonRecharger onClick={recharger} chargement={rechargement} />
          <Link
            href="/vendeur/post-vehicule"
            className={cn(buttonVariants(), "effet-action")}
          >
            <Plus className="size-4" />
            Publier un véhicule
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={filtrePostType} onValueChange={(v) => v && setFiltrePostType(v as PostTypeVehicule | "tout")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS_POST_TYPE.map((o) => (
              <SelectItem key={o.valeur} value={o.valeur}>
                {o.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtreType} onValueChange={(v) => v && setFiltreType(v as TypeVehicule | "tout")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS_TYPE.map((o) => (
              <SelectItem key={o.valeur} value={o.valeur}>
                {o.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtreStatut} onValueChange={(v) => v && setFiltreStatut(v as StatutVehicule | "tout")}>
          <SelectTrigger className="sm:w-48">
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

        {filtresActifs && (
          <button
            type="button"
            onClick={reinitialiserFiltres}
            className="lien-anime inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground sm:self-auto"
          >
            <X className="size-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {vehiculesAffiches === undefined ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : vehiculesAffiches.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Car className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold">
            {filtresActifs ? "Aucun véhicule ne correspond" : "Aucun véhicule publié"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {filtresActifs
              ? "Aucune annonce ne correspond à ces filtres pour le moment."
              : "Publie ta première annonce pour qu’elle apparaisse ici."}
          </p>
          {filtresActifs ? (
            <button
              type="button"
              onClick={reinitialiserFiltres}
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "effet-action mt-8")}
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <Link
              href="/vendeur/post-vehicule"
              className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
            >
              <Plus className="size-4" />
              Publier un véhicule
            </Link>
          )}
        </section>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehiculesAffiches.map((vehicule) => {
            const libelle = libelleVehicule(vehicule.description, vehicule.id);
            const photo = photoPrincipale(vehicule.photos);

            return (
              <div
                key={vehicule.id}
                className="group relative overflow-hidden rounded-2xl border border-border transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <Link href={`/vendeur/vehicule/${vehicule.id}`} className="block">
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {photo ? (
                      // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
                      <img
                        src={urlPhoto(photo.path)}
                        alt={libelle}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-muted-foreground">
                        <Car className="size-10" />
                      </span>
                    )}
                    <Badge className={cn(STYLE_STATUT[vehicule.statut].classes, "absolute left-3 top-3")}>
                      {STYLE_STATUT[vehicule.statut].libelle}
                    </Badge>
                  </div>

                  <div className="p-4">
                    <h2 className="truncate font-heading text-base font-bold">{libelle}</h2>
                    <p className="mt-1 font-heading text-lg font-bold tabular-nums">
                      {formaterFcfa(Number(vehicule.prix))}
                      {vehicule.post_type === "location" && (
                        <span className="text-xs font-normal text-muted-foreground"> / jour</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Publié le {formaterDateCourte(vehicule.created_at)} ·{" "}
                      {vehicule.views_count.toLocaleString("fr-FR")} vues
                    </p>
                  </div>
                </Link>

                {/* Sibling du Link (pas nesté dedans) : positionné par-dessus via absolute, pas de <button> imbriqué dans un <a> */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Actions pour ${libelle}`}
                    className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur transition-colors hover:text-primary"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLinkItem render={<Link href={`/vendeur/vehicule/${vehicule.id}/modifier`} />}>
                      <Pencil className="size-4" />
                      Modifier
                    </DropdownMenuLinkItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setIdASupprimer(vehicule.id)}>
                      <Trash2 className="size-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={idASupprimer !== null} onOpenChange={(ouvert) => !ouvert && setIdASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              {vehiculeASupprimer && libelleVehicule(vehiculeASupprimer.description, vehiculeASupprimer.id)} — cette
              action est définitive, l&apos;annonce ne peut pas être restaurée.
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
