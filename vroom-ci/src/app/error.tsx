"use client"; // une error boundary DOIT être un Client Component : Next l'exige

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Filet de sécurité pour toute page sous `app/` qui n'a pas son propre `error.tsx`.
 * Ne couvre QUE les erreurs de rendu (throw pendant le render) — pas celles d'un
 * onClick ni d'un `await` dans un useEffect, que React ne fait pas remonter ici.
 *
 * Next 16 : le second prop s'appelle `retry`, pas `reset` (renommé depuis la v15).
 */
export default function Erreur({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    useEffect(() => {
        // point d'accroche pour un futur service de suivi d'erreurs (Sentry, etc.)
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <AlertTriangle className="size-10 text-destructive" />
            <h2 className="text-lg font-semibold">Un problème est survenu</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
                Quelque chose s&apos;est mal passé de notre côté. Réessaie, ou reviens plus
                tard si le problème persiste.
            </p>
            <Button onClick={() => retry()}>Réessayer</Button>
        </div>
    );
}
