"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Check, ClipboardCheck, RotateCcw, ShieldAlert, Users } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterMoisAnnee, LIBELLES_ROLE } from "@/lib/utils";
import type {
  Paginateur,
  RoleUser,
  StatsAdmin,
  StatutUser,
  UtilisateurAdmin,
} from "@/types";

type Filtres = { role: RoleUser | "tout"; statut: StatutUser | "tout" };

/** Libellé de chaque `reason_code` accepté par reasonCodeValide() côté backend (AdminController.php). */
const LIBELLES_REASON_CODE: Record<string, string> = {
  spam: "Spam",
  fraude: "Fraude",
  contenu_inapproprie: "Contenu inapproprié",
  non_respect_cgu: "Non-respect des CGU",
  comportement_frauduleux: "Comportement frauduleux",
  autre: "Autre",
};

/** Libellé + couleur des 4 valeurs de `StatutUser`. Local à cette page : aucune autre n'affiche un statut de compte. */
const STYLE_STATUT_USER: Record<StatutUser, { libelle: string; classes: string }> = {
  actif: { libelle: "Actif", classes: "bg-accent text-accent-foreground" },
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  suspendu: { libelle: "Suspendu", classes: "bg-destructive/10 text-destructive" },
  banni: { libelle: "Banni", classes: "bg-foreground text-background" },
};

/** Même contrat que GET /admin/users?page=&role=&statut= : `data` reste le paginateur Laravel tel quel. */
const recupererUtilisateurs = async (
  page: number,
  filtres: Filtres
): Promise<Paginateur<UtilisateurAdmin>> => {
  const params = new URLSearchParams({ page: String(page) });
  if (filtres.role !== "tout") params.set("role", filtres.role);
  if (filtres.statut !== "tout") params.set("statut", filtres.statut);

  const reponse = await api.get<{ data: Paginateur<UtilisateurAdmin> }>(
    `admin/users?${params}`
  );
  return reponse.data;
};

/** Même contrat que GET /admin/stats — voir dashboard/page.tsx. */
const recupererStatsAdmin = async (): Promise<StatsAdmin> => {
  const reponse = await api.get<{ data: StatsAdmin }>("admin/stats");
  return reponse.data;
};

/** Même contrat que POST /admin/users/{id}/suspendre|bannir|restaurer, corps `{ details? }`. */
const changerStatutUtilisateur = async (
  id: string,
  action: "suspendre" | "bannir" | "restaurer",
  details: string,
  reason_code?: string
): Promise<void> => {
  await api.post<{ message: string }>(`admin/users/${id}/${action}`, { details, reason_code });
};

/** Même contrat que POST /admin/users/{id}/valider — aucun corps, réservé aux comptes `en_attente`. */
const validerCompteUtilisateur = async (id: string): Promise<void> => {
  await api.post<{ message: string }>(`admin/users/${id}/valider`);
};

type PanneauOuvert = "aucun" | "suspendre" | "bannir" | "restaurer";

const LigneUtilisateur = ({
  utilisateur,
  onSuspendre,
  onBannir,
  onRestaurer,
  onValider,
}: {
  utilisateur: UtilisateurAdmin;
  onSuspendre: (id: string, details: string, reason_code: string) => Promise<void>;
  onBannir: (id: string, details: string, reason_code: string) => Promise<void>;
  onRestaurer: (id: string, details: string) => Promise<void>;
  onValider: (id: string) => Promise<void>;
}) => {
  const [panneau, setPanneau] = useState<PanneauOuvert>("aucun");
  const [details, setDetails] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const statut = STYLE_STATUT_USER[utilisateur.statut];

  const soumettre = async (action: () => Promise<void>) => {
    setEnvoi(true);
    try {
      await action();
      setPanneau("aucun");
      setDetails("");
      setReasonCode("");
    } catch (e) {
      toast.error(messageErreur(e, "L'opération a échoué. Réessayez dans un instant."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <li className="rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/utilisateurs/${utilisateur.id}`}
              className="lien-anime truncate font-semibold hover:text-primary"
            >
              {utilisateur.fullname}
            </Link>
            <Badge variant="secondary">{LIBELLES_ROLE[utilisateur.role]}</Badge>
            <Badge className={statut.classes}>{statut.libelle}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {utilisateur.email}
            {utilisateur.telephone && ` · ${utilisateur.telephone}`}
          </p>
          {/* raison_sociale n'existe que pour concessionnaire/auto_ecole */}
          {utilisateur.raison_sociale && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {utilisateur.raison_sociale}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Membre depuis {formaterMoisAnnee(utilisateur.created_at)}
          </p>
        </div>

        {panneau === "aucun" && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {utilisateur.statut === "en_attente" && (
              <button
                type="button"
                disabled={envoi}
                onClick={() => soumettre(() => onValider(utilisateur.id))}
                className={cn(buttonVariants({ size: "sm" }), "effet-action")}
              >
                <Check className="size-4" />
                Valider
              </button>
            )}

            {(utilisateur.statut === "actif" || utilisateur.statut === "suspendu") && (
              <button
                type="button"
                onClick={() => setPanneau("bannir")}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-destructive hover:bg-destructive/10 hover:text-destructive"
                )}
              >
                <Ban className="size-4" />
                Bannir
              </button>
            )}

            {utilisateur.statut === "actif" && (
              <button
                type="button"
                onClick={() => setPanneau("suspendre")}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <ShieldAlert className="size-4" />
                Suspendre
              </button>
            )}

            {(utilisateur.statut === "suspendu" || utilisateur.statut === "banni") && (
              <button
                type="button"
                onClick={() => setPanneau("restaurer")}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <RotateCcw className="size-4" />
                Restaurer
              </button>
            )}
          </div>
        )}
      </div>

      {panneau !== "aucun" && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          {(panneau === "suspendre" || panneau === "bannir") && (
            <div className="mb-3">
              <Label htmlFor={`reason-${utilisateur.id}`} className="text-sm font-semibold">
                Catégorie du motif
              </Label>
              <Select
                value={reasonCode}
                onValueChange={(valeur) => valeur && setReasonCode(valeur)}
                items={LIBELLES_REASON_CODE}
              >
                <SelectTrigger id={`reason-${utilisateur.id}`} className="mt-2 w-full bg-background">
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">
                    spam
                  </SelectItem>
                  <SelectItem value="fraude">
                    fraude
                  </SelectItem>
                  <SelectItem value="contenu_inapproprie">
                    Contenu inapproprie
                  </SelectItem>
                  <SelectItem value="non_respect_cgu">
                    Non respect du cgu
                  </SelectItem>
                  <SelectItem value="comportement_frauduleux">
                    Comportement Frauduleux
                  </SelectItem>
                  <SelectItem value="autre">
                    Autre
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Label htmlFor={`details-${utilisateur.id}`} className="text-sm font-semibold">
            {panneau === "suspendre" && "Motif de la suspension"}
            {panneau === "bannir" && "Motif du bannissement"}
            {panneau === "restaurer" && "Note interne (facultative)"}
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Facultatif, 500 caractères maximum. L&apos;utilisateur reçoit ce
            motif dans sa notification.
          </p>
          <Input
            id={`details-${utilisateur.id}`}
            value={details}
            onChange={(evenement) => setDetails(evenement.target.value)}
            maxLength={500}
            className="mt-3 bg-background"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {/* ÉTAPE 3 : disabled — garder envoi, et ajouter un || — vrai quand (panneau === "suspendre" || panneau === "bannir") ET reasonCode === "" */}
            <button
              type="button"
              disabled={envoi || ((panneau === "suspendre" || panneau === "bannir") && reasonCode === "")}
              onClick={() =>
                soumettre(() => {
                  if (panneau === "suspendre") return onSuspendre(utilisateur.id, details, reasonCode);
                  if (panneau === "bannir") return onBannir(utilisateur.id, details, reasonCode);
                  return onRestaurer(utilisateur.id, details);
                })
              }
              className={cn(
                buttonVariants({
                  variant: panneau === "restaurer" ? "default" : "destructive",
                  size: "sm",
                }),
                "effet-action"
              )}
            >
              {envoi ? "Envoi…" : "Confirmer"}
            </button>
            <button
              type="button"
              disabled={envoi}
              onClick={() => {
                setPanneau("aucun");
                setDetails("");
              }}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

const PageUtilisateurs = () => {
  const [stats, setStats] = useState<StatsAdmin | null>(null);
  const [pagination, setPagination] = useState<Paginateur<UtilisateurAdmin> | null>(null);
  const [chargement, setChargement] = useState(true);
  const [filtres, setFiltres] = useState<Filtres>({ role: "tout", statut: "tout" });
  const [page, setPage] = useState(1);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche les deux useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  // Cartes de stats : comptes sur TOUS les utilisateurs, indépendant de la pagination/filtre affichés.
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
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererUtilisateurs(page, filtres).then((resultat) => {
      if (annule) return;
      setPagination(resultat);
      setChargement(false);
    });

    return () => {
      annule = true;
    };
  }, [page, filtres, tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  const modifierFiltres = (partiel: Partial<Filtres>) => {
    setFiltres((actuels) => ({ ...actuels, ...partiel }));
    setPage(1);
  };

  /**
   * Retrait optimiste du statut affiché : la liste est repaginée côté back
   * sur le FILTRE, pas sur le statut réel — sans ce correctif local, un
   * utilisateur suspendu resterait affiché "Actif" jusqu'au rechargement.
   */
  const majStatutLocal = (id: string, statut: StatutUser) => {
    setPagination((actuel) =>
      actuel && {
        ...actuel,
        data: actuel.data.map((utilisateur) =>
          utilisateur.id === id ? { ...utilisateur, statut } : utilisateur
        ),
      }
    );
  };

  const traiterSuspendre = async (id: string, details: string, reason_code: string) => {
    await changerStatutUtilisateur(id, "suspendre", details, reason_code);
    majStatutLocal(id, "suspendu");
    toast.success("Utilisateur suspendu.");
  };

  const traiterBannir = async (id: string, details: string, reason_code: string) => {
    await changerStatutUtilisateur(id, "bannir", details, reason_code);
    majStatutLocal(id, "banni");
    toast.success("Utilisateur banni.");
  };

  const traiterRestaurer = async (id: string, details: string) => {
    await changerStatutUtilisateur(id, "restaurer", details);
    majStatutLocal(id, "actif");
    toast.success("Utilisateur restauré.");
  };

  const traiterValider = async (id: string) => {
    await validerCompteUtilisateur(id);
    majStatutLocal(id, "actif");
    toast.success("Compte validé.");
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Utilisateurs</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {pagination
              ? `${pagination.total} compte${pagination.total > 1 ? "s" : ""} au total.`
              : "Monitoring des comptes."}
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      {stats ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CarteStat
            libelle="Comptes au total"
            valeur={Object.values(stats.users_par_statut).reduce((s, n) => s + (n ?? 0), 0)}
            icone={Users}
            precision="Tous rôles confondus"
          />
          <CarteStat
            libelle="En attente de validation"
            valeur={stats.users_par_statut.en_attente ?? 0}
            icone={ClipboardCheck}
            precision="Comptes partenaires à valider"
            accent={(stats.users_par_statut.en_attente ?? 0) > 0}
          />
          <CarteStat
            libelle="Suspendus"
            valeur={stats.users_par_statut.suspendu ?? 0}
            icone={ShieldAlert}
            precision="Accès restreint temporairement"
          />
          <CarteStat
            libelle="Bannis"
            valeur={stats.users_par_statut.banni ?? 0}
            icone={Ban}
            precision="Accès révoqué définitivement"
          />
        </section>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="w-44">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Rôle
          </Label>
          <Select
            value={filtres.role}
            onValueChange={(valeur) =>
              valeur && modifierFiltres({ role: valeur as Filtres["role"] })
            }
          >
            <SelectTrigger className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tout">Tous les rôles</SelectItem>
              {(Object.keys(LIBELLES_ROLE) as RoleUser[]).map((role) => (
                <SelectItem key={role} value={role}>
                  {LIBELLES_ROLE[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Statut
          </Label>
          <Select
            value={filtres.statut}
            onValueChange={(valeur) =>
              valeur && modifierFiltres({ statut: valeur as Filtres["statut"] })
            }
          >
            <SelectTrigger className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tout">Tous les statuts</SelectItem>
              {(Object.keys(STYLE_STATUT_USER) as StatutUser[]).map((statut) => (
                <SelectItem key={statut} value={statut}>
                  {STYLE_STATUT_USER[statut].libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {chargement || !pagination ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : pagination.data.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-xl font-bold">Aucun utilisateur</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucun compte ne correspond à ces filtres.
          </p>
        </section>
      ) : (
        <>
          <ul className="mt-8 space-y-4">
            {pagination.data.map((utilisateur) => (
              <LigneUtilisateur
                key={utilisateur.id}
                utilisateur={utilisateur}
                onSuspendre={traiterSuspendre}
                onBannir={traiterBannir}
                onRestaurer={traiterRestaurer}
                onValider={traiterValider}
              />
            ))}
          </ul>

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
    </main>
  );
};

export default PageUtilisateurs;
