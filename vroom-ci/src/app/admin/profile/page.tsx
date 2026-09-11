"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, KeyRound, LayoutDashboard, Mail, Pencil, ShieldCheck } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, formaterMoisAnnee, initiales, LIBELLES_ROLE } from "@/lib/utils";
import type { User } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   PROFIL ADMIN — /admin/profile
   Miroir de AuthController::getInfoUser() (GET /api/me), route agnostique du
   rôle — les deux profils publics (/client/profile, /vendeur/profile)
   l'appellent déjà. Contrairement à eux : ni note_moyenne ni nb_avis ici, un
   admin n'est jamais noté comme vendeur (les deux valent 0 côté back, les
   afficher ferait croire à un compte mal noté — même repli que /client/profile).
   ──────────────────────────────────────────────────────────────────────────── */

const recupererProfilAdmin = async (): Promise<User> => {
  const reponse = await api.get<{ data: User }>("me");
  return reponse.data;
};

export default function PageProfilAdmin() {
  const [admin, setAdmin] = useState<User | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererProfilAdmin().then((resultat) => {
      if (annule) return;
      setAdmin(resultat);
      setChargement(false);
    });

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  if (chargement || !admin) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-8 lg:py-10">
        <Skeleton className="h-40 w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Profil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Informations du compte administrateur connecté.
          </p>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      <section className="mt-6 flex flex-col gap-6 rounded-2xl border border-border bg-linear-to-br from-primary/10 via-background to-background p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-5">
          {/* <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns de next.config.ts */}
          {admin.avatar ? (
            <img
              src={admin.avatar}
              alt=""
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground">
              {initiales(admin.fullname)}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-heading text-2xl font-bold">{admin.fullname}</h2>
              <Badge className="gap-1 bg-foreground text-background">
                <ShieldCheck className="size-3" />
                {LIBELLES_ROLE[admin.role]}
              </Badge>
            </div>
            {admin.email && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" />
                {admin.email}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Membre depuis {formaterMoisAnnee(admin.membre_since)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/admin/profile/modifier"
            className={cn(buttonVariants({ variant: "outline" }), "effet-action")}
          >
            <Pencil className="size-4" />
            Modifier
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/dashboard"
          className="group effet-action flex items-center gap-4 rounded-2xl border border-border p-5 transition-colors hover:border-primary"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <LayoutDashboard className="size-5" />
          </span>
          <span>
            <span className="block font-heading text-base font-bold">Dashboard</span>
            <span className="block text-sm text-muted-foreground">
              Modération, marché et partenaires
            </span>
          </span>
        </Link>

        <Link
          href="/admin/parc-auto"
          className="group effet-action flex items-center gap-4 rounded-2xl border border-border p-5 transition-colors hover:border-primary"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Car className="size-5" />
          </span>
          <span>
            <span className="block font-heading text-base font-bold">Parc auto</span>
            <span className="block text-sm text-muted-foreground">
              Annonces des concessionnaires
            </span>
          </span>
        </Link>
      </section>

      <section className="mt-8 rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <KeyRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Mot de passe</p>
            <p className="text-xs text-muted-foreground">
              Dernière modification non communiquée par l&apos;API.
            </p>
          </div>
          <Link
            href="/admin/profile/modifier"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Changer
          </Link>
        </div>
      </section>
    </main>
  );
}
