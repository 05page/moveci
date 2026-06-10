"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { MapPin } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

// Chargement côté client uniquement — Leaflet utilise window/document
// qui n'existent pas lors du rendu serveur (SSR) de Next.js.
const MapPickerLeaflet = dynamic(() => import("./MapPickerLeaflet"), {
    ssr: false,
    loading: () => (
        <div className="h-[380px] rounded-xl bg-zinc-100 flex items-center justify-center text-sm text-zinc-400">
            Chargement de la carte…
        </div>
    ),
})

interface MapPickerProps {
    /** Adresse actuellement enregistrée, affichée sur le bouton déclencheur. */
    currentValue?: string
    /** Appelé quand l'utilisateur valide sa position sur la carte. */
    onSelect: (data: { adresse: string; latitude: number; longitude: number }) => void
}

export function MapPicker({ currentValue, onSelect }: MapPickerProps) {
    const [open, setOpen] = useState(false)

    const handleSelect = (data: { adresse: string; latitude: number; longitude: number }) => {
        onSelect(data)
        setOpen(false)
    }

    return (
        <>
            {/* Bouton déclencheur — affiche l'adresse actuelle ou un placeholder */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full flex items-center gap-3 px-4 h-11 rounded-xl border border-zinc-200 bg-white text-sm text-left hover:bg-zinc-50 transition-colors"
            >
                <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className={currentValue ? "text-zinc-800 truncate" : "text-zinc-400"}>
                    {currentValue || "Choisir sur la carte"}
                </span>
            </button>

            {/* Dialogue avec la carte */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Sélectionnez votre position
                        </DialogTitle>
                    </DialogHeader>
                    <MapPickerLeaflet onSelect={handleSelect} />
                    <p className="text-xs text-zinc-400 text-center">
                        Cliquez sur la carte pour placer le marqueur · La position est confirmée automatiquement
                    </p>
                </DialogContent>
            </Dialog>
        </>
    )
}
