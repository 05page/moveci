import { getDashBoard } from "@/src/core/auth/permission"
import { UserRole } from "@/src/types"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod";

// Laravel redirige ici après Google OAuth avec ?code=UUID (jamais le token brut)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const codeCheck = z.string().uuid().safeParse(code)
  if(!codeCheck.success){
    return NextResponse.redirect(new URL("/auth?error=invalid_code", request.url))
  }

  // Échanger le code temporaire contre le vrai token (appel serveur → serveur)
  const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api"
  const exchangeRes = await fetch(`${backendUrl}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })

  if (!exchangeRes.ok) {
    return NextResponse.redirect(new URL("/auth?error=code_expired", request.url))
  }

  const { token, role, statut, needs_onboarding: needsOnboarding } = await exchangeRes.json()

  // Utilisateur banni ou suspendu → page bloquée directement
  if (statut === "suspendu" || statut === "banni") {
    return NextResponse.redirect(new URL(`/compte-bloque?raison=${statut}`, request.url))
  }

  // Nouveau user Google → onboarding avant le dashboard
  const redirectPath = needsOnboarding ? "/onboarding" : getDashBoard(role as UserRole)
  const response = NextResponse.redirect(new URL(redirectPath, request.url))

  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 3, // 3 jours
  })
  response.cookies.set("user_role", role || "client", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 3, // 3 jours
  })
  response.cookies.set("user_statut", statut, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 3, // 3 jours
  })

  // Cookie temporaire pour protéger la route /onboarding dans le middleware
  if (needsOnboarding) {
    response.cookies.set("onboarding_pending", "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes — supprimé après complétion
    })
  }

  return response
}
