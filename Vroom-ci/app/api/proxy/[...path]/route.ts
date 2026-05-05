import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const TECHNICAL_ERROR_PATTERN =
  /(SQLSTATE|Connection:|SQL:|PDOException|QueryException|Datatype mismatch|stack trace|column .* is of type|syntax error|duplicate key|foreign key|constraint)/i

const GENERIC_ERROR_MESSAGES: Record<number, string> = {
  400: "La demande est incorrecte. Vérifiez les informations saisies.",
  401: "Votre session a expiré. Connectez-vous à nouveau.",
  403: "Vous n'êtes pas autorisé à effectuer cette action.",
  404: "La ressource demandée est introuvable.",
  409: "Cette action entre en conflit avec l'état actuel des données.",
  413: "Le fichier envoyé est trop volumineux.",
  422: "Certaines informations sont invalides. Vérifiez le formulaire.",
  429: "Trop de tentatives. Réessayez dans quelques instants.",
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function looksTechnical(value: unknown): boolean {
  if (typeof value === "string") return TECHNICAL_ERROR_PATTERN.test(value)
  if (Array.isArray(value)) return value.some(looksTechnical)
  if (isPlainObject(value)) return Object.values(value).some(looksTechnical)
  return false
}

function messageForStatus(status: number) {
  return GENERIC_ERROR_MESSAGES[status] ?? "Une erreur est survenue. Réessayez dans quelques instants."
}

function sanitizeBackendResponse(data: unknown, status: number, path: string) {
  if (status < 400) return data

  const payload = isPlainObject(data) ? data : {}
  const message = typeof payload.message === "string" ? payload.message : undefined
  const errors = payload.errors
  const hasTechnicalDetails = looksTechnical(message) || looksTechnical(errors)
  const isServerError = status >= 500

  if (hasTechnicalDetails || isServerError) {
    console.error("Backend API error hidden from user", { path, status, data })

    return {
      success: false,
      message: messageForStatus(status),
    }
  }

  return {
    ...payload,
    message: message || messageForStatus(status),
  }
}

async function proxyToLaravel(request: NextRequest) {
  // Reconstruire le path : /api/proxy/stats → /stats
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/proxy/, "")
  const search = url.search // conserver les query params

  const backendUrl = `${process.env.BACKEND_URL}${path}${search}`

  // Lire le token depuis le cookie httpOnly
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // Ne pas mettre Content-Type pour les requetes sans body (GET, DELETE)
  const hasBody = ["POST", "PUT", "PATCH"].includes(request.method)
  if (hasBody) {
    headers["Content-Type"] = "application/json"
  }
  const contentType = request.headers.get("content-type") || ""
  if(contentType.includes("multipart/form-data")){
    headers["Content-Type"] = contentType
  }

  try {
    const res = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: hasBody ? (contentType.includes("multipart/form-data") ? await request.arrayBuffer() : await request.text()) : undefined,
    })

    const text = await res.text()
    let data: unknown = {}

    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text }
      }
    }

    return NextResponse.json(sanitizeBackendResponse(data, res.status, path), { status: res.status })
  } catch (error) {
    console.error("Proxy API error", { path, error })

    return NextResponse.json(
      {
        success: false,
        message: "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.",
      },
      { status: 502 },
    )
  }
}

export const GET = proxyToLaravel
export const POST = proxyToLaravel
export const PUT = proxyToLaravel
export const PATCH = proxyToLaravel
export const DELETE = proxyToLaravel
