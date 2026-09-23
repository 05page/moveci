"use client";

import { use } from "react";

import TransactionContent from "@/components/TransactionContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageTransactionVendeur = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <TransactionContent key={id} id={id} perspective="vendeur" />;
};

export default PageTransactionVendeur;
