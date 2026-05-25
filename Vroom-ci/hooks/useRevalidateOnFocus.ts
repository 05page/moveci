import { useEffect, useRef } from "react"

/**
 * useRevalidateOnFocus
 *
 * Appelle `refresh` automatiquement dans deux situations :
 *  1. L'utilisateur revient sur l'onglet (visibilitychange → visible)
 *  2. La fenêtre reprend le focus (window focus)
 *
 * Un debounce de 2 secondes évite les doubles appels quand les deux
 * événements se déclenchent en même temps (ce qui est fréquent).
 *
 * Un staleTime évite de refetcher si les données sont encore "fraîches".
 * Le fetch initial au montage du composant compte comme premier refresh.
 *
 * @param refresh    - callback à appeler pour recharger les données
 * @param enabled    - désactiver le hook sans le démonter (défaut : true)
 * @param staleTime  - délai minimum en ms entre deux refreshes (défaut : 2 min)
 *
 * @example
 * const fetchData = useCallback(async () => { ... }, [])
 * useRevalidateOnFocus(fetchData)
 */
export function useRevalidateOnFocus(
    refresh: () => void,
    enabled: boolean = true,
    staleTime: number = 2 * 60 * 1000, // 2 minutes entre deux refreshes au minimum
): void {
    // useRef pour stocker le timer sans provoquer de re-render
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Timestamp du dernier refresh — initialisé à now() car le fetch
    // initial du composant est considéré comme le premier refresh.
    const lastRefreshRef = useRef<number>(Date.now())

    // On garde une ref stable vers `refresh` pour éviter de recréer
    // les listeners à chaque render si la référence de la fonction change.
    const refreshRef = useRef(refresh)
    useEffect(() => {
        refreshRef.current = refresh
    }, [refresh])

    useEffect(() => {
        if (!enabled) return

        /**
         * Lance un appel à refresh avec un debounce de 2s.
         * Si la fonction est rappelée avant la fin du délai,
         * le timer précédent est annulé (pas de double fetch).
         *
         * Après le délai, on vérifie si staleTime est écoulé depuis
         * le dernier refresh. Si non → on ne fait rien.
         */
        const debouncedRefresh = () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                const now = Date.now()
                if (now - lastRefreshRef.current < staleTime) return
                lastRefreshRef.current = now
                refreshRef.current()
            }, 2000)
        }

        // Handler visibilitychange : déclenché quand l'utilisateur
        // revient sur l'onglet après l'avoir mis en arrière-plan.
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                debouncedRefresh()
            }
        }

        // Handler focus : déclenché quand la fenêtre reprend le focus
        // (ex: l'utilisateur revient d'une autre application).
        const handleFocus = () => {
            debouncedRefresh()
        }

        document.addEventListener("visibilitychange", handleVisibility)
        window.addEventListener("focus", handleFocus)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility)
            window.removeEventListener("focus", handleFocus)
            // Nettoyage du timer en cours au démontage
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [enabled, staleTime])
}
