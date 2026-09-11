"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftToLine,
  BarChart3,
  CalendarCheck,
  Car,
  CircleUserRound,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Send,
  Users,
  Warehouse,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useNotifications } from "@/lib/notification";
import Notifications from "@/components/Notifications";


type RolePartenaire = "concessionnaire" | "auto_ecole";

function roleDepuisChemin(chemin: string): RolePartenaire {
  return chemin.startsWith("/partenaire/auto_ecole") ? "auto_ecole" : "concessionnaire";
}


function navPourRole(role: RolePartenaire) {
  const nav = [{ libelle: "Dashboard", href: `/partenaire/${role}/dashboard`, icone: LayoutDashboard }];

  if (role === "concessionnaire") {
    nav.push({ libelle: "Mes véhicules", href: "/partenaire/concessionnaire/vehicules", icone: Warehouse });
    nav.push({ libelle: "Stats", href: "/partenaire/concessionnaire/stats", icone: BarChart3 });
    nav.push({ libelle: "Parc auto", href: "/partenaire/concessionnaire/parc-auto", icone: Car });
    nav.push({ libelle: "Clients", href: "/partenaire/concessionnaire/clients", icone: Users });
    nav.push({ libelle: "RDV", href: "/partenaire/concessionnaire/rdv", icone: CalendarCheck });
    nav.push({ libelle: "Transactions", href: "/partenaire/concessionnaire/transactions", icone: Handshake });
  } else {
    nav.push({ libelle: "Formation", href: "/partenaire/auto_ecole/formations", icone: GraduationCap });
    nav.push({ libelle: "Stats", href: "/partenaire/auto_ecole/stats", icone: BarChart3 });
  }

  nav.push({ libelle: "Profil", href: `/partenaire/${role}/profil`, icone: CircleUserRound });

  return nav;
}

function LienNav({
  lien,
  actif,
  onClick,
}: {
  lien: ReturnType<typeof navPourRole>[number];
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

function ContenuSidebar({
  role,
  pathname,
  onNavigate,
}: {
  role: RolePartenaire;
  pathname: string;
  onNavigate?: () => void;
}) {
  const nav = navPourRole(role);
  const navigate = useRouter();

  /** `auth_token` est httpOnly : seul /api/auth/logout (côté serveur) peut l'effacer — même appel que Header.tsx. */
  const seDeconnecter = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    navigate.push("/auth");
    navigate.refresh();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <Image src="/logo.svg" alt="Move CI" width={36} height={36} className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold leading-tight text-sidebar-foreground">
            Move CI
          </p>
          <p className="text-xs text-sidebar-foreground/60">
            {role === "concessionnaire" ? "Espace concessionnaire" : "Espace auto-école"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((lien) => (
          <LienNav
            key={lien.href}
            lien={lien}
            actif={pathname.startsWith(lien.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ArrowLeftToLine className="size-4 shrink-0" />
          Retour au site
        </Link>
        <button
          type="button"
          onClick={seDeconnecter}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

export default function LayoutPartenaire({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navigate = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { notifications, nonLues: nonLuesNotifications, marquerLue, marquerToutesLues } =
    useNotifications();
  const [nonLuesMessages, setNonLuesMessages] = useState(0);
  const role = roleDepuisChemin(pathname);
  const titre = role === "concessionnaire" ? "Concessionnaire" : "Auto-école";

  useEffect(() => {
    api.get<{ unread_count: number }>("conversations/unread-count")
      .then((reponse) => setNonLuesMessages(reponse.unread_count))
      .catch(() => { });
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* desktop : sidebar fixe, jamais démontée au changement de page */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <ContenuSidebar role={role} pathname={pathname} />
      </aside>

      {/* navbar : sticky, visible mobile + desktop (offset lg:pl-64 pour laisser place à la sidebar) */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sidebar-border bg-background px-4 lg:pl-64">
        <button
          type="button"
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOuvert}
          aria-controls="menu-partenaire-mobile"
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-heading text-sm font-bold text-foreground">{titre}</span>

        <div className="ml-auto flex items-center gap-2">
          <Notifications
            notifs={notifications}
            nonLues={nonLuesNotifications}
            onMarquerLue={marquerLue}
            onToutMarquer={marquerToutesLues}
          />
          <button
            type="button"
            onClick={() => navigate.push("/messages")}
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
            id="menu-partenaire-mobile"
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
            <ContenuSidebar role={role} pathname={pathname} onNavigate={() => setMenuOuvert(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
