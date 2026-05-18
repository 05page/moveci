"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Heart,
    Car,
    Search,
    Star,
    Tag,
    KeyRound,
    Eye,
    Bell,
    BellOff,
    Trash2,
    Loader2,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Favori, Alerte } from "@/src/types"
import { getFavoris, removeFavori } from "@/src/actions/favoris.actions"
import { getAlertes, deleteAlerte, updateAlerte } from "@/src/actions/alertes.actions"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { Switch } from "@/components/ui/switch"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

const FavoritesPage = () => {
    const [favoris, setFavoris] = useState<Favori[]>([])
    const [alertes, setAlertes] = useState<Alerte[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            // Charge favoris et alertes en parallèle
            const [favorisRes, alertesRes] = await Promise.all([
                getFavoris(),
                getAlertes(),
            ])
            setFavoris(favorisRes.data ?? [])
            setAlertes(alertesRes.data ?? [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur serveur")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

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

    // Supprime une alerte et met à jour la liste locale
    const handleDeleteAlerte = async (id: string) => {
        setDeletingId(id)
        try {
            await deleteAlerte(id)
            setAlertes(prev => prev.filter(a => a.id !== id))
            toast.success("Alerte supprimée")
        } catch {
            toast.error("Impossible de supprimer l'alerte")
        } finally {
            setDeletingId(null)
        }
    }

    // Active ou désactive une alerte via PUT /alertes/{id}
    const handleToggleAlerte = async (alerte: Alerte) => {
        setTogglingId(alerte.id)
        try {
            await updateAlerte(alerte.id, { active: !alerte.active })
            setAlertes(prev =>
                prev.map(a => a.id === alerte.id ? { ...a, active: !a.active } : a)
            )
        } catch {
            toast.error("Impossible de modifier l'alerte")
        } finally {
            setTogglingId(null)
        }
    }

    const getFavorisFiltres = (type: string): Favori[] => {
        if (type === "tous") return favoris
        return favoris.filter(f => f.vehicule?.post_type === type)
    }

    const AlereteCard = ({ a }: { a: Alerte }) => (
        <Card className="rounded-2xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.active ? "bg-amber-50" : "bg-zinc-100"}`}>
                            {a.active
                                ? <Bell className="h-5 w-5 text-amber-500" />
                                : <BellOff className="h-5 w-5 text-zinc-400" />
                            }
                        </div>
                        <div>
                            <p className="font-bold text-sm text-zinc-900">
                                {[a.marque_cible, a.modele_cible].filter(Boolean).join(" ") || "Tous véhicules"}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {a.prix_max ? `Max ${Number(a.prix_max).toLocaleString()} FCFA` : "Tout prix"}
                                {a.carburant ? ` · ${a.carburant}` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Toggle actif/inactif */}
                        <Switch
                            checked={a.active}
                            onCheckedChange={() => handleToggleAlerte(a)}
                            disabled={togglingId === a.id}
                        />
                        <button
                            onClick={() => handleDeleteAlerte(a.id)}
                            disabled={deletingId === a.id}
                            className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deletingId === a.id
                                ? <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                                : <Trash2 className="h-4 w-4 text-red-500" />
                            }
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )

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
                <div className="flex items-start gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Mes Favoris</h1>
                    <Badge className="bg-zinc-900 text-white font-bold rounded-full mt-0.5">
                        {favoris.length}
                    </Badge>
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

            {/* ── Tabs Favoris + Alertes ── */}
            <Tabs defaultValue="tous" className="w-full">
                {/* TabsList style underline — pas de Card wrapper */}
                <TabsList className="bg-transparent border-b border-zinc-200 rounded-none h-auto p-0 gap-0 justify-start w-full">
                    <TabsTrigger
                        value="tous"
                        className="gap-2 rounded-none px-4 py-2.5 text-sm font-medium text-zinc-500 border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        <Heart className="h-4 w-4" />
                        <span className="hidden sm:inline">Tous</span>
                        <Badge variant="secondary" className="rounded-full text-xs">{favoris.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="vente"
                        className="gap-2 rounded-none px-4 py-2.5 text-sm font-medium text-zinc-500 border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        <Tag className="h-4 w-4" />
                        <span className="hidden sm:inline">En vente</span>
                        <Badge variant="secondary" className="rounded-full text-xs">{favoris.filter(f => f.vehicule?.post_type === "vente").length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="location"
                        className="gap-2 rounded-none px-4 py-2.5 text-sm font-medium text-zinc-500 border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        <KeyRound className="h-4 w-4" />
                        <span className="hidden sm:inline">En location</span>
                        <Badge variant="secondary" className="rounded-full text-xs">{favoris.filter(f => f.vehicule?.post_type === "location").length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="alertes"
                        className="gap-2 rounded-none px-4 py-2.5 text-sm font-medium text-zinc-500 border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:text-amber-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        <Bell className="h-4 w-4" />
                        <span className="hidden sm:inline">Alertes</span>
                        <Badge variant="secondary" className="rounded-full text-xs">{alertes.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                {["tous", "vente", "location"].map(tab => (
                    <TabsContent key={tab} value={tab} className="mt-6">
                        {getFavorisFiltres(tab).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4">
                                    <Heart className="h-8 w-8 text-zinc-300" />
                                </div>
                                <h3 className="text-base font-bold text-zinc-900 mb-1.5">
                                    {tab === "tous" ? "Aucun favori pour le moment" : `Aucun favori en ${tab}`}
                                </h3>
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
                                {getFavorisFiltres(tab).map(f => (
                                    <StaggerItem key={f.id}>
                                        <FavoriCard f={f} />
                                    </StaggerItem>
                                ))}
                            </StaggerList>
                        )}
                    </TabsContent>
                ))}

                {/* Tab alertes prix */}
                <TabsContent value="alertes" className="mt-6">
                    {alertes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4">
                                <Bell className="h-8 w-8 text-zinc-300" />
                            </div>
                            <h3 className="text-base font-bold text-zinc-900 mb-1.5">Aucune alerte prix</h3>
                            <p className="text-sm text-zinc-500 max-w-sm">
                                Créez des alertes depuis la fiche d'un véhicule pour être notifié quand un bien correspond à vos critères.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alertes.map(a => <AlereteCard key={a.id} a={a} />)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ── Suggestions — Card conservée, styling allégé ── */}
            <Card className="rounded-2xl border border-zinc-200 bg-white">
                <CardHeader className="border-b border-zinc-100 pb-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                <Star className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold text-zinc-900">
                                    Suggestions pour vous
                                </CardTitle>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Basées sur vos favoris et vos recherches
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-lg cursor-pointer text-xs text-zinc-500">
                            Voir tout
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3">
                            <Star className="h-7 w-7 text-zinc-300" />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-900 mb-1">Pas encore de suggestions</h3>
                        <p className="text-xs text-zinc-500 max-w-xs">
                            Ajoutez des véhicules à vos favoris pour recevoir des suggestions personnalisées
                        </p>
                    </div>
                </CardContent>
            </Card>

        </div>
        </FadeIn>
    )
}

export default FavoritesPage
