"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Heart,
    Car,
    Search,
    Tag,
    KeyRound,
    Eye,
    Bell,
    BellOff,
    Trash2,
    Loader2,
    RefreshCw,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Favori, Alerte } from "@/src/types"
import { getFavoris, removeFavori } from "@/src/actions/favoris.actions"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { Switch } from "@/components/ui/switch"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

const FavoritesPage = () => {
    const [favoris, setFavoris] = useState<Favori[]>([])
    const [alertes, setAlertes] = useState<Alerte[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            // Charge favoris et alertes en parallèle
            const [favorisRes] = await Promise.all([
                getFavoris(),
            ])
            setFavoris(favorisRes.data ?? [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur serveur")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchData()
        setRefreshing(false)
    }

    // Recharge quand l'utilisateur revient sur l'onglet
    useRevalidateOnFocus(fetchData)
    // Recharge en temps réel via Reverb quand un véhicule favori change
    useDataRefresh("vehicule", fetchData)

    const handleRemoveFavori = async (vehiculeId: string) => {
        setRemovingId(vehiculeId)
        try {
            await removeFavori(vehiculeId)
            setFavoris(favoris.filter(f => f.vehicule_id !== vehiculeId))
            toast.success("Véhicule retiré des favoris")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur serveur")
        } finally {
            setRemovingId(null)
        }
    }
    const FavoriCard = ({ f }: { f: Favori }) => (
        <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <CardContent className="p-0">
                {/* Photo — h-48 pour plus de respiration */}
                <div className="h-48 bg-linear-to-br from-zinc-100 to-zinc-50 flex items-center justify-center relative overflow-hidden">
                    {(() => {
                        const primaryPhoto = f.vehicule?.photos?.find(p => p.is_primary) ?? f.vehicule?.photos?.[0]
                        const imageUrl = primaryPhoto
                            ? (primaryPhoto.path.startsWith('http') ? primaryPhoto.path : `${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${primaryPhoto.path}`)
                            : null
                        return imageUrl
                            ? <img src={imageUrl} alt="photo véhicule" className="absolute inset-0 w-full h-full object-cover" />
                            : <Car className="h-12 w-12 text-zinc-300" />
                    })()}
                    <Badge className={`absolute top-3 left-3 rounded-full text-xs ${f.vehicule?.post_type === "vente"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        }`}>
                        {f.vehicule?.post_type === "vente" ? <Tag className="h-3 w-3 mr-1" /> : <KeyRound className="h-3 w-3 mr-1" />}
                        {f.vehicule?.post_type === "vente" ? "Vente" : "Location"}
                    </Badge>
                    <button
                        onClick={() => handleRemoveFavori(f.vehicule_id)}
                        disabled={removingId === f.vehicule_id}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {removingId === f.vehicule_id
                            ? <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                            : <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        }
                    </button>
                </div>
                {/* Infos — sans Separator pour garder l'espace aéré */}
                <div className="p-4">
                    <div className="mb-3">
                        <h3 className="font-bold text-base text-zinc-900">{f.vehicule?.description?.marque} {f.vehicule?.description?.modele}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{f.vehicule?.description?.annee} &middot; {f.vehicule?.description?.kilometrage} km &middot; {f.vehicule?.description?.carburant}</p>
                    </div>
                    <p className="text-lg font-black text-zinc-900 mb-3">{Number(f.vehicule?.prix).toLocaleString()} <span className="text-xs font-normal text-zinc-500">FCFA</span></p>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {f.vehicule?.views_count} vues</span>
                        <Button variant="outline" size="sm" className="rounded-lg text-xs cursor-pointer border-zinc-200">
                            Voir détails
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    // ── Skeleton de chargement ──
    if (isLoading) {
        return (
            <div className="pt-20 px-4 md:px-6 max-w-5xl mx-auto mb-16 space-y-8">
                {/* Header skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                {/* Cards skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-2xl border border-zinc-200 overflow-hidden bg-white">
                            <Skeleton className="h-48 w-full rounded-none" />
                            <div className="p-4 space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-6 w-1/3 mt-1" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <FadeIn>
        <div className="pt-20 px-4 md:px-6 max-w-5xl mx-auto mb-16 space-y-8">

            {/* ── Header ── */}
            <SlideIn direction="left">
            <section className="space-y-1">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Mes Favoris</h1>
                        <Badge className="bg-zinc-900 text-white font-bold rounded-full mt-0.5">
                            {favoris.length}
                        </Badge>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50 shrink-0"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                        Actualiser
                    </Button>
                </div>
                {/* Stats inline — pas de cards séparées */}
                <div className="flex items-center gap-3 text-sm text-zinc-500 flex-wrap">
                    <span>{favoris.length} au total</span>
                    <span className="text-zinc-300">·</span>
                    <span className="flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5 text-green-500" />
                        {favoris.filter(f => f.vehicule?.post_type === "vente").length} en vente
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span className="flex items-center gap-1">
                        <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                        {favoris.filter(f => f.vehicule?.post_type === "location").length} en location
                    </span>
                </div>
                <p className="text-sm text-zinc-400 pt-0.5">
                    Retrouvez tous les véhicules que vous avez sauvegardés
                </p>
            </section>
            </SlideIn>

            {/* ── Favoris ── */}
            <section>
                {favoris.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4">
                            <Heart className="h-8 w-8 text-zinc-300" />
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 mb-1.5">Aucun favori pour le moment</h3>
                        <p className="text-sm text-zinc-500 max-w-sm mb-5">
                            Explorez notre catalogue et ajoutez des véhicules à vos favoris en cliquant sur le coeur
                        </p>
                        <Button className="rounded-lg cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white">
                            <Search className="h-4 w-4 mr-2" />
                            Explorer les véhicules
                        </Button>
                    </div>
                ) : (
                    <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {favoris.map(f => (
                            <StaggerItem key={f.id}>
                                <FavoriCard f={f} />
                            </StaggerItem>
                        ))}
                    </StaggerList>
                )}
            </section>
        </div>
        </FadeIn>
    )
}

export default FavoritesPage
