"use client";

import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Bouton de rechargement manuel, pour toute page dont les données viennent
 * d'un GET (mock ou réel). `chargement` fait tourner l'icône ET désactive le
 * bouton : un second clic pendant un rechargement en cours relancerait un
 * fetch par-dessus l'autre, sans qu'on sache lequel des deux répondrait en dernier.
 */
export type BoutonRechargerProps = {
  onClick: () => void;
  chargement?: boolean;
  className?: string;
};

export default function BoutonRecharger({
  onClick,
  chargement = false,
  className,
}: BoutonRechargerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={chargement}
      aria-label="Recharger"
      title="Recharger"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-60",
        className
      )}
    >
      <RefreshCw className={cn("size-4", chargement && "animate-spin")} />
    </button>
  );
}
