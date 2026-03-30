import { getDashBoard } from "@/src/core/auth/permission"
import { UserRole } from "@/src/types"
import { NextRequest, NextResponse } from "next/server"

// Laravel redirige ici apres Google OAuth avec ?token=xxx&role=xxx
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const role = request.nextUrl.searchParams.get("role")
  const statut = request.nextUrl.searchParams.get("statut") ?? "actif"
  const needsOnboarding = request.nextUrl.searchParams.get("needs_onboarding") === "1"

  if (!token) {
    return NextResponse.redirect(new URL("/auth?error=no_token", request.url))
  }

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
    maxAge: 60 * 60 * 24 * 7,
  })
  response.cookies.set("user_role", role || "client", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  response.cookies.set("user_statut", statut, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
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
