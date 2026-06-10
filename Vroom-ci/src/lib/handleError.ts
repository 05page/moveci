import { ApiError } from "./api"

export function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        // Erreur réseau
        const msg = error.message.toLowerCase()
        if (msg.includes("fetch failed") || msg.includes("failed to fetch") || msg.includes("network")) {
            return "Impossible de joindre le serveur. Vérifiez votre connexion."
        }
        // Erreurs de validation (422) — afficher chaque erreur champ par champ
        if (error.errors && Object.keys(error.errors).length > 0) {
            return Object.values(error.errors).flat().join(" ")
        }
        return error.message
    }
    if (error instanceof Error) {
        return error.message
    }
    return "Une erreur est survenue. Réessayez dans quelques instants."
}