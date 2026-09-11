"use client";

import { use } from "react";

import FicheVehiculeContent from "@/components/FicheVehiculeContent";

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`.
 *  Route PUBLIQUE : pas de token requis pour la consulter.
 *  Même contenu que /partenaire/concessionnaire/parc-auto/[id] : le seul but de ce fichier
 *  est de le monter à la racine, sous le layout public (Header/Footer). */
type ParametresPage = { params: Promise<{ id: string }> };

const PageFicheVehicule = ({ params }: ParametresPage) => {
  const { id } = use(params);
  // `key={id}` démonte/remonte le contenu à chaque changement d'id : plus
  // simple et plus sûr qu'un reset manuel de l'état dans un useEffect.
  return <FicheVehiculeContent key={id} id={id} />;
};

export default PageFicheVehicule;
