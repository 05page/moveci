import type { ApiResponse } from "@/src/types"

const PROXY_BASE = "/api/proxy"

async function readJsonResponse(res: Response) {
  const text = await res.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function getFriendlyErrorMessage(status: number, message?: unknown) {
  if (typeof message === "string" && message.trim()) return message

  if (status === 401) return "Votre session a expiré. Connectez-vous à nouveau."
  if (status === 403) return "Vous n'êtes pas autorisé à effectuer cette action."
  if (status === 404) return "La ressource demandée est introuvable."
  if (status === 422) return "Certaines informations sont invalides. Vérifiez le formulaire."
  if (status >= 500) return "Une erreur est survenue. Réessayez dans quelques instants."

  return "Impossible de terminer l'action. Réessayez."
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  const data = await readJsonResponse(res)

  if (res.status === 401) {
    if (typeof window !== "undefined" && window.location.pathname !== "/auth") {
      window.location.href = "/auth"
    }
    throw new ApiError("Votre session a expiré. Connectez-vous à nouveau.", 401)
  }

  if (!res.ok) {
    // Pour les 422, on préfère le premier message de validation spécifique au champ
    const firstFieldError = data.errors
      ? Object.values(data.errors as Record<string, string[]>).flat()[0]
      : undefined
    throw new ApiError(
      firstFieldError ?? getFriendlyErrorMessage(res.status, data.message),
      res.status,
      data.errors
    )
  }

  return data as ApiResponse<T>
}

// Raccourcis pour les methodes HTTP
api.get = <T = unknown>(endpoint: string) => api<T>(endpoint)

api.post = <T = unknown>(endpoint: string, body: unknown) =>
  api<T>(endpoint, { method: "POST", body: JSON.stringify(body) })

api.put = <T = unknown>(endpoint: string, body: unknown) =>
  api<T>(endpoint, { method: "PUT", body: JSON.stringify(body) })

api.delete = <T = unknown>(endpoint: string) =>
  api<T>(endpoint, { method: "DELETE" })

/**
 * Envoie une requête POST multipart/form-data (upload de fichiers).
 * Ne pas définir Content-Type manuellement — le navigateur le fait avec le bon boundary.
 */
api.upload = async <T = unknown>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> => {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    method: "POST",
    body: formData,
  })
  const data = await readJsonResponse(res)
  if (res.status === 401) {
    if (typeof window !== "undefined" && window.location.pathname !== "/auth") {
      window.location.href = "/auth"
    }
    throw new ApiError("Votre session a expiré. Connectez-vous à nouveau.", 401)
  }
  if (!res.ok) throw new ApiError(getFriendlyErrorMessage(res.status, data.message), res.status, data.errors)
  return data as ApiResponse<T>
}

api.logout = async () => {
  const res = await fetch('/api/auth/logout', {method: "POST"})
  return res.json();
}

// Classe d'erreur pour distinguer les erreurs API
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = "ApiError"
  }
}
