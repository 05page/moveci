//permission
import { UserRole } from "@/src/types";

const  ROLE_ROUTES: Record<UserRole, string[]> = {
    admin: ["/admin"],
    vendeur: ["/vendeur"],
    concessionnaire: ["/partenaire"],
    auto_ecole: ["/partenaire"],
    client: ["/client"]
}

// Routes interdites par sous-rôle partenaire
// auto_ecole n'a pas de garage → concessionnaire n'a pas de formations
const BLOCKED_ROUTES: Partial<Record<UserRole, string[]>> = {
    auto_ecole:     ["/partenaire/mongarage"],
    concessionnaire: ["/partenaire/formations"],
}

const ROLE_DASHBOARD: Record<UserRole, string> = {
    admin: "/admin/dashboard",
    vendeur: "/vendeur/dashboard",
    concessionnaire: "/partenaire/dashboard",
    auto_ecole: "/partenaire/dashboard",
    client: "/client/profile"
}

export const PUBLIC_ROUTES = ["/auth", "/auth/callback"];

export function isAdmin(role: UserRole) {
    return role === "admin";
}   

export function getDashBoard(role: UserRole) {
    return ROLE_DASHBOARD[role] || "/auth";
}

export function hasRouteAccess(role:UserRole, pathname:string):boolean
{
    // Vérifier d'abord les routes explicitement bloquées pour ce rôle
    const blocked = BLOCKED_ROUTES[role] ?? []
    if (blocked.some(route => pathname.startsWith(route))) return false

    const allowedRoutes = ROLE_ROUTES[role];
    if(!allowedRoutes) return false;
    if(allowedRoutes.includes("*")) return true;
    return allowedRoutes.some(route => pathname.startsWith(route));
}

export function isPublicRoute(pathname:string):boolean
{
    return PUBLIC_ROUTES.some(route => pathname.startsWith(route)); //startsWith vérifie si une chaîne de caractères commence par une autre chaîne de caractères spécifiée
}
