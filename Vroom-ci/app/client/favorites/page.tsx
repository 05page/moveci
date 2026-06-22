"use client"

import { getErrorMessage } from "@/src/lib/handleError"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart, Car, Search, Calendar, Gauge, SlidersHorizontal, Loader2 } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Favori } from "@/src/types"
import { getFavoris, removeFavori } from "@/src/actions/favoris.actions"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { getPhotoUrl } from "@/src/lib/utils"
import Link from "next/link"
import Image from "next/image"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

type SortKey = "recent" | "prix_asc" | "prix_desc"

const SORT_LABELS: Record<SortKey, string> = {
    recent: "Plus récents",
    prix_asc: "Prix croissant",
    prix_desc: "Prix décroissant",
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const FavoritesLoading = () => (
    <div className="min-h-screen bg-zinc-50 pt-20 px-4 md:px-8 pb-16 space-y-6">
        <div className="space-y-1">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-9 w-48 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white border border-zinc-200">
                    <Skeleton className="h-44 w-full rounded-none" />
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-9 w-full rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    </div>
)

// ─── Page ────────────────────────────────────────────────────────────────────

const FavoritesPage = () => {
    const [favoris, setFavoris] = useState<Favori[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<SortKey>("recent")

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await getFavoris()
            setFavoris(res.data ?? [])
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])
    useRevalidateOnFocus(fetchData)
    useDataRefresh("vehicule", fetchData)

    const handleRemoveFavori = async (vehiculeId: string) => {
        setRemovingId(vehiculeId)
        try {
            await removeFavori(vehiculeId)
            setFavoris(prev => prev.filter(f => f.vehicule_id !== vehiculeId))
            toast.success("Véhicule retiré des favoris")
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setRemovingId(null)
        }
    }

    const sorted = [...favoris].sort((a, b) => {
        if (sortBy === "prix_asc") return (a.vehicule?.prix ?? 0) - (b.vehicule?.prix ?? 0)
        if (sortBy === "prix_desc") return (b.vehicule?.prix ?? 0) - (a.vehicule?.prix ?? 0)
        return 0
    })

    if (isLoading) return <FavoritesLoading />

    return (
        <div className="min-h-screen bg-zinc-50 pt-20 px-4 md:px-8 pb-16">

            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 mb-6">
                {favoris.length > 0 && (
                    <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
                        <SelectTrigger className="w-auto h-10 rounded-xl border-zinc-200 bg-white text-sm font-medium gap-2 cursor-pointer pr-4">
                            <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {Object.entries(SORT_LABELS).map(([k, label]) => (
                                <SelectItem key={k} value={k} className="text-sm cursor-pointer">{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* ── Grille / vide ────────────────────────────────────── */}
            {favoris.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-5 shadow-sm">
                        <Heart className="h-9 w-9 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-2">Aucun favori pour le moment</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mb-6">
                        Explorez notre catalogue et ajoutez des véhicules à vos favoris en cliquant sur le cœur.
                    </p>
                    <Link href="/vehicles">
                        <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer gap-2">
                            <Search className="h-4 w-4" />
                            Explorer les véhicules
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {sorted.map(f => {
                        const primaryPhoto = f.vehicule?.photos?.find(p => p.is_primary) ?? f.vehicule?.photos?.[0]
                        const imageUrl = primaryPhoto ? getPhotoUrl(primaryPhoto.path) : null
                        const isVerified = f.vehicule?.status_validation === "validee"
                        const isRemoving = removingId === f.vehicule_id

                        return (
                            <div key={f.id} className="rounded-2xl overflow-hidden bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">

                                {/* ── Image ── */}
                                <div className="relative h-44 bg-zinc-100 overflow-hidden">
                                    {imageUrl
                                        ? <Image src={imageUrl} alt={`${f.vehicule?.description?.marque} ${f.vehicule?.description?.modele}`} fill className="object-cover" unoptimized />
                                        : <div className="absolute inset-0 flex items-center justify-center"><Car className="h-10 w-10 text-zinc-300" /></div>
                                    }

                                    {/* ♡ bouton retirer favori */}
                                    <button
                                        onClick={() => handleRemoveFavori(f.vehicule_id)}
                                        disabled={isRemoving}
                                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                                        title="Retirer des favoris"
                                    >
                                        {isRemoving
                                            ? <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                                            : <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                                        }
                                    </button>

                                    {/* Badge VÉRIFIÉ */}
                                    {isVerified && (
                                        <div className="absolute bottom-3 left-3">
                                            <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm bg-green-500 text-white uppercase">
                                                Vérifié
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* ── Infos ── */}
                                <div className="p-4 space-y-3">
                                    {/* Nom + prix */}
                                    <div>
                                        <p className="font-bold text-zinc-900 truncate text-sm">
                                            {f.vehicule?.description?.marque} {f.vehicule?.description?.modele}
                                        </p>
                                        <p className="text-xl font-black text-move-gold leading-tight mt-0.5">
                                            {Number(f.vehicule?.prix ?? 0).toLocaleString("fr-FR")}
                                            <span className="text-sm font-semibold"> FCFA</span>
                                        </p>
                                    </div>

                                    {/* Année + km */}
                                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {f.vehicule?.description?.annee}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Gauge className="h-3 w-3" />
                                            {Number(f.vehicule?.description?.kilometrage ?? 0).toLocaleString("fr-FR")} km
                                        </span>
                                    </div>

                                    {/* Bouton */}
                                    <Link href={`/vehicles/${f.vehicule_id}`}>
                                        <Button className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold cursor-pointer h-10">
                                            Voir les détails
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default FavoritesPage
