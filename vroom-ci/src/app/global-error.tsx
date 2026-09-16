"use client"; // une error boundary DOIT être un Client Component

/**
 * Filet de sécurité de dernier recours : se déclenche uniquement si `layout.tsx`
 * lui-même plante (donc `error.tsx`, qui vit SOUS le layout, ne peut pas l'attraper).
 *
 * Remplace tout le layout racine le temps de l'affichage : il doit fournir son
 * propre <html>/<body>, et volontairement en style inline plutôt qu'en Tailwind —
 * si la cause du crash touchait le layout ou le thème, ce fallback ne doit dépendre
 * d'aucun des deux pour rester lisible.
 */
export default function ErreurGlobale({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    return (
        <html lang="fr">
            <body
                style={{
                    display: "flex",
                    minHeight: "100vh",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1rem",
                    padding: "1rem",
                    textAlign: "center",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                <h2>L&apos;application a rencontré une erreur critique</h2>
                <button
                    onClick={() => retry()}
                    style={{
                        padding: "0.5rem 1.25rem",
                        borderRadius: "0.25rem",
                        border: "none",
                        background: "#efbf04",
                        cursor: "pointer",
                    }}
                >
                    Réessayer
                </button>
            </body>
        </html>
    );
}
