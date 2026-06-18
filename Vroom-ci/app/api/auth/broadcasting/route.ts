import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod";

/**
 * Proxy d'authentification pour les canaux privés Reverb/Echo.
 *
 * Pourquoi cette route existe :
 * - Le token Bearer est dans un cookie httpOnly → inaccessible depuis le JS du navigateur
 * - Echo envoie un POST ici pour authentifier un canal privé
 * - On lit le cookie côté serveur et on forward la requête à Laravel avec le token
 *
 * Flow : [Echo browser] → POST /api/auth/broadcasting → POST Laravel /broadcasting/auth
 */
export async function POST(request: NextRequest) {
  // Lecture du cookie httpOnly (impossible depuis le navigateur directement)
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  // Sans token, l'utilisateur n'est pas connecté → on refuse l'auth
  if (!token) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
  }

  // Lecture du body envoyé par Echo (format: socket_id=xxx&channel_name=yyy)
  const body = await request.text()
  const param = new URLSearchParams(body)
  const socket_id = param.get('socket_id')
  const channel_name = param.get('channel_name')

  const check = z.object({
    socket_id: z.string().regex(/^\d+\.\d+$/),
    channel_name: z.string().min(1).max(200)
  }).safeParse({ socket_id, channel_name })

  if (!check.success) {
    return NextResponse.json({ message: "Données invalides" }, { status: 400 })
  }

  const backendBase = process.env.BACKEND_URL?.replace(/\/api$/, "") ?? "http://127.0.0.1:8000"

  const res = await fetch(`${backendBase}/broadcasting/auth`, {
    method: "POST",
    headers: {
      // Le token identifie l'utilisateur auprès de Laravel
      Authorization: `Bearer ${token}`,
      // Laravel attend du form-urlencoded pour l'auth broadcasting (pas du JSON)
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  })

  // Si Laravel retourne du HTML (crash, 500...), res.json() throw → on log et on propage
  let data: unknown
  try {
    data = await res.json()
  } catch {
    const text = await res.text().catch(() => "(unreadable)")
    console.error("[broadcasting/auth] Backend non-JSON response:", res.status, text.slice(0, 500))
    return NextResponse.json({ message: "Erreur broadcasting backend" }, { status: 502 })
  }

  // On retourne la réponse de Laravel telle quelle (contient la signature du canal)
  return NextResponse.json(data, { status: res.status })
}
