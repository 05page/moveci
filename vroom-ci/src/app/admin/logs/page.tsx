"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Car,
  Flag,
  GraduationCap,
  Handshake,
  ScrollText,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, etiquetteJour, formaterDateHeure, grouperParJour, initiales } from "@/lib/utils";
import type { ActivityLogEntry, Paginateur } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   JOURNAL D'ACTIVITÉ — /admin/logs
   Miroir de AdminController::activityLog() — routes/api.php (GET /admin/activity-log).
   Paginé comme admin/utilisateurs/page.tsx (Paginateur<T>).

   Public : des admins métier, pas des développeurs — donc pas de vocabulaire
   technique (pas de "diff", pas de nom de classe brut, pas de jargon logs).
   Présenté en frise chronologique groupée par jour, dans le même registre
   visuel (gold/menthe, angles nets) que le reste de /admin.
   ──────────────────────────────────────────────────────────────────────────── */

/** Même contrat que GET /admin/activity-log?page= : `data` reste le paginateur Laravel tel quel. */
const recupererActivityLog = async (page: number): Promise<Paginateur<ActivityLogEntry>> => {
  const reponse = await api.get<{ data: Paginateur<ActivityLogEntry> }>(
    `admin/activity-log?page=${page}`
  );
  return reponse.data;
};

/** "App\\Models\\Vehicules" -> "Vehicules", puis vers un libellé lisible par un non-développeur. */
const nomClasse = (subjectType: string) => subjectType.split("\\").pop() ?? subjectType;

const LIBELLE_MODELE: Record<string, string> = {
  Vehicules: "Véhicule",
  User: "Utilisateur",
  TransactionConclue: "Transaction",
  RendezVous: "Rendez-vous",
  Formation: "Formation",
  Signalement: "Signalement",
};

const ICONE_MODELE: Record<string, LucideIcon> = {
  Vehicules: Car,
  User: UserIcon,
  TransactionConclue: Handshake,
  RendezVous: Calendar,
  Formation: GraduationCap,
  Signalement: Flag,
};

const STYLE_EVENT: Record<string, { libelle: string; classes: string }> = {
  created: { libelle: "Création", classes: "bg-accent text-accent-foreground" },
  updated: { libelle: "Modification", classes: "bg-secondary text-secondary-foreground" },
  deleted: { libelle: "Suppression", classes: "bg-destructive/10 text-destructive" },
};

/** Fond + couleur du nœud de frise (le rond qui porte l'icône) — dérivé de STYLE_EVENT mais plus contrasté, un badge se lit mal en cercle plein. */
const STYLE_NOEUD: Record<string, string> = {
  created: "bg-primary/15 text-primary",
  updated: "bg-muted text-muted-foreground",
  deleted: "bg-destructive/10 text-destructive",
};

/** "prix" -> "Prix" : les clés brutes de la base ne veulent rien dire pour un admin métier. */
const libelleChamp = (cle: string) =>
  cle.charAt(0).toUpperCase() + cle.slice(1).replace(/_/g, " ");

/** Ce qui a changé, en puces compactes : "Prix : 150 000 → 175 000". */
function Modifications({ properties }: { properties: ActivityLogEntry["properties"] }) {
  const cles = Array.from(
    new Set([...Object.keys(properties.old ?? {}), ...Object.keys(properties.attributes ?? {})])
  );
  if (cles.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {cles.map((cle) => {
        const avant = properties.old?.[cle];
        const apres = properties.attributes?.[cle];
        return (
          <span
            key={cle}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
          >
            <span className="font-semibold text-foreground">{libelleChamp(cle)}</span>
            {avant !== undefined && (
              <span className="text-muted-foreground">{String(avant) || "(vide)"}</span>
            )}
            {avant !== undefined && apres !== undefined && (
              <ArrowRight className="size-3 text-muted-foreground" />
            )}
            {apres !== undefined && <span className="text-foreground">{String(apres) || "(vide)"}</span>}
          </span>
        );
      })}
    </div>
  );
}

/** Un nœud de la frise : icône colorée selon l'évènement, relié au suivant par un fil vertical (absent sur le dernier de la journée). */
function LigneLog({ entry, estDernier }: { entry: ActivityLogEntry; estDernier: boolean }) {
  const classe = nomClasse(entry.subject_type);
  const Icone = ICONE_MODELE[classe] ?? ScrollText;
  const styleEvent = entry.event ? STYLE_EVENT[entry.event] : undefined;
  const classeNoeud = (entry.event && STYLE_NOEUD[entry.event]) || "bg-muted text-muted-foreground";

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!estDernier && (
        <span aria-hidden className="absolute left-[21px] top-11 bottom-0 w-px bg-border" />
      )}

      <span
        className={cn(
          "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full ring-4 ring-muted/30",
          classeNoeud
        )}
      >
        <Icone className="size-5" />
      </span>

      <div className="min-w-0 flex-1 rounded-2xl pt-1.5 pb-1 transition-colors hover:bg-muted/40 sm:px-4 sm:-mx-4">
        <div className="flex flex-wrap items-center gap-2">
          {styleEvent && <Badge className={styleEvent.classes}>{styleEvent.libelle}</Badge>}
          <Badge variant="outline">{LIBELLE_MODELE[classe] ?? classe}</Badge>
          <span className="text-xs text-muted-foreground">
            {formaterDateHeure(entry.created_at)}
          </span>
        </div>

        <p className="mt-2 text-sm font-medium">{entry.description}</p>

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {entry.causer ? initiales(entry.causer.fullname) : "?"}
          </span>
          {entry.causer?.fullname ?? "Action automatique du système"}
        </div>

        <Modifications properties={entry.properties} />
      </div>
    </li>
  );
}

const SquelettesJournee = () => (
  <div className="space-y-8">
    {Array.from({ length: 2 }).map((_, indexJournee) => (
      <div key={indexJournee}>
        <Skeleton className="h-6 w-28 rounded-full" />
        <div className="mt-5 space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-4">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const PageLogs = () => {
  const [pagination, setPagination] = useState<Paginateur<ActivityLogEntry> | null>(null);
  const [chargement, setChargement] = useState(true);
  const [page, setPage] = useState(1);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererActivityLog(page).then((resultat) => {
      if (annule) return;
      setPagination(resultat);
      setChargement(false);
    });

    return () => {
      annule = true;
    };
  }, [page, tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  const groupes = pagination ? grouperParJour(pagination.data, (entry) => entry.created_at) : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ScrollText className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl">Journal d&apos;activité</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {pagination
                ? `${pagination.total} action${pagination.total > 1 ? "s" : ""} enregistrée${pagination.total > 1 ? "s" : ""}.`
                : "Historique des actions importantes sur la plateforme."}
            </p>
          </div>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      {chargement || !pagination ? (
        <div className="mt-10">
          <SquelettesJournee />
        </div>
      ) : pagination.data.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ScrollText className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-xl font-bold">Aucun évènement</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Rien à signaler pour l&apos;instant.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-10">
            {groupes.map((groupe, indexGroupe) => (
              <section key={groupe.jour} className={indexGroupe > 0 ? "mt-10" : ""}>
                <h2 className="sticky top-[4.25rem] z-20 inline-block rounded-full border border-border bg-background/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur">
                  {etiquetteJour(groupe.jour)}
                </h2>
                <ul className="mt-5">
                  {groupe.elements.map((entry, index) => (
                    <LigneLog
                      key={entry.id}
                      entry={entry}
                      estDernier={index === groupe.elements.length - 1}
                    />
                  ))}
                </ul>
              </section>
            ))}
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
    </main>
  );
};

export default PageLogs;
