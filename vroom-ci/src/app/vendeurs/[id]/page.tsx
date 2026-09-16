"use client";

import { use } from "react";

import ProfileContent from "@/components/ProfileContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Route PUBLIQUE (Header/Footer standards) : profil consultable sans connexion.
 *  Même contenu que /admin/utilisateurs/[id] et /partenaire/concessionnaire/vendeur/[id]
 *  — seul le layout parent change. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageVendeurDetail = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <ProfileContent userId={id} />;
};

export default PageVendeurDetail;
