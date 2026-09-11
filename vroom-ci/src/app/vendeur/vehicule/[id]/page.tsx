"use client";

import { use } from "react";

import VehiculeContent from "@/components/VehiculeContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Même contenu que /partenaire/concessionnaire/vehicule/[id] : le seul but de ce fichier est de le
 *  monter SOUS app/vendeur/, pour hériter du layout vendeur. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageMonVehicule = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <VehiculeContent key={id} id={id} basePathModifier="/vendeur/vehicule" />;
};

export default PageMonVehicule;
