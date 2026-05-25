import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.BACKEND_URL || "http://localhost:8000/api";

export async function POST(req: NextRequest) {
    //à terminer
    const body = await req.json();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort()
    }, 15000);

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body),
            signal: controller.signal
        })
        clearTimeout(timeout)
        const data = await res.json()
        if (!res.ok) {
            return NextResponse.json({
                message: data.message || "Erreur survenue lors de l'inscription", errors: data.error
            },
                { status: res.status })
        }
        const cookieStore = await cookies()
        cookieStore.set("auth_token", data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 3, // 3 jours
        })
        cookieStore.set("user_role", data.role || "client", {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 3, // 3 jours
        })

        return NextResponse.json({
            success: true,
            message: data.message,
            role: data.role
        })
    } catch (err) {
        clearTimeout(timeout);
        const message =
            err instanceof DOMException && err.name === "AbortError"
                ? "Le serveur met trop de temps à répondre"
                : "Erreur de connexion au serveur";
        return NextResponse.json({ message }, { status: 500 })
    }
}