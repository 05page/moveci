import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api";

/** 7 jours, en secondes : même durée que le cookie posé par api/auth/callback/route.ts. */
const SEPT_JOURS = 60 * 60 * 24 * 7;

/**
 * POST /api/auth/complete-onboarding — relaie vers Laravel avec le Bearer token
 * lu dans le cookie httpOnly (l'utilisateur est déjà connecté depuis l'échange
 * OAuth, /api/auth/callback/route.ts). Contrairement à login/register, aucun
 * nouveau token n'est émis ici : seul le cookie `user_role` doit être rafraîchi,
 * puisqu'il valait "client" par défaut (role encore `null` côté back au moment
 * de l'échange) — sans cette mise à jour, le Header afficherait le mauvais rôle
 * jusqu'à la prochaine connexion.
 */
export const POST = async (request: NextRequest) => {
    const donnees = await request.json();
    const token = (await cookies()).get("auth_token")?.value;

    const reponse = await fetch(`${BACKEND_URL}/auth/complete-onboarding`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(donnees),
        cache: "no-store",
    });

    const corps = await reponse.json();

    if (!reponse.ok) {
        // `status` injecté dans le corps : lib/validation.ts/ErreurAuth le lit
        // depuis l'objet jeté par le front, pas depuis le status HTTP brut.
        return NextResponse.json({ status: reponse.status, ...corps }, { status: reponse.status });
    }

    const reponseClient = NextResponse.json(corps);
    reponseClient.cookies.set("user_role", corps.data.role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SEPT_JOURS,
    });

    return reponseClient;
};
