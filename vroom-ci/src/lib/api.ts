import type { ErreurAuth } from "@/types";

/** Base commune à tous les appels : voir app/api/proxy/[...path]/route.ts. */
const BASE = "/api/proxy";

type Corps = Record<string, unknown> | FormData;

async function requete<T>(
  path: string,
  options: { method: string; body?: Corps }
): Promise<T> {
  const { method, body } = options;

  // 1. Teste si `body` est une FormData (upload de photo) ou un objet JS classique.
  const estFormData = body instanceof FormData;

  // 2. Crée l'objet headers, vide pour l'instant.
  const headers: Record<string, string> = {}

  // 3. Si CE N'EST PAS une FormData, ajoute le header JSON.
  if (!estFormData) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), 30000);

  // 4. Appelle `fetch`, la fonction native du navigateur pour une requête HTTP.
  let response: Response;
  try {
     response = await fetch(`${BASE}/${path}`, {
      method,
      headers,
      body: estFormData ? body : JSON.stringify(body),
      signal: controller.signal
    });
    // 5-6. Échec : lire le corps d'erreur, recopier le status, throw.
    if (!response.ok) {
      const corpsErreur = await response.json();
      throw { success: false, status: response.status, ...corpsErreur } as ErreurAuth;
    }
    // 7. 204 : aucun corps à lire, on sort ici.
    if (response.status === 204) {
      return undefined as T;
    }
    
    // 8. Succès avec corps : on le lit et on le type.
    return (await response.json()) as T;
  } catch(erreur) {
    if(erreur instanceof Error && erreur.name === "AbortError"){
      throw {success: false, status: 0, message: "Délai dépassé réessaie."} as ErreurAuth;
    }
    throw erreur;
  }finally{
    clearTimeout(minuteur);
  }
}

export const api = {
  get: <T>(path: string) => requete<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: Corps) =>
    requete<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: Corps) =>
    requete<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => requete<T>(path, { method: "DELETE" }),
};

/**
 * Lit le message serveur d'une erreur levée par `requete()` (voir `throw` ci-dessus),
 * avec repli si l'erreur n'a pas cette forme (ex. le réseau a coupé avant même la réponse).
 */
export const messageErreur = (erreur: unknown, repli: string): string =>
  typeof erreur === "object" &&
    erreur !== null &&
    "message" in erreur &&
    typeof (erreur as ErreurAuth).message === "string"
    ? (erreur as ErreurAuth).message
    : repli;
