import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api";

/**
 * `auth_token`/`user_role` sont httpOnly (voir api/auth/callback/route.ts) :
 * seul le serveur peut les effacer, un `document.cookie` côté client ne les voit pas.
 */
export async function POST() {
    const token = (await cookies()).get("auth_token")?.value;

    if (token) {
        // révocation du token Sanctum côté back — best-effort, les cookies sont
        // effacés juste après de toute façon même si le back ne répond pas
        await fetch(`${BACKEND_URL}/logout`, {
            method: "POST",
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
        }).catch(() => {});
    }

    const reponse = NextResponse.json({ success: true });
    reponse.cookies.delete("auth_token");
    reponse.cookies.delete("user_role");
    return reponse;
}
