"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

export type HeroSlide = {
  id: number;
  /** À qui s'adresse le service. Sert de badge au-dessus du titre : "Particuliers". */
  cible: string;
  /** La promesse, en une ligne : "Vendez votre véhicule sans intermédiaire". */
  titre: string;
  /** Une phrase, 15 mots max : "Publiez votre annonce en 5 minutes, on s'occupe du reste." */
  description: string;
  image: string;
  /** Zone gardée au recadrage mobile, en CSS object-position : "32% center". */
  position?: string;
  /** Destination du bouton d'action : "/vendeur/vehicules/nouveau". */
  href: string;
  /** Texte du bouton d'action : "Déposer une annonce". */
  libelleAction: string;
};

const DELAI_DEFILEMENT = 5000;

/** Classes communes aux deux flèches ; rounded-4xl = le rayon de ui/button.tsx. */
const CLASSES_FLECHE =
  "absolute top-1/2 z-20 -translate-y-1/2 rounded-4xl border border-white/25 bg-black/25 p-2 text-white backdrop-blur transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/40";

function formaterPrix(montant: number): string {
  return `${montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(false);

  const suivant = useCallback(() => {
    setIndex((actuel) => (actuel + 1) % slides.length);
  }, [slides.length]);

  const precedent = useCallback(() => {
    setIndex((actuel) => (actuel - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (enPause) return;

    const minuteur = setInterval(suivant, DELAI_DEFILEMENT);

    return () => clearInterval(minuteur);
  }, [suivant, enPause]);

  return (
    // dvh et pas vh : vh ignore la barre d'URL rétractable et fait sauter le hero au scroll
    <section
      className="relative h-[70dvh] min-h-112 overflow-hidden bg-muted md:h-[80dvh] md:min-h-140"
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      aria-roledescription="carrousel"
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (

          <article key={slide.id} className="relative h-full w-full shrink-0">
            <Image
              fill
              src={slide.image}
              alt={slide.titre}
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
              style={{ objectPosition: slide.position ?? "center" }}
            />

            {/* Dégradé plus dense en mobile : moins de photo visible, texte plus serré dessus */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-transparent md:from-black/75 md:via-black/30" />
            <div className="absolute inset-x-0 bottom-16 z-10 px-6 text-center text-white md:bottom-24">
              <span className="inline-block rounded-full border border-white/40 px-3 py-1 text-xs uppercase tracking-wider">
                {slide.cible}
              </span>

              <h2 className="mt-4 font-heading text-3xl font-bold drop-shadow-lg md:text-5xl">
                {slide.titre}
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 md:text-base">
                {slide.description}
              </p>

              <Link
                href={slide.href}
                className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
              >
                {slide.libelleAction}
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* chevron */}
      <button
        type="button"
        className={cn(CLASSES_FLECHE, "left-4 md:left-8")}
        aria-label="Service précédent"
        onClick={precedent}
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button"
        className={cn(CLASSES_FLECHE, "right-4 md:right-8")}
        aria-label="Service suivant"
        onClick={suivant}
      >
        <ChevronRight className="size-6" />
      </button>

      {/* slide */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
        {slides.map((slide, i) => {
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Aller au service ${i + 1}`}
              aria-current={i === index}
              className="group py-3"
            >

              <span
                className={cn(
                  "block h-0.5 w-10 transition-colors group-hover:bg-primary",
                  i === index ? "bg-white" : "bg-white/40"
                )}
              />
            </button>
          )
        })}
      </div>
    </section>
  );
}
