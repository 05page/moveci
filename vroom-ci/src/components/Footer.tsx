import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

/**
 * lucide-react v1 a retiré toutes les icônes de marque (Facebook, Instagram…) pour
 * des raisons de marque déposée : on les redéclare en SVG inline plutôt que d'ajouter
 * une dépendance entière pour trois glyphes.
 */
type ProprietesIcone = { className?: string };

function IconeFacebook({ className }: ProprietesIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function IconeInstagram({ className }: ProprietesIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function IconeLinkedin({ className }: ProprietesIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

type LienFooter = {
  libelle: string;
  /** Route Next ou ancre de la page d'accueil : "/vehicules", "/#faq". */
  href: string;
};

type ColonneFooter = {
  titre: string;
  liens: LienFooter[];
};

/**
 * Les 4 colonnes de navigation. Structure volontairement calquée sur les 3 profils
 * du parcours d'accueil (acheteur / vendeur / auto-école) + une colonne plateforme :
 * un visiteur qui s'est reconnu dans un onglet retrouve la même logique en bas de page.
 */
const COLONNES_FOOTER: ColonneFooter[] = [
  {
    titre: "Acheter",
    liens: [
      { libelle: "Tous les véhicules", href: "/vehicules" },
      { libelle: "Près de chez moi", href: "/vehicules?proches=1" },
      { libelle: "Mes favoris", href: "/client/favoris" },
      { libelle: "Mes alertes", href: "/client/alertes" },
    ],
  },
  {
    titre: "Vendre",
    liens: [
      { libelle: "Déposer une annonce", href: "/vendeur/vehicules/nouveau" },
      { libelle: "Mes annonces", href: "/vendeur/vehicules" },
      { libelle: "Mes rendez-vous", href: "/vendeur/rdv" },
      { libelle: "Devenir concessionnaire", href: "/partenaire" },
    ],
  },
  {
    titre: "Se former",
    liens: [
      { libelle: "Les auto-écoles", href: "/auto-ecoles" },
      { libelle: "Les formations", href: "/formations" },
      { libelle: "Mes inscriptions", href: "/client/formations" },
      { libelle: "Référencer mon auto-école", href: "/partenaire" },
    ],
  },
  {
    titre: "Move CI",
    liens: [
      { libelle: "Comment ça marche", href: "/#comment-ca-marche" },
      { libelle: "Questions fréquentes", href: "/#faq" },
      { libelle: "Nous contacter", href: "/support" },
      { libelle: "Signaler une annonce", href: "/support" },
    ],
  },
];

type ReseauSocial = {
  nom: string;
  href: string;
  icone: ComponentType<ProprietesIcone>;
};

// URLs provisoires : à remplacer par les vrais comptes avant mise en production
const RESEAUX_SOCIAUX: ReseauSocial[] = [
  { nom: "Facebook", href: "https://facebook.com", icone: IconeFacebook },
  { nom: "Instagram", href: "https://instagram.com", icone: IconeInstagram },
  { nom: "LinkedIn", href: "https://linkedin.com", icone: IconeLinkedin },
];

type CoordonneeContact = {
  libelle: string;
  /** null = simple texte non cliquable, sinon "mailto:" ou "tel:". */
  href: string | null;
  icone: LucideIcon;
};

// Coordonnées provisoires : à remplacer par les vraies avant mise en production
const CONTACT: CoordonneeContact[] = [
  { libelle: "Abidjan, Côte d'Ivoire", href: null, icone: MapPin },
  { libelle: "contact@move-ci.com", href: "mailto:contact@move-ci.com", icone: Mail },
  { libelle: "+225 00 00 00 00", href: "tel:+22500000000", icone: Phone },
];

const LIENS_LEGAUX: LienFooter[] = [
  { libelle: "Conditions générales", href: "/cgu" },
  { libelle: "Confidentialité", href: "/confidentialite" },
  { libelle: "Mentions légales", href: "/mentions-legales" },
];

/** Classes d'un lien de colonne, extraites pour ne pas répéter la chaîne 16 fois. */
const CLASSES_LIEN_COLONNE =
  "text-sm text-muted-foreground transition-colors hover:text-primary";

export default function Footer() {
  return (
    // mt-auto : avec le body en flex-col, pousse le footer en bas même sur une page courte
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="inline-block">
              <Image src="/logo.svg" alt="Move CI" width={120} height={40} className="h-10 w-auto" />
            </Link>

            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              La place de marché ivoirienne pour acheter, vendre et louer un véhicule, et
              trouver son auto-école.
            </p>

            <ul className="mt-6 space-y-2">
              {CONTACT.map((coordonnee) => {
                const Icone = coordonnee.icone;

                return (
                  <li
                    key={coordonnee.libelle}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Icone className="size-4 shrink-0 text-primary" />
                    {coordonnee.href ? (
                      <a href={coordonnee.href} className="transition-colors hover:text-primary">
                        {coordonnee.libelle}
                      </a>
                    ) : (
                      <span>{coordonnee.libelle}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {COLONNES_FOOTER.map((colonne) => (
            <nav key={colonne.titre} aria-label={colonne.titre}>
              <h2 className="font-heading text-sm font-bold uppercase tracking-wider">
                {colonne.titre}
              </h2>

              <ul className="mt-4 space-y-3">
                {colonne.liens.map((lien) => (
                  <li key={lien.libelle}>
                    <Link href={lien.href} className={CLASSES_LIEN_COLONNE}>
                      {lien.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Move CI. Tous droits réservés.
          </p>

          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {LIENS_LEGAUX.map((lien) => (
              <li key={lien.href}>
                <Link href={lien.href} className={CLASSES_LIEN_COLONNE}>
                  {lien.libelle}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="flex items-center gap-3">
            {RESEAUX_SOCIAUX.map((reseau) => {
              const Icone = reseau.icone;

              return (
                <li key={reseau.nom}>
                  {/* rel="noreferrer" obligatoire avec target="_blank" : sans lui, la page ouverte garde une référence vers la nôtre */}
                  <a
                    href={reseau.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={reseau.nom}
                    className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icone className="size-4" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </footer>
  );
}
