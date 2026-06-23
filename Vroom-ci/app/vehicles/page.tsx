"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Car, Search, PackageX, X, Fuel, Eye,
    Heart, GitCompare, LogIn, Building2, MapPin,
    LayoutGrid, List, ChevronLeft, ChevronRight,
    SlidersHorizontal, RefreshCw,
} from "lucide-react"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { vehicule, Favori } from "@/src/types"
import { getVehicules } from "@/src/actions/vehicules.actions"
import { getFavoris, removeFavori, addFavori } from "@/src/actions/favoris.actions"
import { useUser } from "@/src/context/UserContext"
import { cn, getPhotoUrl } from "@/src/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────

interface Filters {
    search: string
    marque: string
    prixMin: string
    prixMax: string
    anneeMin: string
    carburant: string[]
    transmission: string
    localisation: string
}

type PostTypeFilter = "tous" | "vente" | "location"
type ViewMode = "grid" | "list"

// ─── Constantes ─────────────────────────────────────────────────────────────

const CARBURANTS = ["Électrique", "Hybride", "Essence", "Diesel"]
const ANNEES_PILLS = ["2018+", "2020+", "2022+", "2024+"]
const TRANSMISSIONS = ["Automatique", "Manuelle"]
const PER_PAGE = 9


const EMPTY_FILTERS: Filters = {
    search: "",
    marque: "Toutes",
    prixMin: "",
    prixMax: "",
    anneeMin: "",
    carburant: [],
    transmission: "",
    localisation: "",
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="flex min-h-screen pt-16 bg-zinc-50">
            <aside className="hidden lg:block w-64 shrink-0 border-r border-zinc-200 bg-white p-6 space-y-5">
                <Skeleton className="h-6 w-24" />
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </aside>
            <main className="flex-1 p-6 space-y-5">
                <Skeleton className="h-11 w-full rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="rounded-2xl border border-zinc-200 overflow-hidden bg-white">
                            <Skeleton className="h-44 w-full rounded-none" />
                            <div className="p-4 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-6 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}

// ─── Page principale ─────────────────────────────────────────────────────────

const VehiclesPage = () => {
    const { user, loading: userLoading } = useUser()
    const [isLoading, setIsLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [vehiculesList, setVehiculesList] = useState<vehicule[]>([])
    const [isFavori, setIsFavori] = useState<Set<string>>(new Set())
    const [favLoading, setFavLoading] = useState<string | null>(null)
    const [compareIds, setCompareIds] = useState<string[]>([])
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
    const [postType, setPostType] = useState<PostTypeFilter>("tous")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [page, setPage] = useState(1)
    const [sidebarOpen, setSidebarOpen] = useState(true)

    // ── Fetch données ───────────────────────────────────────────────────────

    const fetchVehicules = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true)
        else setRefreshing(true)
        try {
            const res = await getVehicules()
            setVehiculesList(res?.data?.vehicules ?? [])
        } catch {
            toast.error("Erreur lors du chargement des véhicules")
        } finally {
            setIsLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchVehicules() }, [fetchVehicules])

    useEffect(() => {
        if (userLoading || !user) return
        getFavoris()
            .then(res => setIsFavori(new Set((res?.data ?? []).map((f: Favori) => f.vehicule_id))))
            .catch(() => { })
    }, [user, userLoading])

    // WebSocket — nouveaux véhicules validés en temps réel
    useEffect(() => {
        async function connectEcho() {
            try {
                const { getEcho } = await import("@/src/lib/echo")
                const echo = await getEcho()
                echo.channel("vehicules").listen(".vehicule.validated", (e: { vehicule: vehicule }) => {
                    setVehiculesList(prev => [e.vehicule, ...prev])
                    toast.success(`Nouveau véhicule disponible : ${e.vehicule.description?.marque ?? ""}`)
                })
            } catch (err) {
                console.error("WebSocket vehicules :", err)
            }
        }
        connectEcho()
        return () => {
            import("@/src/lib/echo").then(({ getEcho }) =>
                getEcho().then(echo => echo.leave("vehicules")).catch(() => { })
            ).catch(() => { })
        }
    }, [])

    // ── Favoris ─────────────────────────────────────────────────────────────

    const toggleFavori = async (v: vehicule) => {
        if (!user) { toast.error("Connectez-vous pour ajouter aux favoris"); return }
        setFavLoading(v.id)
        try {
            if (isFavori.has(v.id)) {
                await removeFavori(v.id)
                setIsFavori(prev => { const n = new Set(prev); n.delete(v.id); return n })
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

    // ── Comparaison ──────────────────────────────────────────────────────────

    const toggleCompare = (id: string) => {
        setCompareIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id)
            if (prev.length >= 3) { toast.info("Maximum 3 véhicules à comparer"); return prev }
            return [...prev, id]
        })
    }

    // ── Filtres + tri ────────────────────────────────────────────────────────

    const marquesDisponibles = useMemo(() => {
        const uniques = Array.from(new Set(vehiculesList.map(v => v.description?.marque).filter(Boolean))).sort()
        return ["Toutes", ...uniques]
    }, [vehiculesList])

    const filteredAndSorted = useMemo(() => {
        let list = vehiculesList.filter(v => {
            if (postType !== "tous" && v.post_type !== postType) return false
            if (filters.search) {
                const q = filters.search.toLowerCase()
                if (!v.description?.marque?.toLowerCase().includes(q) && !v.description?.modele?.toLowerCase().includes(q)) return false
            }
            if (filters.marque !== "Toutes" && v.description?.marque !== filters.marque) return false
            if (filters.carburant.length > 0 && !filters.carburant.includes(v.description?.carburant)) return false
            if (filters.transmission && v.description?.transmission?.toLowerCase() !== filters.transmission.toLowerCase()) return false
            if (filters.prixMin && v.prix < Number(filters.prixMin)) return false
            if (filters.prixMax && v.prix > Number(filters.prixMax)) return false
            if (filters.anneeMin) {
                const minYear = Number(filters.anneeMin.replace("+", ""))
                if (v.description?.annee < minYear) return false
            }
            return true
        })

        return list
    }, [vehiculesList, filters, postType])

    const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PER_PAGE))
    const paginated = filteredAndSorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    const resetFilters = () => { setFilters(EMPTY_FILTERS); setPage(1) }
    const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: val }))
        setPage(1)
    }

    const activeFilterCount = useMemo(() => {
        let n = 0
        if (filters.search) n++
        if (filters.marque !== "Toutes") n++
        if (filters.carburant.length > 0) n++
        if (filters.transmission) n++
        if (filters.prixMin) n++
        if (filters.prixMax) n++
        if (filters.anneeMin) n++
        if (filters.localisation) n++
        return n
    }, [filters])

    // ── Carte véhicule ───────────────────────────────────────────────────────

    const VehicleCard = ({ v }: { v: vehicule }) => {
        const primaryPhoto = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
        const imageUrl = primaryPhoto ? getPhotoUrl(primaryPhoto.path) : null
        const isPremium = v.creator?.role === "concessionnaire" || v.creator?.role === "auto_ecole"

        return (
            <Card className={cn(
                "rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5",
                viewMode === "list" && "flex flex-row"
            )}>
                <CardContent className={cn("p-0 flex flex-col", viewMode === "list" && "flex-row w-full")}>

                    {/* ── Image ── */}
                    <div className={cn(
                        "relative bg-zinc-100 overflow-hidden shrink-0",
                        viewMode === "grid" ? "h-44 w-full" : "h-36 w-52"
                    )}>
                        {imageUrl
                            ? <Image src={imageUrl} alt={`${v.description?.marque} ${v.description?.modele}`} fill className="object-cover" unoptimized />
                            : <div className="w-full h-full flex items-center justify-center"><Car className="h-12 w-12 text-zinc-300" /></div>
                        }

                        {/* Vues top-left */}
                        {Number(v.views_count ?? 0) > 0 && (
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                                <Eye className="h-3 w-3 text-white" />
                                <span className="text-[11px] text-white font-medium">{v.views_count}</span>
                            </div>
                        )}

                        {/* ♡ heart top-right */}
                        <button
                            onClick={() => toggleFavori(v)}
                            disabled={favLoading === v.id}
                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors cursor-pointer"
                        >
                            <Heart className={cn("h-4 w-4 transition-colors", isFavori.has(v.id) ? "fill-red-500 text-red-500" : "text-zinc-500")} />
                        </button>

                        {/* Badge PREMIUM / DISPONIBLE bottom-left */}
                        {(isPremium || v.statut === "disponible") && (
                            <div className="absolute bottom-2.5 left-2.5">
                                {isPremium
                                    ? <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm bg-move-gold text-white uppercase">Premium</span>
                                    : <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-sm bg-green-500 text-white uppercase">Disponible</span>
                                }
                            </div>
                        )}
                    </div>

                    {/* ── Infos ── */}
                    <div className="p-4 flex flex-col flex-1 min-w-0">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">
                            {v.description?.marque} {v.description?.modele}
                        </h1>
                        {/* Prix */}
                        <p className="text-xl font-black text-move-gold mb-2">
                            {v.prix?.toLocaleString("fr-FR")}
                            <span className="text-xs font-normal text-zinc-400 ml-1">FCFA</span>
                        </p>

                        {/* Specs */}
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-1.5">
                            <span className="flex items-center gap-1">
                                <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[8px]">⊙</span>
                                {Number(v.description?.kilometrage ?? 0).toLocaleString("fr-FR")} km
                            </span>
                            <span className="flex items-center gap-1">
                                <Fuel className="h-3 w-3" />
                                {v.description?.carburant}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-3">{v.description?.annee}</p>

                        <Separator className="mb-3" />

                        {/* Vendeur */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-zinc-600">
                                {v.creator?.fullname?.charAt(0).toUpperCase() ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-zinc-800 truncate">{v.creator?.fullname ?? "Vendeur"}</p>
                            </div>
                            {v.creator?.adresse && (
                                <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full shrink-0">
                                    {v.creator.adresse}
                                </span>
                            )}
                        </div>

                        {/* Actions rapides */}
                        <div className="flex items-center gap-1.5 mt-3">
                            <Link href={`/vehicles/${v.id}`} className="flex-1">
                                <Button size="sm" className="w-full rounded-lg text-xs bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                                    Voir détails
                                </Button>
                            </Link>
                            <button
                                onClick={() => toggleCompare(v.id)}
                                title={compareIds.includes(v.id) ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
                                className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors",
                                    compareIds.includes(v.id) ? "bg-move-gold text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-500"
                                )}
                            >
                                <GitCompare className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // ── Pagination ───────────────────────────────────────────────────────────

    const Pagination = () => {
        const pages: (number | "…")[] = []
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            if (page > 3) pages.push("…")
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
            if (page < totalPages - 2) pages.push("…")
            pages.push(totalPages)
        }

        return (
            <div className="flex items-center justify-center gap-1.5 mt-8">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-zinc-400">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => setPage(p as number)}
                            className={cn(
                                "w-9 h-9 rounded-lg text-sm font-semibold transition-colors cursor-pointer",
                                page === p
                                    ? "bg-move-gold text-white shadow-sm"
                                    : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                            )}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        )
    }

    // ── Loading ──────────────────────────────────────────────────────────────

    if (isLoading) return <PageSkeleton />

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-screen pt-16 bg-zinc-50">

            {/* ══════════════ SIDEBAR FILTRES ══════════════ */}
            <aside className={cn(
                "flex-col w-64 shrink-0 border-r border-zinc-200 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-300",
                sidebarOpen ? "hidden lg:flex" : "hidden"
            )}>
                <div className="p-5 space-y-6 flex-1">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-zinc-900">Filtres</h2>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={resetFilters}
                                className="text-xs font-semibold text-move-gold hover:underline cursor-pointer"
                            >
                                Réinitialiser
                            </button>
                        )}
                    </div>

                    {/* Marque */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Marque</label>
                        <Select value={filters.marque} onValueChange={v => setFilter("marque", v)}>
                            <SelectTrigger className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm cursor-pointer">
                                <SelectValue placeholder="Toutes les marques" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {marquesDisponibles.map(m => (
                                    <SelectItem key={m} value={m} className="text-sm cursor-pointer">
                                        {m === "Toutes" ? "Toutes les marques" : m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Prix */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Gamme de prix (FCFA)</label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Min"
                                value={filters.prixMin}
                                onChange={e => setFilter("prixMin", e.target.value)}
                                className="h-9 rounded-xl border-zinc-200 bg-zinc-50 text-sm text-center"
                            />
                            <span className="text-zinc-400 shrink-0">—</span>
                            <Input
                                type="number"
                                placeholder="Max"
                                value={filters.prixMax}
                                onChange={e => setFilter("prixMax", e.target.value)}
                                className="h-9 rounded-xl border-zinc-200 bg-zinc-50 text-sm text-center"
                            />
                        </div>
                    </div>

                    {/* Année minimum */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Année minimum</label>
                        <div className="flex flex-wrap gap-1.5">
                            {ANNEES_PILLS.map(a => (
                                <button
                                    key={a}
                                    onClick={() => setFilter("anneeMin", filters.anneeMin === a ? "" : a)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                                        filters.anneeMin === a
                                            ? "bg-move-gold text-white shadow-sm"
                                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                    )}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Énergie */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Énergie</label>
                        <div className="space-y-2">
                            {CARBURANTS.map(c => (
                                <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
                                    <Checkbox
                                        checked={filters.carburant.includes(c)}
                                        onCheckedChange={checked => {
                                            setFilter("carburant", checked
                                                ? [...filters.carburant, c]
                                                : filters.carburant.filter(x => x !== c)
                                            )
                                        }}
                                        className="rounded data-[state=checked]:bg-move-gold data-[state=checked]:border-move-gold"
                                    />
                                    <span className="text-sm text-zinc-700 group-hover:text-zinc-900">{c}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Transmission */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Transmission</label>
                        <div className="flex rounded-xl border border-zinc-200 overflow-hidden">
                            {TRANSMISSIONS.map((t, i) => (
                                <button
                                    key={t}
                                    onClick={() => setFilter("transmission", filters.transmission === t ? "" : t)}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-semibold transition-all cursor-pointer",
                                        i === 0 && "border-r border-zinc-200",
                                        filters.transmission === t
                                            ? "bg-zinc-900 text-white"
                                            : "bg-white text-zinc-600 hover:bg-zinc-50"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Localisation */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Localisation</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                            <Input
                                placeholder="Ville ou quartier"
                                value={filters.localisation}
                                onChange={e => setFilter("localisation", e.target.value)}
                                className="pl-9 h-9 rounded-xl border-zinc-200 bg-zinc-50 text-sm"
                            />
                        </div>
                    </div>

                </div>
            </aside>

            {/* ══════════════ CONTENU PRINCIPAL ══════════════ */}
            <main className="flex-1 min-w-0 p-5 md:p-6 space-y-5">

                {/* Bannière non connecté */}
                {!user && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-move-gold/10 border border-move-gold/20">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Building2 className="h-4 w-4 text-move-gold shrink-0" />
                            <p className="text-sm text-zinc-700 truncate">
                                Parcourez librement — Connectez-vous pour contacter les vendeurs.
                            </p>
                        </div>
                        <Link href="/auth" className="shrink-0">
                            <Button size="sm" className="rounded-lg bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white cursor-pointer gap-1.5">
                                <LogIn className="h-3.5 w-3.5" />
                                Se connecter
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Barre de recherche + tri */}
                <div className="flex gap-3">
                    {/* Bouton toggle sidebar */}
                    <button
                        onClick={() => setSidebarOpen(o => !o)}
                        title={sidebarOpen ? "Masquer les filtres" : "Afficher les filtres"}
                        className={cn(
                            "hidden lg:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer",
                            sidebarOpen
                                ? "border-move-gold bg-move-gold/10 text-move-gold"
                                : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                        )}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </button>

                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        <Input
                            placeholder="Rechercher une voiture, une marque, un modèle..."
                            value={filters.search}
                            onChange={e => setFilter("search", e.target.value)}
                            className="pl-10 pr-9 h-11 rounded-xl border-zinc-200 bg-white text-sm placeholder:text-zinc-400"
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilter("search", "")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <Select value={postType} onValueChange={v => { setPostType(v as PostTypeFilter); setPage(1) }}>
                        <SelectTrigger className="h-11 min-w-36 rounded-xl border-zinc-200 bg-white text-sm cursor-pointer shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="tous" className="text-sm cursor-pointer">Tous</SelectItem>
                            <SelectItem value="vente" className="text-sm cursor-pointer">Vente</SelectItem>
                            <SelectItem value="location" className="text-sm cursor-pointer">Location</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Compteur + toggle vue */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-zinc-500">
                            <span className="font-black text-zinc-900">{filteredAndSorted.length.toLocaleString("fr-FR")}</span>
                            {" "}véhicule{filteredAndSorted.length > 1 ? "s" : ""} disponible{filteredAndSorted.length > 1 ? "s" : ""}
                        </p>
                        <button
                            onClick={() => fetchVehicules(true)}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                            Actualiser
                        </button>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                viewMode === "grid" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer",
                                viewMode === "list" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700"
                            )}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Grille / liste */}
                {paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                            <PackageX className="h-8 w-8 text-zinc-300" />
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 mb-1.5">Aucun véhicule trouvé</h3>
                        <p className="text-sm text-zinc-500 max-w-sm mb-5">
                            Essayez de modifier vos filtres pour voir plus de résultats.
                        </p>
                        {activeFilterCount > 0 && (
                            <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-lg cursor-pointer border-zinc-200">
                                <X className="h-3.5 w-3.5 mr-1" />
                                Réinitialiser les filtres
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className={cn(
                        viewMode === "grid"
                            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                            : "flex flex-col gap-4"
                    )}>
                        {paginated.map(v => <VehicleCard key={v.id} v={v} />)}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && <Pagination />}

            </main>

            {/* ══════════════ DIALOGS & OVERLAYS ══════════════ */}


            {/* Barre de comparaison flottante */}
            {compareIds.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 shadow-2xl shadow-black/10 px-4 py-3">
                    <div className="max-w-7xl mx-auto flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-zinc-500 shrink-0">Comparer :</span>
                            <div className="flex items-center gap-2">
                                {compareIds.map(id => {
                                    const v = vehiculesList.find(x => x.id === id)
                                    if (!v) return null
                                    return (
                                        <div key={id} className="flex items-center gap-1.5 bg-zinc-100 rounded-lg px-2.5 py-1.5">
                                            <span className="text-xs font-semibold text-zinc-800 truncate max-w-25">
                                                {v.description?.marque} {v.description?.modele}
                                            </span>
                                            <button onClick={() => toggleCompare(id)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )
                                })}
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
                                    className="bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg cursor-pointer gap-1.5 text-xs"
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
    )
}

export default VehiclesPage
