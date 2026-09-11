"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Car, Mail, MapPin, Phone, Send, Trash2, Users } from "lucide-react";

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
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { LIBELLES_TYPE_RDV, STYLE_STATUT_RDV } from "@/lib/rdv";
import {
  cn,
  formaterDateHeure,
  formaterFcfa,
  formaterMoisAnnee,
  initiales,
} from "@/lib/utils";
import { libelleVehicule } from "@/lib/vehicule";
import type { CrmClientDetail, ErreurAuth, CrmNote, StatutTransaction } from "@/types";

/** Petit à petit, comme STYLE_STATUT_RDV (src/lib/rdv.ts) mais pour `TransactionConclue.statut`. */
const STYLE_STATUT_TRANSACTION: Record<StatutTransaction, { libelle: string; classes: string }> = {
  en_attente: { libelle: "En attente", classes: "bg-secondary text-secondary-foreground" },
  confirmé: { libelle: "Confirmé", classes: "bg-accent text-accent-foreground" },
  expiré: { libelle: "Expiré", classes: "bg-destructive/10 text-destructive" },
  refusé: { libelle: "Refusé", classes: "bg-destructive/10 text-destructive" },
};

/** Même contrat que GET /crm/clients/{clientId} : `null` sur un 404 (pas de relation avec ce client). */
const recupererClientDetail = async (id: string): Promise<CrmClientDetail | null> => {
  try {
    const reponse = await api.get<{ data: CrmClientDetail }>(`crm/clients/${id}`)

    return reponse.data; // ← à remplacer par le retour de l'ÉTAPE 1
  } catch {
    return null;
  }
};

type ParametresPage = { params: Promise<{ id: string }> };

const PageFicheClient = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <FicheClient key={id} id={id} />;
};

export default PageFicheClient;

const FicheClient = ({ id }: { id: string }) => {
  const [detail, setDetail] = useState<CrmClientDetail | null | undefined>(undefined);
  const [tentative, setTentative] = useState(0);
  const [rechargement, setRechargement] = useState(false);

  const [nouvelleNote, setNouvelleNote] = useState("");
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  const [noteEnEdition, setNoteEnEdition] = useState<string | null>(null);
  const [texteEdition, setTexteEdition] = useState("");
  const [editionEnCours, setEditionEnCours] = useState(false);

  const [noteASupprimer, setNoteASupprimer] = useState<string | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const [erreurNote, setErreurNote] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    recupererClientDetail(id).then((resultat) => {
      if (annule) return;
      setDetail(resultat);
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

  if (detail === undefined) return <SkeletonFiche />;
  if (detail === null) return <FicheIntrouvable />;

  const { client, rdvs, transactions, notes, stats } = detail;

  const soumettreNouvelleNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nouvelleNote.trim() || ajoutEnCours) return;
    setErreurNote(null);
    try {
      const reponse = await api.post<{ data: CrmNote }>(`crm/clients/${id}/notes`, { contenu: nouvelleNote.trim() })
      setDetail((d) => d && { ...d, notes: [reponse.data, ...d.notes] })
      setNouvelleNote("");
      toast.success("Note ajoutée.");
    } catch (erreurCatch) {
      const message = (erreurCatch as ErreurAuth).message ?? "L'ajout de la note a échoué.";
      setErreurNote(message);
      toast.error(message);
    } finally {
      setAjoutEnCours(false)
    }
  };

  const ouvrirEdition = (note: CrmNote) => {
    setNoteEnEdition(note.id);
    setTexteEdition(note.contenu);
  };

  const soumettreEdition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!texteEdition.trim() || !noteEnEdition || editionEnCours) return;
    setErreurNote(null);
    try {
      const reponse = await api.put<{ data: CrmNote }>(`crm/notes/${noteEnEdition}`, { contenu: texteEdition.trim() })
      setDetail((d) => d && {
        ...d,
        notes: d.notes.map((n) => (n.id === noteEnEdition ? reponse.data : n)),
      });
      setNoteEnEdition(null);
      toast.success("Note modifiée.");
    } catch (erreurCatch) {
      const message = (erreurCatch as ErreurAuth).message ?? "L'édition de la note a échouée.";
      setErreurNote(message);
      toast.error(message);
    } finally {
      setEditionEnCours(false)
    }
  };

  const confirmerSuppression = async () => {
    if (!noteASupprimer) return;
    setSuppressionEnCours(true);

    try {
      await api.delete(`crm/notes/${noteASupprimer}`)
      setDetail((d) => d && {
        ...d,
        notes: d.notes.filter((note) => note.id !== noteASupprimer),
      });
      setNoteASupprimer(null);
      toast.success("Note supprimée.");
    } catch (erreurCatch) {
      toast.error((erreurCatch as ErreurAuth).message ?? "La suppression a échoué.");
    } finally {
      setSuppressionEnCours(false)
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/vendeur/clients"
          className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour à mes clients
        </Link>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>

      <section className="mt-6 flex flex-col gap-5 rounded-2xl border border-border p-6 sm:flex-row sm:items-center">
        {client.avatar ? (
          // <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns
          <img src={client.avatar} alt="" className="size-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {initiales(client.fullname)}
          </span>
        )}

        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold">{client.fullname}</h1>
          <p className="text-xs text-muted-foreground">
            Client depuis {formaterMoisAnnee(client.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" />
              {client.email}
            </span>
            {client.telephone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" />
                {client.telephone}
              </span>
            )}
            {client.adresse && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {client.adresse}
              </span>
            )}
          </div>
        </div>
      </section>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-border p-5 sm:grid-cols-5">
        {[
          { libelle: "RDV", valeur: stats.nb_rdv },
          { libelle: "Confirmés", valeur: stats.nb_confirmes },
          { libelle: "Terminés", valeur: stats.nb_termines },
          { libelle: "Transactions", valeur: stats.nb_transactions },
          { libelle: "Chiffre d'affaires", valeur: formaterFcfa(stats.chiffre_affaires) },
        ].map((item) => (
          <div key={item.libelle}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {item.libelle}
            </dt>
            <dd className="mt-1 font-heading text-base font-bold tabular-nums">{item.valeur}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-lg font-bold">Rendez-vous</h2>
          {rdvs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aucun rendez-vous pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rdvs.map((rdv) => (
                <li
                  key={rdv.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {libelleVehicule(rdv.vehicule.description, rdv.vehicule.id)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {LIBELLES_TYPE_RDV[rdv.type]} · {formaterDateHeure(rdv.date_heure)}
                    </p>
                  </div>
                  <Badge className={cn("shrink-0", STYLE_STATUT_RDV[rdv.statut].classes)}>
                    {STYLE_STATUT_RDV[rdv.statut].libelle}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold">Transactions</h2>
          {transactions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aucune transaction pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {libelleVehicule(transaction.vehicule.description, transaction.vehicule.id)}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {formaterFcfa(Number(transaction.prix_final))}
                    </p>
                  </div>
                  <Badge className={cn("shrink-0", STYLE_STATUT_TRANSACTION[transaction.statut].classes)}>
                    {STYLE_STATUT_TRANSACTION[transaction.statut].libelle}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-lg font-bold">Notes privées</h2>
        <p className="mt-1 text-sm text-muted-foreground">Visibles seulement par vous, jamais par le client.</p>

        <form onSubmit={soumettreNouvelleNote} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Textarea
            value={nouvelleNote}
            onChange={(e) => setNouvelleNote(e.target.value)}
            maxLength={2000}
            placeholder="Écrire une note sur ce client…"
            className="flex-1"
          />
          <Button type="submit" disabled={!nouvelleNote.trim() || ajoutEnCours} className="effet-action">
            <Send className="size-4" />
            {ajoutEnCours ? "Ajout..." : "Ajouter"}
          </Button>
        </form>

        {erreurNote && <p className="mt-2 text-sm text-destructive">{erreurNote}</p>}

        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune note pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-border p-4">
                {noteEnEdition === note.id ? (
                  <form onSubmit={soumettreEdition} className="flex flex-col gap-3">
                    <Textarea
                      value={texteEdition}
                      onChange={(e) => setTexteEdition(e.target.value)}
                      maxLength={2000}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteEnEdition(null)}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={!texteEdition.trim() || editionEnCours}
                        className={cn(buttonVariants({ size: "sm" }), "effet-action")}
                      >
                        {editionEnCours ? "Enregistrement..." : "Enregistrer"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{note.contenu}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formaterDateHeure(note.created_at)}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => ouvrirEdition(note)}
                          className="lien-anime text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setNoteASupprimer(note.id)}
                          className="lien-anime inline-flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="size-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={noteASupprimer !== null} onOpenChange={(ouvert) => !ouvert && setNoteASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={suppressionEnCours} onClick={confirmerSuppression}>
              {suppressionEnCours ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

const SkeletonFiche = () => (
  <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
    <Skeleton className="mt-5 h-24 w-full rounded-2xl" />
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  </main>
);

const FicheIntrouvable = () => (
  <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
    <section className="rounded-2xl border border-border p-12 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="size-7" />
      </span>
      <h1 className="mt-6 font-heading text-2xl font-bold">Ce client est introuvable</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Il n&apos;a peut-être jamais eu de rendez-vous avec vous, ou l&apos;adresse est incorrecte.
      </p>
      <Link href="/vendeur/clients" className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}>
        <Car className="size-4" />
        Retour à mes clients
      </Link>
    </section>
  </main>
);
