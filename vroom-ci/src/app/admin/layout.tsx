"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftToLine,
  BarChart3,
  Car,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Receipt,
  ScrollText,
  Send,
  UserCog,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useNotifications } from "@/lib/notification";
import Notifications from "@/components/Notifications";

/**
 * Section admin — sa propre coquille, séparée du Header/Footer publics :
 * ni la nav marketing ni le CTA "Connexion" n'ont de sens une fois connecté
 * en tant qu'administrateur.
 */
const NAV_ADMIN = [
  { libelle: "Dashboard", href: "/admin/dashboard", icone: LayoutDashboard },
  { libelle: "Parc auto", href: "/admin/parc-auto", icone: Car },
  { libelle: "Utilisateurs", href: "/admin/utilisateurs", icone: Users },
  { libelle: "Signalements", href: "/admin/signalements", icone: Flag },
  { libelle: "Transactions", href: "/admin/transactions", icone: Receipt },
  { libelle: "Formations", href: "/admin/formations", icone: GraduationCap },
  { libelle: "Statistiques", href: "/admin/stats", icone: BarChart3 },
  { libelle: "Logs", href: "/admin/logs", icone: ScrollText },
  { libelle: "Support", href: "/admin/support", icone: LifeBuoy },
  { libelle: "Profil", href: "/admin/profile", icone: UserCog },
] as const;

function LienNav({
  lien,
  actif,
  onClick,
}: {
  lien: (typeof NAV_ADMIN)[number];
  actif: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={lien.href}
      onClick={onClick}
      aria-current={actif ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        actif
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <lien.icone className="size-4 shrink-0" />
      {lien.libelle}
    </Link>
  );
}

function ContenuSidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <Image src="/logo.svg" alt="Move CI" width={36} height={36} className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold leading-tight text-sidebar-foreground">
            Move CI
          </p>
          <p className="text-xs text-sidebar-foreground/60">Administration</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ADMIN.map((lien) => (
          <LienNav
            key={lien.href}
            lien={lien}
            actif={pathname.startsWith(lien.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ArrowLeftToLine className="size-4 shrink-0" />
          Retour au site
        </Link>
      </div>
    </div>
  );
}

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navigate = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { notifications, nonLues: nonLuesNotifications, marquerLue, marquerToutesLues } =
    useNotifications();
  const [nonLuesMessages, setNonLuesMessages] = useState(0);

  useEffect(() => {
    api.get<{ unread_count: number }>("conversations/unread-count")
      .then((reponse) => setNonLuesMessages(reponse.unread_count))
      .catch(() => { });
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* desktop : sidebar fixe, jamais démontée au changement de page */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <ContenuSidebar pathname={pathname} />
      </aside>

      {/* navbar : sticky, visible mobile + desktop (offset lg:pl-64 pour laisser place à la sidebar) */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sidebar-border bg-background px-4 lg:pl-64">
        <button
          type="button"
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu d'administration"
          aria-expanded={menuOuvert}
          aria-controls="menu-admin-mobile"
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-heading text-sm font-bold text-foreground">
          Administration
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Notifications
            notifs={notifications}
            nonLues={nonLuesNotifications}
            onMarquerLue={marquerLue}
            onToutMarquer={marquerToutesLues}
          />
          <button
            type="button"
            onClick={() => navigate.push("/admin/messages")}
            aria-label={nonLuesMessages > 0 ? `Messages, ${nonLuesMessages} non lus` : "Messages"}
            className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Send className="size-4" />
            {nonLuesMessages > 0 && (
              <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
                {nonLuesMessages > 9 ? "9+" : nonLuesMessages}
              </span>
            )}
          </button>
        </div>
      </div>

      {menuOuvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOuvert(false)}
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
          />
          <div
            id="menu-admin-mobile"
            className="absolute inset-y-0 left-0 w-64 animate-in slide-in-from-left duration-200 bg-sidebar"
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setMenuOuvert(false)}
                aria-label="Fermer le menu"
                className="flex size-9 items-center justify-center rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <ContenuSidebar pathname={pathname} onNavigate={() => setMenuOuvert(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
