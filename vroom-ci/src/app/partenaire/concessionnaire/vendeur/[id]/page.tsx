"use client";

import { use } from "react";

import ProfileContent from "@/components/ProfileContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Même contenu que /vendeurs/[id] : le seul but de ce fichier est de le monter
 *  SOUS app/partenaire/concessionnaire/, pour hériter du layout partenaire (sidebar)
 *  au lieu du layout public. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageVendeurDetailConcessionnaire = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <ProfileContent userId={id} />;
};

export default PageVendeurDetailConcessionnaire;
