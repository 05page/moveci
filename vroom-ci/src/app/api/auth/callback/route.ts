import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api";

/** 7 jours, en secondes : durée de vie du cookie de session. */
const SEPT_JOURS = 60 * 60 * 24 * 7;

/** Où atterrir après connexion. `/partenaire` et l'espace admin n'existent pas encore : repli sur les pages réelles. */
const ACCUEIL_PAR_ROLE: Record<string, string> = {
    client: "/vehicules",
    vendeur: "/vendeur/profile",
    concessionnaire: "/partenaire/concessionnaire/dashboard",
    auto_ecole: "/partenaire/auto_ecole/dashboard",
    admin: "/admin/dashboard",
};

type ReponseEchange = {
    token: string;
    role: string;
    statut: string;
    needs_onboarding: boolean;
};

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(new URL("/auth?error=code_manquant", request.url));
    }

    // le code est à usage unique et vit 60 s côté back (Cache::pull) : il ne peut pas être rejoué
    const echange = await fetch(`${BACKEND_URL}/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code }),
        cache: "no-store",
    });

    if (!echange.ok) {
        return NextResponse.redirect(new URL("/auth?error=code_expire", request.url));
    }

    const { token, role, needs_onboarding }: ReponseEchange = await echange.json();

    const destination = needs_onboarding
        ? "/auth/onboarding"
        : (ACCUEIL_PAR_ROLE[role] ?? "/");

    const redirection = NextResponse.redirect(new URL(destination, request.url));

    // httpOnly : le JS du navigateur ne peut pas lire ce cookie, donc un XSS ne peut pas voler le token
    redirection.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SEPT_JOURS,
    });

    redirection.cookies.set("user_role", role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SEPT_JOURS,
    });

    return redirection;
}
