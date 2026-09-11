"use client";

import { use } from "react";

import FicheVehiculeContent from "@/components/FicheVehiculeContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Même contenu que /vehicules/[id] : le seul but de ce fichier est de le monter SOUS
 *  app/partenaire/concessionnaire/, pour hériter du layout partenaire (sidebar) au lieu du
 *  layout public — voir CarteVehiculeCatalogue basePathVehicule sur parc-auto/page.tsx.
 *  `avecActionsAcheteur={false}` : un concessionnaire ne s'auto-réserve pas le véhicule
 *  d'un concurrent, ne l'ajoute pas à ses favoris, ne prend pas RDV avec lui-même. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageVehiculeParcAuto = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return (
    <FicheVehiculeContent
      key={id}
      id={id}
      basePathVendeur="/partenaire/concessionnaire/vendeur"
      avecActionsAcheteur={false}
    />
  );
};

export default PageVehiculeParcAuto;
