"use client"
import BoutonRecharger from "@/components/BoutonRecharger";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, initiales, LIBELLES_ROLE, urlPhoto } from "@/lib/utils";
import { photoPrincipale } from "@/lib/vehicule";
import type { ErreurAuth, VehiculeComplet, VehiculeVus, VendeurVedette } from "@/types";
import {
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  GraduationCap,
  Handshake,
  ImagePlus,
  Mail,
  MapPin,
  MessageCircle,
  ScanSearch,
  Search,
  ShieldCheck,
  Star,
  UserCog,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
const heroSlides: HeroSlide[] = [
  {
    id: 1,
    cible: "Particuliers",
    titre: "Vendez votre véhicule sans intermédiaire",
    description:
      "Publiez votre annonce en 5 minutes et vendez sans intermédiaire.",
    // Une main tendue avec les clés d'une voiture : la vente conclue.
    image: "/vendeur.jpg",
    // visage à ~42% de la largeur, clé à ~62% : on centre entre les deux
    position: "52% center",
    href: "/vendeur/vehicules/nouveau",
    libelleAction: "Déposer une annonce",
  },
  {
    id: 2,
    cible: "Concessionnaires",
    titre: "Gérez tout votre stock en ligne",
    description:
      "Exposez tout votre stock et suivez vos ventes depuis un seul tableau de bord.",
    // Hall de concession rempli de véhicules exposés : le stock à gérer.
    image: "/concessionnaire.jpg",
    // le véhicule de tête occupe la moitié gauche : on décale pour garder calandre et roue
    position: "42% center",
    href: "/partenaire",
    libelleAction: "Devenir partenaire",
  },
  {
    id: 3,
    cible: "Auto-écoles",
    titre: "Remplissez vos sessions de formation",
    description:
      "Présentez vos formations au permis et remplissez vos sessions.",
    // Vue depuis l'arrière : élève au volant, accompagnateur à droite.
    image: "/auto-ecole.jpg",
    // photo en 2.29 : centrée on ne verrait que le pare-brise, on recentre sur le volant
    position: "32% center",
    href: "/auto-ecoles",
    libelleAction: "Référencer mon auto-école",
  },
  {
    id: 4,
    cible: "Acheteurs & vendeurs",
    titre: "Prenez rendez-vous en toute confiance",
    description:
      "Prenez rendez-vous et confirmez la transaction des deux côtés.",
    // Poignée de main entre deux personnes : l'accord conclu des deux côtés.
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&crop=entropy&w=2400&h=1050&q=80",
    href: "/vehicules",
    libelleAction: "Trouver un véhicule",
  },
];

type VehiculePopulaire = Pick<VehiculeComplet, "id" | "description" | "photos">;

// 1. Appelle `api.get<{ data: VehiculePopulaire[] }>("vehicules/populaires")`.
const recupererVehiculePopulaires = async (): Promise<VehiculeVus[]> => {
  const response = await api.get<{ data: VehiculePopulaire[] }>("vehicules/populaires");
  return response.data.filter((v) => v.description !== null)
    .map((v) => ({
      id: v.id,
      marque: v.description!.marque,
      modele: v.description!.modele,
      image: photoPrincipale(v.photos) ? urlPhoto(photoPrincipale(v.photos)!.path) : "/toyota.jpeg",
      href: `/vehicules/${v.id}`,
    }));
}

const recupererVendeurPopulaires = async (): Promise<VendeurVedette[]> => {
  const response = await api.get<{ data: VendeurVedette[] }>("/vendeurs/vedettes");
  return response.data.filter((vv) => vv.id !== null)
    .map((vv) => ({
      id: vv.id,
      fullname: vv.fullname,
      avatar: vv.avatar,
      role: vv.role,
      nb_vehicules: vv.nb_vehicules,
      note_moyenne: vv.note_moyenne,
      nb_avis: vv.nb_avis
    }));
}

/** Même contrat que la future route publique : seul ce corps changera au branchement. */

type EtapeParcours = {
  numero: number;
  titre: string;
  description: string;
  icone: LucideIcon;
};

type ProfilParcours = {
  /** Sert de clé React ET de valeur d'onglet actif : "acheteur". */
  id: "acheteur" | "vendeur" | "auto-ecole";
  /** Libellé de l'onglet, 2 mots max : "Je vends". */
  libelle: string;
  /** Exactement 4 étapes : le rail est en md:grid-cols-4. */
  etapes: EtapeParcours[];
  /** Destination du bouton de fin de parcours : "/vehicules". */
  href: string;
  libelleAction: string;
};

type Newsletter = {
  email: string
}

/** Parcours des 3 profils, repris de docs/CAHIER-DES-CHARGES.md § « Parcours utilisateurs critiques ». */
const PARCOURS: ProfilParcours[] = [
  {
    id: "acheteur",
    libelle: "J'achète",
    href: "/vehicules",
    libelleAction: "Trouver un véhicule",
    etapes: [
      {
        numero: 1,
        titre: "Créez votre compte",
        description:
          "Connexion avec Google en un clic. Aucun mot de passe à retenir, vous êtes acheteur par défaut.",
        icone: UserPlus,
      },
      {
        numero: 2,
        titre: "Trouvez votre véhicule",
        description:
          "Filtrez par marque, budget ou ville, gardez vos coups de cœur en favoris et créez une alerte si rien ne correspond.",
        icone: Search,
      },
      {
        numero: 3,
        titre: "Prenez rendez-vous",
        description:
          "Proposez un créneau au vendeur pour une visite ou un essai. Il confirme, vous êtes notifié en temps réel.",
        icone: CalendarCheck,
      },
      {
        numero: 4,
        titre: "Confirmez à deux",
        description:
          "La rencontre a lieu hors plateforme, aucun paiement ne transite par Move CI. La vente n'est actée que si vous confirmez tous les deux.",
        icone: ShieldCheck,
      },
    ],
  },

  {
    id: "vendeur",
    libelle: "Je vends",
    href: "/vendeur/vehicules/nouveau",
    libelleAction: "Déposer une annonce",
    etapes: [
      {
        numero: 1,
        titre: "Passez en vendeur",
        description:
          "Créez votre compte, puis basculez en profil vendeur ou concessionnaire. Le parcours est le même, le stock change d'échelle.",
        icone: UserCog,
      },
      {
        numero: 2,
        titre: "Publiez votre annonce",
        description:
          "Photos, marque, modèle, kilométrage et prix. Comptez 5 minutes, et n'oubliez pas la photo du tableau de bord.",
        icone: ImagePlus,
      },
      {
        numero: 3,
        titre: "L'IA vérifie tout",
        description:
          "Gemini recoupe vos photos avec le modèle déclaré et lit votre compteur à 500 km près. Si tout concorde, l'annonce part en ligne.",
        icone: ScanSearch,
      },
      {
        numero: 4,
        titre: "Recevez vos acheteurs",
        description:
          "Les demandes de rendez-vous arrivent, vous choisissez vos créneaux. La vente n'est actée qu'une fois confirmée des deux côtés.",
        icone: Handshake,
      },
    ],
  },
  {
    id: "auto-ecole",
    libelle: "Je forme",
    href: "/auto-ecoles",
    libelleAction: "Référencer mon auto-école",
    etapes: [
      {
        numero: 1,
        titre: "Créez votre compte",
        description:
          "Inscrivez-vous avec Google, puis demandez le profil auto-école pour accéder à votre espace de gestion.",
        icone: UserPlus,
      },
      {
        numero: 2,
        titre: "Décrivez votre établissement",
        description:
          "Adresse, numéro d'agrément, horaires et tarifs : votre fiche devient votre vitrine sur toute la Côte d'Ivoire.",
        icone: Building2,
      },
      {
        numero: 3,
        titre: "Publiez vos formations",
        description:
          "Permis A, B ou C, durée, prix et places disponibles. Chaque session publiée devient visible dans les recherches.",
        icone: GraduationCap,
      },
      {
        numero: 4,
        titre: "Remplissez vos sessions",
        description:
          "Les candidats demandent un rendez-vous d'inscription. Vous validez le créneau, ils sont notifiés aussitôt.",
        icone: CalendarCheck,
      },
    ],
  },
];

type ArgumentConfiance = {
  titre: string;
  description: string;
  icone: LucideIcon;
};

/** Les 4 garde-fous réellement implémentés côté back : Gemini, messagerie, double confirmation, signalement. */
const ARGUMENTS_CONFIANCE: ArgumentConfiance[] = [
  {
    titre: "Chaque annonce est vérifiée",
    description:
      "Notre IA recoupe les photos avec le modèle déclaré et lit le compteur avant la mise en ligne. Une annonce incohérente est rejetée.",
    icone: ScanSearch,
  },
  {
    titre: "Votre numéro reste privé",
    description:
      "Discutez avec le vendeur depuis la messagerie Move CI. Vous ne partagez vos coordonnées que si vous décidez de le faire.",
    icone: MessageCircle,
  },
  {
    titre: "La vente se confirme à deux",
    description:
      "Rien n'est acté tant que l'acheteur et le vendeur n'ont pas confirmé chacun de leur côté. Aucun paiement ne transite par la plateforme.",
    icone: ShieldCheck,
  },
  {
    titre: "Un doute, un signalement",
    description:
      "Signalez une annonce en deux clics. Elle est suspendue le temps que notre équipe vérifie, et vous êtes tenu au courant.",
    icone: Flag,
  },
];

type QuestionFrequente = {
  /** Sert aussi de clé React : deux questions identiques n'auraient aucun sens. */
  question: string;
  reponse: string;
};

const FAQ: QuestionFrequente[] = [
  {
    question: "Move CI prend-elle une commission sur mes ventes ?",
    reponse:
      "Non. Aucun paiement ne transite par la plateforme : vous réglez directement le vendeur, comme pour n'importe quelle vente entre particuliers.",
  },
  {
    question: "Comment savoir si une annonce est fiable ?",
    reponse:
      "Toute annonce visible a passé le contrôle automatique : photos comparées au modèle déclaré, kilométrage vérifié sur la photo du compteur. Vous consultez aussi les avis laissés sur le vendeur.",
  },
  {
    question: "Dois-je donner mon numéro de téléphone ?",
    reponse:
      "Non. La messagerie interne suffit pour poser vos questions et convenir d'un rendez-vous. Vos coordonnées ne sont jamais affichées sur l'annonce.",
  },
  {
    question: "Que se passe-t-il après le rendez-vous ?",
    reponse:
      "Chacun confirme la vente de son côté. Tant que les deux confirmations ne sont pas là, le véhicule reste disponible pour les autres acheteurs.",
  },
  {
    question: "Je suis concessionnaire, dois-je payer un abonnement ?",
    reponse:
      "Non, il n'y a pas d'abonnement sur Move CI. Vous publiez autant de véhicules que votre stock l'exige et vous les suivez depuis un tableau de bord unique.",
  },
  {
    question: "Je dirige une auto-école, comment référencer mes formations ?",
    reponse:
      "Créez votre compte, demandez le profil auto-école, puis publiez vos formations avec leurs tarifs et leurs places disponibles. Les candidats vous demandent un rendez-vous d'inscription.",
  },
];

/**
 * Carte véhicule photo + voile + texte superposé. Sert au rail « plus vus » ET
 * à la grille géolocalisée : `className` reçoit la largeur, qui seule diffère.
 */
function CarteVehicule({
  vehicule,
  className,
}: {
  vehicule: VehiculeVus;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative aspect-3/4 overflow-hidden rounded-2xl shadow-md",
        className
      )}
    >
      <Image
        fill
        src={vehicule.image}
        alt={`${vehicule.marque} ${vehicule.modele}`}
        sizes="(min-width: 640px) 704px, 640px"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white">
        <p className="text-xs uppercase tracking-wider text-white/70">
          {vehicule.marque}
        </p>
        <h3 className="font-heading text-xl font-bold">{vehicule.modele}</h3>
        {/* absente du rail « plus vus » : le && n'affiche la ligne que si la donnée existe */}
        {vehicule.commune && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/70">
            <MapPin className="size-3" />
            {vehicule.commune}
          </p>
        )}
        <Link href={vehicule.href}>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 transition-all group-hover:text-white">
            Découvrir
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </article>
  );
}

export default function Home() {
  const VehiculeScrollRef = useRef<HTMLDivElement>(null)
  const [profilActif, setProfilActif] = useState<ProfilParcours["id"]>("acheteur");
  // find() peut renvoyer undefined : le ?? garde `parcours` non-nullable pour TypeScript
  const parcours = PARCOURS.find((profil) => profil.id === profilActif) ?? PARCOURS[0];
  const [emailNewsletter, setEmailNewsletter] = useState("");
  const [newsletterEnvoyee, setNewsletterEnvoyee] = useState(false);
  const [vehiculesPopulaires, setVehiculesPopulaires] = useState<VehiculeVus[]>([]);
  const [chargementPopulaires, setChargementPopulaires] = useState(true);
  const [tentativePopulaires, setTentativePopulaires] = useState(0);
  const [vendeurs, setVendeurs] = useState<VendeurVedette[]>([]);
  const [chargementVendeurs, setChargementVendeurs] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentativeVendeurs, setTentativeVendeurs] = useState(0);

  useEffect(() => {
    let annule = false;
    recupererVehiculePopulaires().then((liste) => {
      if (annule) return;
      setVehiculesPopulaires(liste);
      setChargementPopulaires(false);
    });
    return () => { annule = true; };
  }, [tentativePopulaires]);

  const rechargerPopulaires = () => {
    setChargementPopulaires(true);
    setTentativePopulaires((t) => t + 1);
  };

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererVendeurPopulaires().then((liste) => {
      if (annule) return;
      setVendeurs(liste);
      setChargementVendeurs(false);
    });

    return () => {
      annule = true;
    };
  }, [tentativeVendeurs]);

  const rechargerVendeurs = () => {
    setChargementVendeurs(true);
    setTentativeVendeurs((t) => t + 1);
  };

  const soumettreNewsletter = async (evenement: SubmitEvent<HTMLFormElement>) => {
    // sans preventDefault, le <form> recharge la page et le state est perdu

    evenement.preventDefault();
    try {
      await api.post("/newsletter", { email: emailNewsletter });
      setNewsletterEnvoyee(true);
      setEmailNewsletter("");
      toast.success("Inscription à la newsletter confirmée.");
    } catch (erreurCatch) {
      toast.error((erreurCatch as ErreurAuth).message ?? "L'inscription à la newsletter a échoué.");
    }
  };

  const scrollCategories = (direction: "left" | "right") => {
    if (VehiculeScrollRef.current) {
      const { scrollLeft, clientWidth } = VehiculeScrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      VehiculeScrollRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };
  return (
    <div>
      <HeroCarousel slides={heroSlides} />
      <section className="m-5">
        {/* Les flèches sont FRÈRES du rail, pas ses enfants : sinon elles défilent avec lui */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Vehicules les plus vues</h1>
          <BoutonRecharger onClick={rechargerPopulaires} chargement={chargementPopulaires} />
        </div>

        <div
          ref={VehiculeScrollRef}
          className="mt-6 flex gap-4 overflow-x-hidden pb-4"
        >
          {vehiculesPopulaires.map((vehicule) => (
            <CarteVehicule
              key={vehicule.id}
              vehicule={vehicule}
              className="w-64 shrink-0 sm:w-72"
            />
          ))}
        </div>

        <div className="flex justify-end items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="effet-action"
            onClick={() => scrollCategories("left")}
            aria-label="Véhicules précédents"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="effet-action"
            onClick={() => scrollCategories("right")}
            aria-label="Véhicules suivants"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Comment ça marche</h1>
        </div>
        <div className="text-center">
          <h2 className="mt-4 font-heading text-3xl font-bold md:text-4xl">
            Du compte créé à la poignée de main
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Choisissez votre profil : les 4 étapes qui vous concernent s&apos;affichent.
          </p>
        </div>

        <div role="tablist" className="mt-10 flex flex-wrap justify-center gap-2">
          {PARCOURS.map((profil) => (
            <button
              key={profil.id}
              type="button"
              role="tab"
              aria-selected={profil.id === profilActif}
              onClick={() => setProfilActif(profil.id)}
              className={cn(
                "rounded-4xl px-5 py-2.5 text-sm font-semibold transition-colors",
                profil.id === profilActif
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
              )}
            >
              {profil.libelle}
            </button>
          ))}
        </div>

        <div className="relative mt-12 grid gap-8 md:grid-cols-4">
          {/* La ligne est FRÈRE des cartes, pas leur parent : sinon elle se replierait dans la 1re colonne */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-6 hidden h-px bg-linear-to-r from-transparent via-primary to-transparent md:block"
          />

          {parcours.etapes.map((etape) => {
            // capitalisé : en minuscule, JSX lirait <etape.icone> comme une balise HTML inconnue
            const Icone = etape.icone;

            return (
              <article
                key={etape.numero}
                className="group relative flex flex-col items-center text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-full border border-primary bg-background text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icone className="size-5" />
                </div>

                <span className="mt-4 text-xs font-bold tracking-widest text-primary">
                  {`0${etape.numero}`}
                </span>
                <h3 className="mt-1 font-heading text-lg font-bold">{etape.titre}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{etape.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href={parcours.href}
            className={cn(buttonVariants({ size: "lg" }), "effet-action")}
          >
            {parcours.libelleAction}
          </Link>
        </div>
      </section>

      {/* Pourquoi Move CI */}
      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Pourquoi Move CI</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acheter une voiture d&apos;occasion, c&apos;est faire confiance à un inconnu. Voilà ce
            qu&apos;on met en place pour que ce ne soit pas un pari.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ARGUMENTS_CONFIANCE.map((argument) => {
              const Icone = argument.icone;

              return (
                <article
                  key={argument.titre}
                  className="group rounded-2xl border border-border bg-background p-6 transition-colors hover:border-primary"
                >
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icone className="size-5" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-bold">{argument.titre}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{argument.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ils vendent sur Move CI */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Ils vendent sur Move CI</h1>
          <BoutonRecharger onClick={rechargerVendeurs} chargement={chargementVendeurs} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Concessionnaires et vendeurs particuliers, notés par leurs acheteurs.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chargementVendeurs
            ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-48 w-full" />
            ))
            : vendeurs.map((vendeur) => (
              <article
                key={vendeur.id}
                className="group rounded-2xl border border-border p-6 transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-4">
                  {/* avatar de repli : le backend renvoie null tant que l'utilisateur n'en a pas */}
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground">
                    {initiales(vendeur.fullname)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-lg font-bold">
                      {vendeur.fullname}
                    </h3>
                    <Badge variant="secondary" className="mt-1">
                      {LIBELLES_ROLE[vendeur.role]}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Star className="size-4 fill-primary text-primary" />
                    {vendeur.note_moyenne.toFixed(1)}
                    <span className="font-normal text-muted-foreground">
                      ({vendeur.nb_avis} avis)
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {vendeur.nb_vehicules} véhicules en ligne
                  </span>
                </div>

                <Link
                  href={`/vendeurs/${vendeur.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "effet-action mt-6 w-full"
                  )}
                >
                  Voir le profil
                </Link>
              </article>
            ))}
        </div>
      </section>

      {/* Questions fréquentes */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Questions fréquentes</h1>
        </div>

        <div className="mt-8 divide-y divide-border border-y border-border">
          {FAQ.map((item) => (
            // <details> natif : l'accordéon fonctionne même si le JS ne charge pas
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.reponse}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl">
              Ne ratez pas la bonne affaire
            </h1>
            <p className="mt-2 max-w-md text-sm text-primary-foreground/80">
              Les nouvelles annonces de votre ville et les baisses de prix, une fois par
              semaine. Rien d&apos;autre, et vous vous désinscrivez en un clic.
            </p>
          </div>

          {newsletterEnvoyee ? (
            // role="status" : un lecteur d'écran annonce la confirmation sans déplacer le focus
            <p role="status" className="flex items-center gap-2 font-semibold md:justify-end">
              <Check className="size-5" />
              C&apos;est noté, à la semaine prochaine.
            </p>
          ) : (
            <form onSubmit={soumettreNewsletter} className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="email-newsletter" className="sr-only">
                Votre adresse email
              </label>
              <Input
                id="email-newsletter"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={emailNewsletter}
                onChange={(evenement) => setEmailNewsletter(evenement.target.value)}
                placeholder="votre@email.ci"
                className="h-11 bg-background text-foreground"
              />
              <Button
                type="submit"
                size="lg"
                variant="secondary"
                className="effet-action shrink-0"
              >
                <Mail className="size-4" />
                Je m&apos;inscris
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
