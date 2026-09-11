import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api";
const SEPT_JOURS = 60 * 60 * 24 * 7;

export const POST = async (request: NextRequest) => {
    const donnees = await request.json();

    const response = await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(donnees),
    })
    // 3. Si Laravel répond une erreur, relaie SON corps et SON status tels
    //    quels (voir login/route.ts étape 3 — un register raté est souvent
    //    un 422 avec `errors` par champ, à ne pas reconstruire ici).
    if (!response.ok) {
        const corps = await response.json();
        return NextResponse.json(corps, { status: response.status });
    }

    // 4. Sinon, lis le corps de succès et pose le cookie `auth_token` dessus
    //    avant de renvoyer la réponse (voir login/route.ts étapes 4-5 —
    //    exactement la même mécanique).
    const corps = await response.json();
    const reponseClient = NextResponse.json(corps);
    reponseClient.cookies.set("auth_token", corps.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SEPT_JOURS,
    })
    return reponseClient;
}
