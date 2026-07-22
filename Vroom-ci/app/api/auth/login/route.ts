import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {LoginValidator} from "@/app/validator/loginValidator"

//appel l'api backend
const API_URL = process.env.BACKEND_URL || "http://localhost:8000/api";

export async function POST(req: NextRequest) {
    const body = await req.json()
    const resultat = LoginValidator.safeParse(body)
    if(!resultat.success){
        return NextResponse.json(
            {errors: resultat.error.flatten().fieldErrors},
            {status: 400}
        )
    }
    const controller = new AbortController();
    //on defini un temps que la requette a à mettre
    const timeout = setTimeout(() => {
        controller.abort()
    }, 15000);

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(resultat.data),
            signal: controller.signal
        })
        clearTimeout(timeout)
        const data = await res.json()
        if (!res.ok) {
            return NextResponse.json({
                message: data.message || "Erreur survenue lors de la connexion",
                errors: data.errors
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
            user: data.user,
            role: data.role
        })
    } catch (error) {
        clearTimeout(timeout)
        const message =
                    error instanceof DOMException && error.name === "AbortError"
                        ? "Le serveur met trop de temps à répondre"
                        : "Erreur de connexion au serveur";
                return NextResponse.json({ message }, { status: 500 })
    }
}