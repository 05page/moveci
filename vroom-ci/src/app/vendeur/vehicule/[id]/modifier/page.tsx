"use client";

import { use } from "react";

import PostVehiculeContent from "@/components/PostVehiculeContent";

/** Next 16 : `params` est une Promise, il faut l'attendre — voir vendeur/vehicule/[id]/page.tsx. */
type ParametresPage = { params: Promise<{ id: string }> };

const PageModifierVehicule = ({ params }: ParametresPage) => {
  const { id } = use(params);
  return <PostVehiculeContent id={id} />;
};

export default PageModifierVehicule;
