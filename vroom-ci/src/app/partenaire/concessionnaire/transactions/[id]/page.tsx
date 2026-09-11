"use client";

import { use } from "react";

import TransactionContent from "@/components/TransactionContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Même page que /vendeur/transactions/[id], montée sous /partenaire/concessionnaire pour hériter
 *  du layout partenaire (sidebar). `perspective="vendeur"` reste correct : le composant ne connaît
 *  que "client" | "vendeur", et le concessionnaire se comporte exactement comme un vendeur ici. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageTransactionConcessionnaire = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <TransactionContent key={id} id={id} perspective="vendeur" />;
};

export default PageTransactionConcessionnaire;
