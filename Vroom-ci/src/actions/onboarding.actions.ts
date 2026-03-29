import { api } from "../lib/api";
import { User } from "../types";

export async function submitOnboardingProfile(data: {
    telephone: string
    adresse: string
}) {
    return api.post("/auth/complete-onboarding", data)
}

// Action spécifique auto-école — champs différents de submitOnboardingProfile
export async function submitAutoEcoleProfile(data: {
    raison_sociale: string
    numero_agrement: string
}) {
    return api.post("/auth/complete-onboarding", data)
}

export async function finishOnboarding() {
    return api.post<{user: User}>("/auth/finish-onboarding", {})
}