"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import CarteTransaction from "@/components/CarteTransaction";
import { Skeleton } from "@/components/ui/skeleton";
import { api, messageErreur } from "@/lib/api";
import { estErreurAuth } from "@/lib/erreurs";
import type { TransactionConclue } from "@/types";

export type TransactionContentProps = {
  id: string;
  perspective: "client" | "vendeur";
};

/**
 * Aucune route `GET /transactions-conclues/{id}` n'existe côté backend — seulement
 * des listes (`mes-demandes` pour le client, `mes-transactions` pour le vendeur),
 * déjà scopées sur l'utilisateur connecté. On récupère donc la bonne liste et on
 * cherche l'id dedans : un `.find()` qui ne trouve rien veut dire "inexistante OU
 * ne concerne pas cet utilisateur", les deux cas se traitent pareil (page "introuvable").
 */
const recupererTransaction = async (
  id: string,
  perspective: "client" | "vendeur"
): Promise<TransactionConclue | null> => {
  const chemin =
    perspective === "client" ? "transactions-conclues/mes-demandes" : "transactions-conclues/mes-transactions";
  const reponse = await api.get<{ data: TransactionConclue[] }>(chemin);
  return reponse.data.find((transaction) => transaction.id === id) ?? null;
};

const TransactionContent = ({ id, perspective }: TransactionContentProps) => {
  const router = useRouter();
  const [transaction, setTransaction] = useState<TransactionConclue | null | undefined>(undefined);
  const [actionEnCours, setActionEnCours] = useState(false);

  useEffect(() => {
    let annule = false;

    recupererTransaction(id, perspective).then((resultat) => {
      if (annule) return;
      setTransaction(resultat);
    });

    return () => {
      annule = true;
    };
  }, [id, perspective]);

  /** Un seul scan côté client finalise tout (voir docs/transaction.md §1.3/§2.1) — le vendeur
   * n'appelle plus jamais cette fonction, seul son bouton n'est même pas rendu (voir plus bas). */
  const confirmer = async (code: string) => {
    setActionEnCours(true);
    try {
      const reponse = await api.post<{ data: TransactionConclue }>(`transactions-conclues/${id}/confirmer-client`, {
        code,
      });
      setTransaction(reponse.data);
      toast.success("Transaction confirmée.");
    } catch (erreurCatch) {
      if (estErreurAuth(erreurCatch) && erreurCatch.status === 401) {
        router.push("/auth");
        return;
      }
      toast.error(messageErreur(erreurCatch, "La confirmation a échoué."));
    } finally {
      setActionEnCours(false);
    }
  };

  /** Même principe que confirmer() ci-dessus : seul le client scanne et appelle ceci. */
  const restituer = async (code: string) => {
    setActionEnCours(true);
    try {
      const reponse = await api.post<{ data: TransactionConclue }>(`transactions-conclues/${id}/restituer-client`, {
        code,
      });
      setTransaction(reponse.data);
      toast.success("Restitution confirmée.");
    } catch (erreurCatch) {
      if (estErreurAuth(erreurCatch) && erreurCatch.status === 401) {
        router.push("/auth");
        return;
      }
      toast.error(messageErreur(erreurCatch, "La confirmation de restitution a échoué."));
    } finally {
      setActionEnCours(false);
    }
  };

  /** Même contrat que POST /transactions-conclues/{id}/refuser (client) ou /refuser-vendeur (vendeur). */
  const refuser = async () => {
    setActionEnCours(true);
    try {
      const suffixe = perspective === "client" ? "refuser" : "refuser-vendeur";
      await api.post(`transactions-conclues/${id}/${suffixe}`);
      setTransaction((t) => t && { ...t, statut: "refusé" });
      toast.success("Transaction refusée.");
    } catch (erreurCatch) {
      if (estErreurAuth(erreurCatch) && erreurCatch.status === 401) {
        router.push("/auth");
        return;
      }
      toast.error(messageErreur(erreurCatch, "Le refus a échoué."));
    } finally {
      setActionEnCours(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="lien-anime inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour
      </button>

      <h1 className="mt-6 font-heading text-2xl font-bold">Transaction</h1>

      {transaction === undefined ? (
        <Skeleton className="mt-6 h-96 w-full rounded-2xl" />
      ) : transaction === null ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <h2 className="font-heading text-xl font-bold">Transaction introuvable</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Elle a peut-être été retirée, ou ne vous concerne pas.
          </p>
        </section>
      ) : (
        <div className="mt-6 max-w-sm">
          <CarteTransaction
            transaction={transaction}
            perspective={perspective}
            onConfirmer={perspective === "client" ? confirmer : undefined}
            onRefuser={refuser}
            onRestituer={perspective === "client" ? restituer : undefined}
            enCours={actionEnCours}
          />
        </div>
      )}
    </main>
  );
};

export default TransactionContent;
