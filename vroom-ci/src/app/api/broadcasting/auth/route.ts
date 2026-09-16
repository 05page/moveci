import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// `BACKEND_URL` (utilisé par le proxy /api) inclut déjà "/api" ; Laravel expose
// /broadcasting/auth à la racine (voir AppServiceProvider::boot), d'où le retrait.
const BACKEND_ROOT_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

/**
 * Relaie l'authentification des canaux privés Reverb vers Laravel.
 * Même raison d'être que /api/proxy : le token vit dans un cookie httpOnly,
 * illisible par le client Echo tournant dans le navigateur — ce fichier tourne
 * côté serveur Next.js, où le cookie est lisible, et y ajoute le Bearer token.
 */
export const POST = async (request: NextRequest) => {
  const token = (await cookies()).get("auth_token")?.value;

  const entetes = new Headers({ Accept: "application/json" });
  if (token) entetes.set("Authorization", `Bearer ${token}`);

  // Pusher/Echo envoie channel_name + socket_id en x-www-form-urlencoded : recopié tel quel.
  const typeContenu = request.headers.get("content-type");
  if (typeContenu) entetes.set("Content-Type", typeContenu);

  const reponse = await fetch(`${BACKEND_ROOT_URL}/broadcasting/auth`, {
    method: "POST",
    headers: entetes,
    body: await request.arrayBuffer(),
    cache: "no-store",
  });

  const corps = await reponse.arrayBuffer();

  return new NextResponse(corps.byteLength === 0 ? null : corps, {
    status: reponse.status,
    headers: {
      "Content-Type": reponse.headers.get("content-type") ?? "application/json",
    },
  });
};
