"use client";

import { use } from "react";

import ProfileContent from "@/components/ProfileContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Même contenu que /vendeurs/[id] : le seul but de ce fichier est de le monter
 *  SOUS app/admin/, pour hériter du layout admin (sidebar) au lieu du layout public. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageUtilisateurDetail = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <ProfileContent userId={id} basePathVehicule="/admin/parc-auto" />;
};

export default PageUtilisateurDetail;
