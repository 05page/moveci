import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api";

/** Next 16 : `params` est une Promise, il faut l'attendre. */
type Contexte = { params: Promise<{ path: string[] }> };

/**
 * Relaie la requête du navigateur vers Laravel en y ajoutant le token.
 * Le navigateur ne voit jamais le token : il est lu ici, côté serveur, dans le cookie httpOnly.
 */
async function relayer(request: NextRequest, { params }: Contexte) {
    const { path } = await params;
    const token = (await cookies()).get("auth_token")?.value;

    const entetes = new Headers({ Accept: "application/json" });
    if (token) entetes.set("Authorization", `Bearer ${token}`);

    // recopié tel quel : sur un upload multipart, il porte la frontière (boundary) sans laquelle Laravel ne lit rien
    const typeContenu = request.headers.get("content-type");
    if (typeContenu) entetes.set("Content-Type", typeContenu);

    const sansCorps = request.method === "GET" || request.method === "HEAD";

    const reponse = await fetch(
        `${BACKEND_URL}/${path.join("/")}${request.nextUrl.search}`,
        {
            method: request.method,
            headers: entetes,
            // arrayBuffer et non text() : préserve les octets bruts des photos de véhicules
            body: sansCorps ? undefined : await request.arrayBuffer(),
            cache: "no-store",
        }
    );

    const corps = await reponse.arrayBuffer();

    // un 204 doit avoir un corps VIDE, pas un buffer de longueur 0 : NextResponse lève sinon
    return new NextResponse(corps.byteLength === 0 ? null : corps, {
        status: reponse.status,
        headers: {
            "Content-Type": reponse.headers.get("content-type") ?? "application/json",
        },
    });
}

export const GET = relayer;
export const POST = relayer;
export const PUT = relayer;
export const PATCH = relayer;
export const DELETE = relayer;
