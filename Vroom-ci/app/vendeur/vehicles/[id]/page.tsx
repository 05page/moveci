"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    ArrowLeft,
    Car,
    Fuel,
    Settings,
    Gauge,
    AlertTriangle,
    Tag,
    KeyRound,
    Calendar,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { vehicule } from "@/src/types"
import { getMonVehicule } from "@/src/actions/vehicules.actions"
import { cn, getPhotoUrl } from "@/src/lib/utils"

// ─── Types locaux ─────────────────────────────────────────────────────────────

/**
 * Extension locale du type vehicule pour inclure le champ description_validation
 * qui n'est pas encore dans les types globaux mais bien retourné par l'API.
 */
type MonVehicule = vehicule & {
    description_validation?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retourne les classes Tailwind du badge selon le statut de validation
 * et le statut opérationnel du véhicule.
 */
const getValidationBadgeClass = (status_validation?: string): string => {
    switch (status_validation) {
        case "validee":
        case "restauree":
            return "bg-green-500/15 text-green-700 border-green-500/30"
        case "rejetee":
            return "bg-red-500/15 text-red-700 border-red-500/30"
        case "en_attente":
            return "bg-amber-500/15 text-amber-700 border-amber-500/30"
        default:
            return "bg-zinc-500/15 text-zinc-600 border-zinc-500/20"
    }
}

/**
 * Retourne les classes Tailwind du badge pour le statut opérationnel (statut).
 */
const getStatutBadgeClass = (statut?: string): string => {
    switch (statut) {
        case "disponible":
            return "bg-green-500/15 text-green-700 border-green-500/30"
        case "suspendu":
        case "banni":
            return "bg-zinc-500/15 text-zinc-500 border-zinc-500/20"
        default:
            return "bg-zinc-500/15 text-zinc-500 border-zinc-500/20"
    }
}

/** Formate le label lisible du status_validation. */
const getValidationLabel = (status_validation?: string): string => {
    switch (status_validation) {
        case "validee":    return "Validé"
        case "restauree":  return "Restauré"
        case "rejetee":    return "Rejeté"
        case "en_attente": return "En attente"
        default:           return status_validation ?? "—"
    }
}

// ─── Skeleton de chargement ───────────────────────────────────────────────────

const VehicleDetailSkeleton = () => (
    <div className="pt-20 px-4 md:px-6 max-w-4xl mx-auto mb-12 space-y-4">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
        </div>
    </div>
)

// ─── Page principale ──────────────────────────────────────────────────────────

const MonVehiculeDetailPage = () => {
    const params = useParams()

    const [vehiculeData, setVehiculeData] = useState<MonVehicule | null>(null)
    const [isLoading, setIsLoading]       = useState(true)
    const [notFound, setNotFound]         = useState(false)

    // ── Chargement ────────────────────────────────────────────────────────────
    useEffect(() => {
        const id = params?.id as string
        if (!id) return

        const fetchVehicule = async () => {
            setIsLoading(true)
            try {
                const res = await getMonVehicule(id)
                if (!res?.data) {
                    setNotFound(true)
                    return
                }
                setVehiculeData(res.data as MonVehicule)
            } catch {
                setNotFound(true)
            } finally {
                setIsLoading(false)
            }
        }

        fetchVehicule()
    }, [params?.id])

    // ── État chargement ───────────────────────────────────────────────────────
    if (isLoading) return <VehicleDetailSkeleton />

    // ── État erreur / introuvable ─────────────────────────────────────────────
    if (notFound || !vehiculeData) {
        return (
            <div className="pt-20 px-4 max-w-4xl mx-auto mb-12 flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                    <Car className="h-10 w-10 text-zinc-300" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900 mb-2">Véhicule introuvable</h2>
                <p className="text-sm text-zinc-500 mb-6 max-w-sm">
                    Ce véhicule n'existe pas ou ne vous appartient pas.
                </p>
                <Link href="/vendeur/vehicles">
                    <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour à mes véhicules
                    </Button>
                </Link>
            </div>
        )
    }

    // ── Données dérivées ──────────────────────────────────────────────────────
    const photos  = vehiculeData.photos ?? []
    const isVente = vehiculeData.post_type === "vente"
    const isRejete = vehiculeData.status_validation === "rejetee"

    /** Caractéristiques clés affichées dans la grille. */
    const specs = [
        { label: "Prix",          value: vehiculeData.prix ? `${vehiculeData.prix.toLocaleString("fr-FR")} FCFA${!isVente ? " / jour" : ""}` : "—", icon: Tag },
        { label: "Kilométrage",   value: vehiculeData.description?.kilometrage ? `${Number(vehiculeData.description.kilometrage).toLocaleString("fr-FR")} km` : "—", icon: Gauge },
        { label: "Carburant",     value: vehiculeData.description?.carburant ?? "—", icon: Fuel },
        { label: "Transmission",  value: vehiculeData.description?.transmission ?? "—", icon: Settings },
        { label: "Année",         value: vehiculeData.description?.annee ? String(vehiculeData.description.annee) : "—", icon: Calendar },
        { label: "Type",          value: isVente ? "Vente" : "Location", icon: KeyRound },
    ]

    // ── Rendu ─────────────────────────────────────────────────────────────────
    return (
        <div className="pt-20 px-4 md:px-6 max-w-4xl mx-auto mb-16 space-y-5 animate-in fade-in slide-in-from-bottom duration-500">

            {/* Lien retour */}
            <Link
                href="/vendeur/vehicles"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour à mes véhicules
            </Link>

            {/* ── Titre + badges de statut ──────────────────────────────────── */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">
                    {vehiculeData.description?.marque} {vehiculeData.description?.modele}
                </h1>
                <p className="text-sm text-zinc-500">
                    {vehiculeData.description?.annee}
                    &nbsp;·&nbsp;{vehiculeData.description?.carburant}
                    &nbsp;·&nbsp;{vehiculeData.description?.transmission}
                </p>

                {/* Badges statuts */}
                <div className="flex flex-wrap gap-2 mt-1">
                    {/* Badge validation (état admin) */}
                    <Badge className={cn(
                        "rounded-full font-semibold border",
                        getValidationBadgeClass(vehiculeData.status_validation)
                    )}>
                        {getValidationLabel(vehiculeData.status_validation)}
                    </Badge>

                    {/* Badge statut opérationnel — masqué si rejeté ou en attente pour ne pas créer de confusion */}
                    {!["rejetee", "en_attente"].includes(vehiculeData.status_validation ?? "") && (
                        <Badge className={cn(
                            "rounded-full font-semibold border capitalize",
                            getStatutBadgeClass(vehiculeData.statut)
                        )}>
                            {vehiculeData.statut ?? "—"}
                        </Badge>
                    )}

                    {/* Badge type de publication */}
                    <Badge variant="outline" className="rounded-full">
                        {isVente ? "Vente" : "Location"}
                    </Badge>
                </div>
            </div>

            {/* ── Alerte rejet — affichée seulement si status_validation === 'rejetee' ── */}
            {isRejete && (
                <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-red-700 mb-1">Annonce rejetée</p>
                        {vehiculeData.description_validation ? (
                            <p className="text-sm text-red-600 leading-relaxed">
                                {vehiculeData.description_validation}
                            </p>
                        ) : (
                            <p className="text-sm text-red-500 italic">
                                Aucun motif précisé par l'équipe de modération.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Galerie photos ─────────────────────────────────────────────── */}
            {photos.length > 0 ? (
                <div>
                    <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                        Photos ({photos.length})
                    </h2>
                    <div className={cn(
                        "grid gap-2",
                        photos.length === 1
                            ? "grid-cols-1"
                            : photos.length === 2
                                ? "grid-cols-2"
                                : "grid-cols-2 sm:grid-cols-3"
                    )}>
                        {photos.map((photo, i) => {
                            const url = getPhotoUrl(photo.path)
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "relative rounded-xl overflow-hidden bg-zinc-100",
                                        // La photo principale occupe toute la largeur si c'est la première
                                        i === 0 && photos.length > 1 ? "col-span-2 sm:col-span-3 h-52" : "h-36"
                                    )}
                                >
                                    <Image
                                        src={url}
                                        alt={`Photo ${i + 1} — ${vehiculeData.description?.marque} ${vehiculeData.description?.modele}`}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    {/* Badge "Principale" sur la première photo */}
                                    {i === 0 && (
                                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/50 text-white">
                                            Principale
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                /* Placeholder quand aucune photo */
                <div className="h-48 rounded-2xl bg-zinc-100 flex flex-col items-center justify-center gap-2 border border-zinc-200 border-dashed">
                    <Car className="h-12 w-12 text-zinc-300" />
                    <p className="text-sm text-zinc-400">Aucune photo disponible</p>
                </div>
            )}

            <Separator />

            {/* ── Caractéristiques clés ─────────────────────────────────────── */}
            <div>
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Caractéristiques
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {specs.map(spec => (
                        <div
                            key={spec.label}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200"
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-200/60 flex items-center justify-center shrink-0">
                                <spec.icon className="h-4 w-4 text-zinc-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-zinc-400 leading-tight">{spec.label}</p>
                                <p className="text-sm font-bold text-zinc-800 truncate">{spec.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Lien édition — raccourci utile depuis cette page ─────────── */}
            <Card className="rounded-2xl border border-zinc-200 shadow-none bg-zinc-50/50">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-zinc-800">Modifier cette annonce</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Corrigez les informations ou ajoutez des photos depuis la liste de vos véhicules.
                        </p>
                    </div>
                    <Link href="/vendeur/vehicles">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-zinc-300 text-zinc-700 hover:bg-zinc-100 shrink-0 cursor-pointer"
                        >
                            Voir la liste
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}

export default MonVehiculeDetailPage
