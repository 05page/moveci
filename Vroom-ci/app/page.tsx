import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDashBoard } from "@/src/core/auth/permission";
import { UserRole } from "@/src/types";
import LandingPage from "./landing/page";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  // Utilisateur connecté → direction son espace.
  // Les cas particuliers (compte suspendu, onboarding en cours) sont gérés
  // par le middleware au moment où il atterrit sur /client, /admin, etc.
  if (token) {
    const role = (cookieStore.get("user_role")?.value || "client") as UserRole;
    redirect(getDashBoard(role));
  }

  return <LandingPage />;
}
