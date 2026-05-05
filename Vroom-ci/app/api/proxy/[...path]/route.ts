import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

async function proxyToLaravel(request: NextRequest) {
  // Reconstruire le path : /api/proxy/stats → /stats
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/proxy/, "")
  const search = url.search // conserver les query params

  const backendUrl = `${process.env.BACKEND_URL}${path}${search}`

  // Lire le token depuis le cookie httpOnly
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  const headers: HeadersInit = {
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

  const res = await fetch(backendUrl, {
    method: request.method,
    headers,
    body: hasBody ? (contentType.includes("multipart/form-data") ? await request.arrayBuffer() : await request.text()) : undefined,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export const GET = proxyToLaravel
export const POST = proxyToLaravel
export const PUT = proxyToLaravel
export const PATCH = proxyToLaravel
export const DELETE = proxyToLaravel
