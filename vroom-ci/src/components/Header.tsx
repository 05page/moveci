"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, User, Compass, type LucideIcon, Bell, Heart, Send, Calendar, LogOut, GraduationCap, LifeBuoy, BookmarkCheck, Users, BellRing, Flag, Handshake } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import Notifications from "./Notifications";
import type { RoleUser } from "@/types";
import { api } from "@/lib/api";
import { useNotifications } from "@/lib/notification";

/**
 * DUPLIQUÉ depuis DESTINATION_PAR_ROLE (app/auth/page.tsx) et ACCUEIL_PAR_ROLE
 * (api/auth/callback/route.ts) — 3e copie de la même table. À consolider dans
 * un seul endroit partagé si ça recommence à diverger.
 */
const DESTINATION_PAR_ROLE: Record<RoleUser, string> = {
  client: "/client/profile",
  vendeur: "/vendeur/profile",
  concessionnaire: "/partenaire/concessionnaire/dashboard",
  auto_ecole: "/partenaire/auto_ecole/dashboard",
  admin: "/admin/dashboard",
};

type HeaderProps = {
  estConnecte: boolean;
  role: RoleUser | null;
};

/** Classes d'un lien de la nav desktop, extraites pour ne pas dupliquer la chaîne. */
const CLASSES_LIEN_NAV =
  "lien-anime flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export type LienNav = {
  libelle: string;
  href: string;
  icone: LucideIcon;
  /** Absent = visible par tout le monde. Présent = restreint à ces rôles (donc masqué si non connecté). */
  roles?: RoleUser[];
};

const LIENS_NAV: LienNav[] = [
  { libelle: "Découvrir", href: "/vehicules", icone: Compass },
  { libelle: "Auto École", href: "/client/auto-ecole", icone: GraduationCap, roles: ["client"] },
  { libelle: "Favoris", href: "/client/favoris", icone: Heart, roles: ["client"] },
  { libelle: "Rendez-vous", href: "/client/rdv", icone: Calendar, roles: ["client"] },
  { libelle: "Réservations", href: "/client/reservations", icone: BookmarkCheck, roles: ["client"] },
  { libelle: "Transactions", href: "/client/transactions", icone: Handshake, roles: ["client"] },
  { libelle: "Alertes", href: "/client/alertes", icone: BellRing, roles: ["client"] },
  { libelle: "Signalements", href: "/client/signalements", icone: Flag, roles: ["client"] },
  { libelle: "Rendez-vous", href: "/vendeur/rdv", icone: Calendar, roles: ["vendeur"] },
  { libelle: "Mes clients", href: "/vendeur/clients", icone: Users, roles: ["vendeur"] },
  { libelle: "Transactions", href: "/vendeur/transactions", icone: Handshake, roles: ["vendeur"] },
];

export default function Header({ estConnecte, role }: HeaderProps) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [nonLuesMessages, setNonLuesMessages] = useState(0);
  const { notifications, nonLues: nonLuesNotifications, marquerLue, marquerToutesLues } =
    useNotifications(estConnecte);
  const navigate = useRouter();

  useEffect(() => {
    if (!estConnecte) return;

    api.get<{ unread_count: number }>("conversations/unread-count")
      .then((reponse) => setNonLuesMessages(reponse.unread_count))
      .catch(() => { });
  }, [estConnecte]);

  const hrefCompte = estConnecte && role ? DESTINATION_PAR_ROLE[role] : "/auth";
  const libelleCompte = estConnecte ? "Mon compte" : "Connexion";

  /**
   * `auth_token` est httpOnly : seul /api/auth/logout (côté serveur) peut
   * l'effacer. `router.refresh()` force RootLayout à relire les cookies —
   * sans lui, `estConnecte` resterait vrai jusqu'au prochain rechargement.
   */
  const seDeconnecter = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    navigate.push("/auth");
    navigate.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/">
          <img src="/logo.svg" alt="move-ci" className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LIENS_NAV.filter((lien) => {
            const lienPublic = !lien.roles || lien.roles.length === 0;
            if(!role) return lienPublic;
            // 3. Un utilisateur connecté voit les liens publics ET ceux qui contiennent son rôle
            return lienPublic || lien.roles?.includes(role)
          })
          .map((lien) => (
            <Link key={lien.href} href={lien.href} className={CLASSES_LIEN_NAV}>
              <lien.icone className="size-4" />
              <span>{lien.libelle}</span>
            </Link>
          ))}

        </nav>

        {/* Bouton + burger regroupés, sinon justify-between les éparpille */}
        <div className="flex items-center gap-2">
          <Notifications
            notifs={notifications}
            nonLues={nonLuesNotifications}
            onMarquerLue={marquerLue}
            onToutMarquer={marquerToutesLues}
          />
          <button
            onClick={() => navigate.push("/messages")}
            className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={nonLuesMessages > 0 ? `Messages, ${nonLuesMessages} non lus` : "Messages"}
          >
            <Send className="size-4" />
            {nonLuesMessages > 0 && (
              <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
                {nonLuesMessages > 9 ? "9+" : nonLuesMessages}
              </span>
            )}
          </button>
          {estConnecte ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Mon compte"
                className="hidden size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
              >
                <User className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={hrefCompte} />}>
                  <User className="size-4" />
                  Mon compte
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/support" />}>
                  <LifeBuoy className="size-4" />
                  Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={seDeconnecter}>
                  <LogOut className="size-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // render = le asChild de Base UI : rend un vrai <a href>, pas un <button>
            <Button
              render={<Link href={hrefCompte} />}
              className="effet-action hidden md:inline-flex"
            >
              <User className="size-4" />
              {libelleCompte}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOuvert((ouvert) => !ouvert)}
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
          >
            {menuOuvert ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {menuOuvert && (
        <nav id="menu-mobile" className="border-t p-2 md:hidden">
          {LIENS_NAV.filter((lien) => {
            const lienPublic = !lien.roles || lien.roles.length === 0;
            if (!role) return lienPublic;
            return lienPublic || lien.roles?.includes(role);
          })
          .map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              onClick={() => setMenuOuvert(false)}
              className="flex items-center gap-3 rounded-4xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <lien.icone className="size-4" />
              <span>{lien.libelle}</span>
            </Link>
          ))}

          {/* Le CTA est masqué dans la barre sous 768px : il réapparaît ici */}
          <Button
            render={<Link href={hrefCompte} />}
            className="effet-action mt-1 w-full"
            onClick={() => setMenuOuvert(false)}
          >
            <User className="size-4" />
            {libelleCompte}
          </Button>

          {estConnecte && (
            <button
              type="button"
              onClick={() => {
                setMenuOuvert(false);
                seDeconnecter();
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-4xl px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Déconnexion
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
