import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api";

/** 7 jours, en secondes : même durée que le cookie posé par api/auth/callback/route.ts. */
const SEPT_JOURS = 60 * 60 * 24 * 7;

export const POST = async (request: NextRequest) => {
  const { email, password } = await request.json();
  const reponse = await fetch(`${BACKEND_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  })
  if (!reponse.ok) {
    const corps = await reponse.json();
    return NextResponse.json(corps, { status: reponse.status });
  }

  const corps = await reponse.json();
  const reponseClient = NextResponse.json(corps);
  reponseClient.cookies.set("auth_token", corps.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEPT_JOURS,
  });
  reponseClient.cookies.set("user_role", corps.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEPT_JOURS,
  });

  return reponseClient;
};
