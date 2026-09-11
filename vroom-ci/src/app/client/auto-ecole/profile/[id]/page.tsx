"use client";

import { use } from "react";

import ProfileContent from "@/components/ProfileContent";

/* ────────────────────────────────────────────────────────────────────────────
   PROFIL PUBLIC AUTO-ÉCOLE — /client/auto-ecole/profile/[id]
   Coquille fine : tout l'affichage vit dans ProfileContent, partagé avec
   /admin/utilisateurs/[id] (voir l'en-tête de ce composant). Même contrat que
   GET /users/{id}/profil (VendeurStatsController::profil) — la route publique
   déjà utilisée par la fiche véhicule pour le profil du vendeur.
   ──────────────────────────────────────────────────────────────────────────── */

/** Next 16 : `params` est une Promise, même dans une page Client Component — on la déballe avec `use()`. */
type ParametresPage = { params: Promise<{ id: string }> };

export default function PageProfilAutoEcole({ params }: ParametresPage) {
  const { id } = use(params);
  return <ProfileContent userId={id} />;
}
