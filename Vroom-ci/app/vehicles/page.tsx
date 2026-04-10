"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Car,
    Plus,
    Filter,
    Settings2,
    Tag,
    KeyRound,
    Search,
    CheckCircle2,
    PackageX,
    X,
    Fuel,
    Calendar,
    CircleDollarSign,
    SlidersHorizontal,
    Heart,
    ShoppingBag,
    Eye,
    LogIn,
    Building2,
    GitCompare,
    Sparkles,
} from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner";
import { vehicule, User, AllVehicules, VehiculeStats, Favori } from "@/src/types"
import { getVehicules } from "@/src/actions/vehicules.actions"
import { getFavoris, removeFavori, addFavori } from "@/src/actions/favoris.actions"
import { useUser } from "@/src/context/UserContext"
import { api } from "@/src/lib/api"
import VehicleDetails from "./VehicleDetails"
import { cn, getPhotoUrl } from "@/src/lib/utils"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"
import { useRouter } from "next/navigation"
interface Filters {
    search: string
    carburant: string
    statut: string
    prixMin: string
    prixMax: string
    anneeMin: string
    anneeMax: string
    marque: string
}

const CARBURANTS = ["Tous", "Essence", "Diesel", "Hybride", "Électrique"]
const STATUTS = ["Tous", "Disponible", "Réservé", "Vendu", "Loué"]

const VehiclesPage = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [showFilters, setShowFilters] = useState(false)
    const { user, loading: userLoading } = useUser();
    const [vehiculesList, setVehiculesList] = useState<vehicule[]>([])
    const [stats, setStats] = useState<VehiculeStats | null>(null)
    const [selectedVehicule, setSelectedVehicule] = useState<vehicule | null>(null)
    const [isFavori, setIsFavori] = useState<Set<string>>(new Set())
    const [favLoading, setFavLoading] = useState<string  |  null>(null)
    const [compareIds, setCompareIds] = useState<string[]>([])

    const router = useRouter();

    const navigate = () => {
        router.push('/vendeur/addVehicle')
    }
    /** Ajoute ou retire un véhicule de la sélection de comparaison (max 3). */
    const toggleCompare = (id: string) => {
        setCompareIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id)
            if (prev.length >= 3) { toast.info("Maximum 3 véhicules à comparer"); return prev }
            return [...prev, id]
        })
    }
    // Charge les véhicules au montage — accessible sans connexion
    useEffect(() => {
        setIsLoading(true)
        getVehicules()
            .then(res => {
                setVehiculesList(res?.data?.vehicules ?? [])
                setStats(res?.data?.statsVehicules ?? null)
            })
            .catch(() => toast.error("Erreur lors du chargement des véhicules"))
            .finally(() => setIsLoading(false))
    }, [])

    // Charge les favoris uniquement quand on sait que l'user est connecté
    useEffect(() => {
        if (userLoading || !user) return
        getFavoris()
            .then(res => setIsFavori(new Set((res?.data ?? []).map((f: Favori) => f.vehicule_id))))
            .catch(() => {/* silencieux si favoris indisponibles */})
    }, [user, userLoading])

    // Suggestions personnalisées — uniquement si connecté
    const [suggestions, setSuggestions] = useState<vehicule[]>([])
    const [suggestionsSource, setSuggestionsSource] = useState<"favoris" | "populaire" | null>(null)
    useEffect(() => {
        if (userLoading || !user) return
        api.get<{ data: vehicule[]; source: "favoris" | "populaire" }>("/vehicules/suggestions")
            .then(res => {
                setSuggestions(res.data?.data ?? [])
                setSuggestionsSource(res.data?.source ?? null)
            })
            .catch(() => {/* silencieux */})
    }, [user, userLoading])

    // Écoute le canal public "vehicules" pour afficher les nouveaux véhicules validés en temps réel
    // Canal public = pas besoin d'auth, même les visiteurs non connectés reçoivent l'event
    useEffect(() => {
        let channelRef: ReturnType<typeof import("laravel-echo").default.prototype.channel> | null = null

        async function connectEcho() {
            try {
                const { getEcho } = await import("@/src/lib/echo")
                const echo = await getEcho()
                // .channel() (sans "private") pour un canal public
                channelRef = echo
                    .channel("vehicules")
                    .listen(".vehicule.validated", (e: { vehicule: vehicule }) => {
                        // On ajoute le nouveau véhicule en tête de liste
                        setVehiculesList(prev => [e.vehicule, ...prev])
                        toast.success(`Nouveau véhicule disponible : ${e.vehicule.description?.marque ?? ""}`)
                    })
            } catch (err) {
                console.error("WebSocket vehicules :", err)
            }
        }

        connectEcho()

        // Cleanup : quitter le canal au démontage du composant
        return () => {
            import("@/src/lib/echo").then(({ getEcho }) =>
                getEcho().then(echo => echo.leave("vehicules")).catch(() => {})
            ).catch(() => {})
        }
    }, [])

    const toggleFavori = async (v: vehicule) => {
        if (!user) {
            toast.error("Connectez-vous pour ajouter aux favoris")
            return
        }
        setFavLoading(v.id)
        try {
            if (isFavori.has(v.id)) {
                await removeFavori(v.id)
                setIsFavori(prev => {
                    const next = new Set(prev)
                    next.delete(v.id)
                    return next
                })
                toast.success("Retiré des favoris")
            } else {
                await addFavori(v.id)
                setIsFavori(prev => new Set([...prev, v.id]))
                toast.success("Ajouté aux favoris")
            }
        } catch {
            toast.error("Erreur lors de la mise à jour des favoris")
        } finally {
            setFavLoading(null)
        }
    }
    const isVendeur = user?.role === "vendeur"

    const [filters, setFilters] = useState<Filters>({
        search: "",
        carburant: "Tous",
        statut: "Tous",
        prixMin: "",
        prixMax: "",
        anneeMin: "",
        anneeMax: "",
        marque: "Toutes",
    })

    /** Extrait les marques uniques depuis la liste chargée pour les chips de filtre. */
    const marquesDisponibles = useMemo(() => {
        const uniques = Array.from(
            new Set(vehiculesList.map(v => v.description?.marque).filter(Boolean))
        ).sort()
        return ["Toutes", ...uniques]
    }, [vehiculesList])

    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.search) count++
        if (filters.carburant !== "Tous") count++
        if (filters.statut !== "Tous") count++
        if (filters.prixMin) count++
        if (filters.prixMax) count++
        if (filters.anneeMin) count++
        if (filters.anneeMax) count++
        if (filters.marque !== "Toutes") count++
        return count
    }, [filters])

    const applyFilters = (list: vehicule[]): vehicule[] => {
        return list.filter(v => {
            if (filters.search) {
                const q = filters.search.toLowerCase()
                if (
                    !v.description.marque.toLowerCase().includes(q) &&
                    !v.description.modele.toLowerCase().includes(q)
                ) return false
            }
            if (filters.marque !== "Toutes" && v.description.marque !== filters.marque) return false
            if (filters.carburant !== "Tous" && v.description.carburant.toLowerCase() !== filters.carburant.toLowerCase()) return false
            if (filters.statut !== "Tous" && v.statut.toLowerCase() !== filters.statut.toLowerCase()) return false
            if (filters.prixMin && v.prix < Number(filters.prixMin)) return false
            if (filters.prixMax && v.prix > Number(filters.prixMax)) return false
            if (filters.anneeMin && v.description.annee < Number(filters.anneeMin)) return false
            if (filters.anneeMax && v.description.annee > Number(filters.anneeMax)) return false
            return true
        })
    }

    const getVehiclesFiltres = (type: string): vehicule[] => {
        let list = vehiculesList
        if (type === "vente") list = vehiculesList.filter(v => v.post_type === "vente")
        if (type === "location") list = vehiculesList.filter(v => v.post_type === "location")
        return applyFilters(list)
    }

    const resetFilters = () => {
        setFilters({
            search: "",
            carburant: "Tous",
            statut: "Tous",
            prixMin: "",
            prixMax: "",
            anneeMin: "",
            anneeMax: "",
            marque: "Toutes",
        })
        toast.success("Filtres réinitialisés")
    }

    const VehicleCard = ({ v }: { v: vehicule }) => {
        const primaryPhoto = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
        const imageUrl = primaryPhoto ? getPhotoUrl(primaryPhoto.path) : null
        return (
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <CardContent className="p-0">
                    <div className="h-40 bg-linear-to-br from-zinc-100 to-zinc-50 flex items-center justify-center relative overflow-hidden">
                        {imageUrl
                            ? <Image src={imageUrl} alt={`${v.description?.marque} ${v.description?.modele}`} fill className="object-cover" unoptimized />
                            : <Car className="h-12 w-12 text-zinc-300" />
                        }
                        <Badge className={`absolute top-3 left-3 rounded-full text-xs ${v.post_type === "vente"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            }`}>
                            {v.post_type === "vente" ? <Tag className="h-3 w-3 mr-1" /> : <KeyRound className="h-3 w-3 mr-1" />}
                            {v.post_type === "vente" ? "Vente" : "Location"}
                        </Badge>
                        <button
                            onClick={() => toggleFavori(v)}
                            disabled={favLoading === v.id}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors cursor-pointer"
                        >
                            <Heart className={cn("h-4 w-4 transition-colors", isFavori.has(v.id) ? "fill-red-500 text-red-500" : "text-zinc-500")} />
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        <div>
                            <h3 className="font-bold text-base text-zinc-900">{v.description?.marque} {v.description?.modele}</h3>
                            <p className="text-xs text-zinc-500">{v.description?.annee} &middot; {v.description?.kilometrage} km &middot; {v.description?.carburant}</p>
                            {v.creator && (
                                <Link
                                    href={`/profil/${v.creator.id}`}
                                    className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline transition-colors mt-0.5 inline-block"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {v.creator.fullname}
                                </Link>
                            )}
                        </div>
                        <p className="text-lg font-black text-zinc-900">{v.prix?.toLocaleString()} <span className="text-xs font-normal text-zinc-500">FCFA</span></p>
                        <Separator />
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {v.views_count} vues</span>
                            <div className="flex items-center gap-1.5">
                                {/* Lien vers la page détail partageable */}
                                <Link href={`/vehicles/${v.id}`}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg text-xs cursor-pointer border-zinc-200"
                                    >
                                        Voir détails
                                    </Button>
                                </Link>
                                {/* Conserve l'ouverture du Dialog pour accès rapide depuis le catalogue */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-lg text-xs cursor-pointer text-zinc-400 hover:text-zinc-700 px-2"
                                    onClick={() => setSelectedVehicule(v)}
                                    title="Aperçu rapide"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {/* Bouton d'ajout/retrait de la sélection de comparaison */}
                                <button
                                    onClick={() => toggleCompare(v.id)}
                                    title={compareIds.includes(v.id) ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer
                                        ${compareIds.includes(v.id)
                                            ? "bg-amber-500 text-white shadow-sm"
                                            : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                                        }`}
                                >
                                    <GitCompare className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (isLoading) {
        return (
            <div className="pt-20 px-4 md:px-6 space-y-4 md:space-y-6 max-w-6xl mx-auto mb-12">
                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden bg-white">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-4">
                                <Skeleton className="h-12 w-12 md:h-14 md:w-14 rounded-2xl" />
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-7 w-36 md:h-8 md:w-48" />
                                        <Skeleton className="h-6 w-12 rounded-full" />
                                    </div>
                                    <Skeleton className="h-3 w-48 md:h-4 md:w-64" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-28 md:w-40 rounded-xl" />
                                <Skeleton className="h-9 w-20 md:w-28 rounded-xl" />
                                <Skeleton className="h-9 w-9 rounded-xl" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Skeleton className="h-12 w-full rounded-2xl" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-12" />
                                        <Skeleton className="h-3 w-16 md:w-24" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden bg-white">
                    <div className="p-4 border-b border-zinc-200">
                        <div className="flex gap-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-10 w-24 md:w-32 rounded-lg" />
                            ))}
                        </div>
                    </div>
                    <div className="p-4 md:p-6">
                        <div className="flex flex-col items-center justify-center py-12 md:py-16">
                            <Skeleton className="h-16 w-16 rounded-full mb-4" />
                            <Skeleton className="h-5 w-56 mb-2" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <FadeIn>
        <div className="pt-20 px-4 md:px-6 space-y-4 md:space-y-6 max-w-6xl mx-auto mb-12">
            {/* Header */}
            <SlideIn direction="left">
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 bg-white">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                                <Car className="h-6 w-6 md:h-7 md:w-7 text-zinc-700" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <h1 className="text-xl md:text-3xl font-black tracking-tight text-zinc-900">
                                        {isVendeur ? "Mes Véhicules" : "Véhicules disponibles"}
                                    </h1>
                                    <Badge className="bg-zinc-900 text-white font-bold rounded-full">
                                        {vehiculesList.length}
                                    </Badge>
                                </div>
                                <p className="text-xs md:text-sm text-zinc-500 mt-1">
                                    {isVendeur
                                        ? "Gérez vos annonces de véhicules en vente et en location"
                                        : "Parcourez les véhicules disponibles à la vente et à la location"
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {isVendeur && (
                                <Button size="sm" className="rounded-xl cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => navigate()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Publier un véhicule</span>
                                    <span className="sm:hidden">Publier</span>
                                </Button>
                            )}
                            <Button
                                variant={showFilters ? "default" : "outline"}
                                size="sm"
                                className={`rounded-xl cursor-pointer ${showFilters ? "bg-zinc-900 hover:bg-zinc-800 text-white" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"}`}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                Filtrer
                                {activeFilterCount > 0 && (
                                    <Badge className="ml-1.5 bg-zinc-700 text-white rounded-full text-[10px] px-1.5 py-0">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl cursor-pointer border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </SlideIn>

            {/* Bannière non-connecté — visible uniquement pour les visiteurs anonymes */}
            {!user && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 animate-in fade-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-800 truncate">
                            Parcourez librement — Connectez-vous pour contacter les vendeurs et prendre rendez-vous.
                        </p>
                    </div>
                    <Link href="/auth" className="shrink-0">
                        <Button size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer gap-1.5">
                            <LogIn className="h-3.5 w-3.5" />
                            Se connecter
                        </Button>
                    </Link>
                </div>
            )}

            {/* Search Bar */}
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white animate-in fade-in slide-in-from-bottom duration-500">
                <CardContent className="p-3 md:p-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                        <Input
                            placeholder="Rechercher par marque ou modèle..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="pl-12 pr-10 h-11 md:h-12 rounded-xl md:rounded-2xl border-zinc-200 bg-zinc-50/50 text-sm md:text-base placeholder:text-zinc-400 focus-visible:ring-zinc-300 focus-visible:border-zinc-400"
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilters({ ...filters, search: "" })}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Filters Panel */}
            {showFilters && (
                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-top duration-300 bg-white">
                    <CardHeader className="p-4 md:pb-4 border-b border-zinc-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                                    <SlidersHorizontal className="h-5 w-5 text-zinc-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base md:text-lg font-bold text-zinc-900">Filtres avancés</CardTitle>
                                    <p className="text-xs md:text-sm text-zinc-500">
                                        Affinez votre recherche
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {activeFilterCount > 0 && (
                                    <Button variant="ghost" size="sm" className="rounded-xl cursor-pointer text-zinc-500 hidden sm:flex" onClick={resetFilters}>
                                        <X className="h-4 w-4 mr-1" />
                                        Réinitialiser
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="rounded-xl cursor-pointer" onClick={() => setShowFilters(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {/* Marque */}
                            <div className="space-y-3 sm:col-span-2 lg:col-span-4">
                                <label className="text-sm font-bold flex items-center gap-2 text-zinc-700">
                                    <Car className="h-4 w-4 text-zinc-500" />
                                    Marque
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {marquesDisponibles.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setFilters({ ...filters, marque: m })}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filters.marque === m
                                                ? "bg-zinc-900 text-white shadow-md"
                                                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Carburant */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2 text-zinc-700">
                                    <Fuel className="h-4 w-4 text-zinc-500" />
                                    Carburant
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {CARBURANTS.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setFilters({ ...filters, carburant: c })}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filters.carburant === c
                                                ? "bg-zinc-900 text-white shadow-md"
                                                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                                                }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Statut */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2 text-zinc-700">
                                    <CheckCircle2 className="h-4 w-4 text-zinc-500" />
                                    Statut
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {STATUTS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setFilters({ ...filters, statut: s })}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filters.statut === s
                                                ? "bg-zinc-900 text-white shadow-md"
                                                : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Prix */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2 text-zinc-700">
                                    <CircleDollarSign className="h-4 w-4 text-zinc-500" />
                                    Prix (FCFA)
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.prixMin}
                                        onChange={(e) => setFilters({ ...filters, prixMin: e.target.value })}
                                        className="rounded-xl h-9 bg-zinc-50 border-zinc-200"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.prixMax}
                                        onChange={(e) => setFilters({ ...filters, prixMax: e.target.value })}
                                        className="rounded-xl h-9 bg-zinc-50 border-zinc-200"
                                    />
                                </div>
                            </div>

                            {/* Année */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold flex items-center gap-2 text-zinc-700">
                                    <Calendar className="h-4 w-4 text-zinc-500" />
                                    Année
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="De"
                                        value={filters.anneeMin}
                                        onChange={(e) => setFilters({ ...filters, anneeMin: e.target.value })}
                                        className="rounded-xl h-9 bg-zinc-50 border-zinc-200"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="À"
                                        value={filters.anneeMax}
                                        onChange={(e) => setFilters({ ...filters, anneeMax: e.target.value })}
                                        className="rounded-xl h-9 bg-zinc-50 border-zinc-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Active filters summary + mobile reset */}
                        {activeFilterCount > 0 && (
                            <div className="mt-4 md:mt-6 pt-4 border-t border-zinc-200 flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-zinc-500">Filtres actifs :</span>
                                {filters.search && (
                                    <Badge variant="outline" className="rounded-full text-xs gap-1 bg-zinc-100 text-zinc-700 border-zinc-300">
                                        Recherche: {filters.search}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, search: "" })} />
                                    </Badge>
                                )}
                                {filters.marque !== "Toutes" && (
                                    <Badge variant="outline" className="rounded-full text-xs gap-1 bg-zinc-100 text-zinc-700 border-zinc-300">
                                        {filters.marque}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, marque: "Toutes" })} />
                                    </Badge>
                                )}
                                {filters.carburant !== "Tous" && (
                                    <Badge variant="outline" className="rounded-full text-xs gap-1 bg-zinc-100 text-zinc-700 border-zinc-300">
                                        {filters.carburant}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, carburant: "Tous" })} />
                                    </Badge>
                                )}
                                {filters.statut !== "Tous" && (
                                    <Badge variant="outline" className="rounded-full text-xs gap-1 bg-zinc-100 text-zinc-700 border-zinc-300">
                                        {filters.statut}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, statut: "Tous" })} />
                                    </Badge>
                                )}
                                {(filters.prixMin || filters.prixMax) && (
                                    <Badge variant="outline" className="rounded-full text-xs gap-1 bg-zinc-100 text-zinc-700 border-zinc-300">
                                        Prix: {filters.prixMin || "0"} - {filters.prixMax || "..."}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, prixMin: "", prixMax: "" })} />
                                    </Badge>
                                )}
                                {(filters.anneeMin || filters.anneeMax) && (
                                    <Badge variant="outline" className="rounded-full text-xs gap-1 bg-zinc-100 text-zinc-700 border-zinc-300">
                                        Année: {filters.anneeMin || "..."} - {filters.anneeMax || "..."}
                                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, anneeMin: "", anneeMax: "" })} />
                                    </Badge>
                                )}
                                <Button variant="ghost" size="sm" className="rounded-xl cursor-pointer text-zinc-500 sm:hidden ml-auto" onClick={resetFilters}>
                                    <X className="h-4 w-4 mr-1" />
                                    Réinitialiser
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all animate-in fade-in slide-in-from-left duration-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0">
                                <Car className="h-5 w-5 text-zinc-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{stats?.total_vehicules ?? 0}</p>
                                <p className="text-xs font-semibold text-zinc-500">
                                    {isVendeur ? "Publiés" : "Disponibles"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom duration-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                                <Tag className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{stats?.en_vente ?? 0}</p>
                                <p className="text-xs font-semibold text-zinc-500">En vente</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom duration-500">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                <KeyRound className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{stats?.en_location ?? 0}</p>
                                <p className="text-xs font-semibold text-zinc-500">En location</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Vehicles List with Tabs */}
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700 bg-white">
                <Tabs defaultValue="tous" className="w-full">
                    <div className="p-4 border-b border-zinc-200">
                        <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex">
                            <TabsTrigger
                                value="tous"
                                className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                            >
                                <Car className="h-4 w-4" />
                                <span className="hidden md:inline">Tous</span>
                                <Badge variant="secondary" className="rounded-full">
                                    {stats?.total_vehicules ?? 0}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="vente"
                                className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                            >
                                <Tag className="h-4 w-4" />
                                <span className="hidden md:inline">En vente</span>
                                <Badge variant="secondary" className="rounded-full">
                                    {stats?.en_vente ?? 0}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="location"
                                className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
                            >
                                <KeyRound className="h-4 w-4" />
                                <span className="hidden md:inline">En location</span>
                                <Badge variant="secondary" className="rounded-full">
                                    {stats?.en_location ?? 0}
                                </Badge>
                            </TabsTrigger>
                            {user && (
                                <TabsTrigger
                                    value="suggestions"
                                    className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span className="hidden md:inline">Pour vous</span>
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    <TabsContent value="tous" className="p-4 md:p-6">
                        {getVehiclesFiltres("tous").length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4 md:mb-6">
                                    <PackageX className="h-8 w-8 md:h-10 md:w-10 text-zinc-300" />
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-2">
                                    {isVendeur ? "Aucun véhicule publié" : "Aucun véhicule disponible"}
                                </h3>
                                <p className="text-sm text-zinc-500 max-w-sm mb-6 px-4">
                                    {isVendeur
                                        ? "Vous n'avez pas encore publié de véhicule. Commencez par ajouter votre premier véhicule."
                                        : "Aucun véhicule n'est disponible pour le moment. Revenez plus tard."
                                    }
                                </p>
                                {isVendeur ? (
                                    <Button className="rounded-xl cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white" onClick={() => navigate()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Publier mon premier véhicule
                                    </Button>
                                ) : (
                                    <Button className="rounded-xl cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white">
                                        <ShoppingBag className="h-4 w-4 mr-2" />
                                        Explorer les catégories
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {getVehiclesFiltres("tous").map(v => (
                                    <StaggerItem key={v.id}>
                                        <VehicleCard v={v} />
                                    </StaggerItem>
                                ))}
                            </StaggerList>
                        )}
                    </TabsContent>

                    <TabsContent value="vente" className="p-4 md:p-6">
                        {getVehiclesFiltres("vente").length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-50 flex items-center justify-center mb-4 md:mb-6">
                                    <Tag className="h-8 w-8 md:h-10 md:w-10 text-green-300" />
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-2">
                                    {isVendeur ? "Aucun véhicule en vente" : "Aucun véhicule en vente disponible"}
                                </h3>
                                <p className="text-sm text-zinc-500 max-w-sm mb-6 px-4">
                                    {isVendeur
                                        ? "Publiez un véhicule en vente pour le rendre visible aux acheteurs."
                                        : "Aucun véhicule n'est actuellement proposé à la vente."
                                    }
                                </p>
                                {isVendeur && (
                                    <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Mettre un véhicule en vente
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {getVehiclesFiltres("vente").map(v => (
                                    <StaggerItem key={v.id}>
                                        <VehicleCard v={v} />
                                    </StaggerItem>
                                ))}
                            </StaggerList>
                        )}
                    </TabsContent>

                    <TabsContent value="location" className="p-4 md:p-6">
                        {getVehiclesFiltres("location").length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4 md:mb-6">
                                    <KeyRound className="h-8 w-8 md:h-10 md:w-10 text-blue-300" />
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-zinc-900 mb-2">
                                    {isVendeur ? "Aucun véhicule en location" : "Aucun véhicule en location disponible"}
                                </h3>
                                <p className="text-sm text-zinc-500 max-w-sm mb-6 px-4">
                                    {isVendeur
                                        ? "Proposez un véhicule en location pour le rendre disponible."
                                        : "Aucun véhicule n'est actuellement proposé à la location."
                                    }
                                </p>
                                {isVendeur && (
                                    <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Mettre un véhicule en location
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {getVehiclesFiltres("location").map(v => (
                                    <StaggerItem key={v.id}>
                                        <VehicleCard v={v} />
                                    </StaggerItem>
                                ))}
                            </StaggerList>
                        )}
                    </TabsContent>

                    {/* ── Suggestions personnalisées ── */}
                    {user && (
                        <TabsContent value="suggestions" className="p-4 md:p-6">
                            {/* Badge source */}
                            {suggestionsSource && (
                                <div className="flex items-center gap-2 mb-4">
                                    <Badge className={`rounded-full font-semibold ${
                                        suggestionsSource === "favoris"
                                            ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                                            : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                    }`}>
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        {suggestionsSource === "favoris" ? "Basées sur vos favoris" : "Véhicules populaires"}
                                    </Badge>
                                </div>
                            )}
                            {suggestions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                                        <Sparkles className="h-8 w-8 text-purple-300" />
                                    </div>
                                    <h3 className="text-base font-bold text-zinc-900 mb-2">Aucune suggestion</h3>
                                    <p className="text-sm text-zinc-500 max-w-sm">
                                        Ajoutez des véhicules à vos favoris pour recevoir des suggestions personnalisées.
                                    </p>
                                </div>
                            ) : (
                                <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {suggestions.map(v => (
                                        <StaggerItem key={v.id}>
                                            <VehicleCard v={v} />
                                        </StaggerItem>
                                    ))}
                                </StaggerList>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </Card>

            {/* Quick Tips Card - vendeur only */}
            {isVendeur ? (
                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700 bg-white">
                    <CardHeader className="p-4 md:p-6 border-b border-zinc-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                                    <Search className="h-5 w-5 text-zinc-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base md:text-lg font-bold text-zinc-900">
                                        Conseils pour vendre
                                    </CardTitle>
                                    <p className="text-xs md:text-sm text-zinc-500">
                                        Optimisez vos annonces
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                                <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-sm font-black text-zinc-700">1</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-zinc-900">Photos de qualité</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Ajoutez plusieurs photos claires de votre véhicule
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                                <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-sm font-black text-zinc-700">2</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-zinc-900">Description détaillée</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Décrivez l&apos;état, le kilométrage et les options
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                                <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-sm font-black text-zinc-700">3</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-zinc-900">Prix compétitif</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Fixez un prix juste par rapport au marché
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {selectedVehicule && (
                <VehicleDetails
                    isOpen={!!selectedVehicule}
                    vehicule={selectedVehicule}
                    onClose={() => setSelectedVehicule(null)}
                />
            )}

            {/* ── Barre de comparaison flottante ── */}
            {compareIds.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 shadow-2xl shadow-black/10 px-4 py-3">
                    <div className="max-w-6xl mx-auto flex items-center gap-3">
                        {/* Miniatures des véhicules sélectionnés */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-zinc-500 shrink-0">Comparer :</span>
                            <div className="flex items-center gap-2">
                                {compareIds.map(id => {
                                    const v = vehiculesList.find(x => x.id === id)
                                    if (!v) return null
                                    return (
                                        <div key={id} className="flex items-center gap-1.5 bg-zinc-100 rounded-lg px-2.5 py-1.5">
                                            <span className="text-xs font-semibold text-zinc-800 truncate max-w-[100px]">
                                                {v.description?.marque} {v.description?.modele}
                                            </span>
                                            <button onClick={() => toggleCompare(id)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )
                                })}
                                {/* Slots vides si moins de 3 */}
                                {Array.from({ length: 3 - compareIds.length }).map((_, i) => (
                                    <div key={i} className="w-24 h-7 rounded-lg border-2 border-dashed border-zinc-200 flex items-center justify-center">
                                        <span className="text-[10px] text-zinc-300">+ véhicule</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setCompareIds([])} className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer">
                                Effacer
                            </button>
                            <Link href={`/vehicles/comparer?ids=${compareIds.join(",")}`}>
                                <Button
                                    size="sm"
                                    disabled={compareIds.length < 2}
                                    className="bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl cursor-pointer gap-1.5 text-xs"
                                >
                                    <GitCompare className="h-3.5 w-3.5" />
                                    Comparer ({compareIds.length})
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </FadeIn>
    )
}

export default VehiclesPage
