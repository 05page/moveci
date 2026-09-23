import Link from "next/link";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarteStatProps = {
  /** Ce que le chiffre compte : "Véhicules en ligne". Jamais un verbe. */
  libelle: string;
  /** Déjà formaté par l'appelant si besoin ("4,5 M FCFA"), sinon le nombre brut. */
  valeur: string | number;
  icone: LucideIcon;
  /** Variation en % vs période précédente. 12 affiche « +12 % », -3 affiche « -3 % », 0 s'affiche aussi. */
  tendance?: number;
  /** Ligne de contexte sous le libellé : "dont 3 cette semaine". */
  precision?: string;
  /** Passe la carte en or plein. UNE SEULE par écran : celle qui réclame une action. */
  accent?: boolean;
  /** Rend la carte cliquable. Absent = carte muette, pas de curseur pointer. */
  href?: string;
};

export default function CarteStat({
  libelle,
  valeur,
  icone: Icone,
  tendance,
  precision,
  accent = false,
  href,
}: CarteStatProps) {
  // `undefined` est une valeur légitime à 0 près : on teste l'absence, pas la fausseté
  const aTendance = tendance !== undefined;
  const enHausse = aTendance && tendance >= 0;

  const contenu = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl transition-colors",
            accent
              ? "bg-primary-foreground/10 text-primary-foreground"
              : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
          )}
        >
          <Icone className="size-5" />
        </span>

        {aTendance && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              accent
                ? "bg-primary-foreground/10 text-primary-foreground"
                : enHausse
                  ? "bg-accent text-accent-foreground"
                  : "bg-destructive/10 text-destructive"
            )}
          >
            {enHausse ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {enHausse ? "+" : ""}
            {tendance} %
          </span>
        )}
      </div>

      {/* tabular-nums : sans lui, les chiffres n'ont pas la même largeur et une rangée de cartes danse */}
      <p className="mt-6 font-heading text-3xl font-bold tabular-nums">{valeur}</p>

      <p
        className={cn(
          "mt-1 text-sm font-medium",
          accent ? "text-primary-foreground" : "text-foreground"
        )}
      >
        {libelle}
      </p>

      {precision && (
        <p
          className={cn(
            "mt-1 text-xs",
            accent ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {precision}
        </p>
      )}
    </>
  );

  const classes = cn(
    "group block rounded-2xl border p-5 transition-colors",
    accent
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background hover:border-primary",
    href && "effet-action"
  );

  // Une carte cliquable doit être un <a> : un <article onClick> n'est ni focusable ni annoncé comme lien
  if (href) {
    return (
      <Link href={href} className={classes}>
        {contenu}
      </Link>
    );
  }

  return <article className={classes}>{contenu}</article>;
}
