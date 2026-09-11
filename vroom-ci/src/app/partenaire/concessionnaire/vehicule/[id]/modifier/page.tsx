"use client";

import { use } from "react";

import PostVehiculeContent from "@/components/PostVehiculeContent";

/** Next 16 : `params` est une Promise, il faut l'attendre — voir vendeur/vehicule/[id]/modifier/page.tsx.
 *  Même contenu que cette page vendeur : monté sous /partenaire/concessionnaire pour hériter du
 *  layout partenaire (sidebar) au lieu du layout vendeur. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageModifierVehiculeConcessionnaire = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <PostVehiculeContent id={id} />;
};

export default PageModifierVehiculeConcessionnaire;
