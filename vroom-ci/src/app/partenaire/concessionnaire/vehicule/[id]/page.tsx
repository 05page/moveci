"use client";

import { use } from "react";

import VehiculeContent from "@/components/VehiculeContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Même contenu que /vendeur/vehicule/[id] : le seul but de ce fichier est de le monter SOUS
 *  app/partenaire/concessionnaire/, pour hériter du layout partenaire (sidebar) au lieu du
 *  layout vendeur. Pas de `basePathModifier` : le concessionnaire n'a pas encore de flux
 *  d'édition dédié (seul /partenaire/concessionnaire/post-vehicule existe, en création). */
type ParametresPage = { params: Promise<{ id: string }> };

const PageVehiculeConcessionnaire = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <VehiculeContent key={id} id={id} />;
};

export default PageVehiculeConcessionnaire;
