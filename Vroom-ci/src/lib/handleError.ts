export function getErrorMessage(error: unknown){
    if(error instanceof Error){
        const msg = error.message.toLowerCase()
        if(msg.includes("fetch failed") || msg.includes("failed to fetch") || msg.includes("network")){
            return "Impossible de joindre le serveur. Vérifier votre connexion"
        }
        return error.message
    }
    return "Une erreur est survenue. Réessayez dans quelques instants."
}