import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Même mapping que api/auth/callback/route.ts — seuls les rôles "opérateur"
 *  (jamais côté vitrine publique) sont renvoyés d'office vers leur espace. */
const ACCUEIL_PAR_ROLE: Record<string, string> = {
  concessionnaire: "/partenaire/concessionnaire/dashboard",
  auto_ecole: "/partenaire/auto_ecole/dashboard",
  admin: "/admin/dashboard",
};

export const proxy = (request: NextRequest) => {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // Racine publique : un admin/concessionnaire/auto_ecole déjà connecté n'a rien à faire sur
  // la vitrine publique — on le renvoie direct vers son espace. Anonyme/client/vendeur voient
  // la page normalement (elle reste publique, pas de redirection vers /auth ici).
  if (pathname === "/") {
    const role = token ? request.cookies.get("user_role")?.value : undefined;
    const destination = role ? ACCUEIL_PAR_ROLE[role] : undefined;

    return destination
      ? NextResponse.redirect(new URL(destination, request.url))
      : NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // 3. Sinon, laisse la requête continuer normalement.
  return NextResponse.next();
};

export const config = {
  matcher: ["/", "/client/:path*", "/vendeur/:path*", "/partenaire/:path*", "/admin/:path"]
}
