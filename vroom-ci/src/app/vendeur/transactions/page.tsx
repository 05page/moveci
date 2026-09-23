"use client";

import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
import { toast } from "sonner";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteTransaction from "@/components/CarteTransaction";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TransactionConclue } from "@/types";

/** Même contrat que GET /transactions-conclues/mes-transactions : tout l'historique du vendeur, tous statuts confondus. */
const recupererMesTransactions = async (): Promise<TransactionConclue[]> => {
  const reponse = await api.get<{ data: TransactionConclue[] }>("transactions-conclues/mes-transactions");
  return reponse.data;
};

/** Même contrat que POST /transactions-conclues/{id}/refuser-vendeur. */
const refuserTransaction = async (id: string): Promise<void> => {
  await api.post(`transactions-conclues/${id}/refuser-vendeur`);
};

type Filtre = "tout" | "vente" | "location";

const LIBELLES_FILTRE: Record<Filtre, string> = {
  tout: "Tout",
  vente: "Ventes",
  location: "Locations",
};

const PageMesTransactionsVendeur = () => {
  const [transactions, setTransactions] = useState<TransactionConclue[] | undefined>(undefined);
  const [rechargement, setRechargement] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [idEnCours, setIdEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tout");

  useEffect(() => {
    let annule = false;

    recupererMesTransactions().then((liste) => {
      if (annule) return;
      setTransactions(liste);
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

  /** Refetch après mutation plutôt que patch manuel du state : même pattern que vendeur/profile/page.tsx. */
  const refuser = (id: string) => {
    setErreur(null);
    setIdEnCours(id);

    refuserTransaction(id)
      .then(() => recupererMesTransactions())
      .then((liste) => {
        setTransactions(liste);
        setIdEnCours(null);
        toast.success("Transaction refusée.");
      })
      .catch((erreurCatch) => {
        setIdEnCours(null);
        const message = erreurCatch?.message ?? "Le refus a échoué.";
        setErreur(message);
        toast.error(message);
      });
  };

  const enAttente = transactions?.filter((t) => t.statut === "en_attente") ?? [];
  const confirmees = (transactions?.filter((t) => t.statut === "confirmé") ?? []).filter(
    (t) => filtre === "tout" || t.type === filtre
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Mes transactions</h1>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Vos ventes et locations conclues, confirmées ou en attente.
      </p>

      {erreur && (
        <p
          role="status"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
        >
          {erreur}
        </p>
      )}

      {transactions === undefined ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Handshake className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold">Aucune transaction pour l&apos;instant</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Une transaction se crée quand un rendez-vous aboutit à une vente ou une location.
          </p>
        </section>
      ) : (
        <>
          {enAttente.length > 0 && (
            <section className="mt-8">
              <h2 className="font-heading text-lg font-bold">En attente de confirmation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Montrez le QR affiché sur chaque carte au client — son scan confirme et finalise seul.
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {enAttente.map((transaction) => (
                  <CarteTransaction
                    key={transaction.id}
                    transaction={transaction}
                    perspective="vendeur"
                    hrefDetail={`/vendeur/transactions/${transaction.id}`}
                    onRefuser={() => refuser(transaction.id)}
                    enCours={idEnCours === transaction.id}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-heading text-lg font-bold">Confirmées</h2>
              <div role="tablist" className="flex gap-2">
                {(["tout", "vente", "location"] as const).map((valeur) => (
                  <button
                    key={valeur}
                    type="button"
                    role="tab"
                    aria-selected={valeur === filtre}
                    onClick={() => setFiltre(valeur)}
                    className={cn(
                      "rounded-4xl px-4 py-2 text-sm font-semibold transition-colors",
                      valeur === filtre
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    )}
                  >
                    {LIBELLES_FILTRE[valeur]}
                  </button>
                ))}
              </div>
            </div>

            {confirmees.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
                Aucune transaction confirmée pour l&apos;instant.
              </p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {confirmees.map((transaction) => (
                  <CarteTransaction
                    key={transaction.id}
                    transaction={transaction}
                    perspective="vendeur"
                    hrefDetail={`/vendeur/transactions/${transaction.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default PageMesTransactionsVendeur;
