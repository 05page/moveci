import Link from "next/link";
import { Plus } from "lucide-react";

import type { RoleUser } from "@/types";

/**
 * Un seul bouton flottant pour vendeur/concessionnaire/auto_ecole : c'est la
 * destination qui change selon le rôle, pas le composant. Client et admin
 * n'ont rien à publier ici — `href` reste `undefined` et le bouton disparaît.
 */
const DESTINATION_PUBLICATION: Partial<Record<RoleUser, string>> = {
  vendeur: "/vendeur/post-vehicule",
  concessionnaire: "/partenaire/concessionnaire/post-vehicule",
  auto_ecole: "/partenaire/auto_ecole/post-formation",
};

export default function BoutonFlottantPublier({ role }: { role: RoleUser | null }) {
  const href = role ? DESTINATION_PUBLICATION[role] : undefined;
  if (!href) return null;

  return (
    <Link
      href={href}
      aria-label="Publier"
      className="effet-action fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
    >
      <Plus className="size-6" />
    </Link>
  );
}
