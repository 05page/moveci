"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getErrorMessage } from "@/src/lib/handleError"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { toast } from "sonner"
import { cn, getPhotoUrl } from "@/src/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Car, Plus, Eye, Search, Tag, Key, PackageX,
    Edit, Trash2, Trash2Icon, Fuel,
    LayoutGrid, List, ChevronLeft, ChevronRight, MoreVertical,
    SlidersHorizontal, X,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import DetailsCard from "./DetailsVehicles"
import { EditVehicle } from "./EditVehicle"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogMedia, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { vehicule } from "@/src/types"
import { getMesVehicules, deleteVehicule } from "@/src/actions/vehicules.actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Filters {
    search: string
    marque: string
    prixMin: string
    prixMax: string
    anneeMin: string
    carburant: string[]
    transmission: string
}

type SortKey = "recent" | "prix_asc" | "prix_desc" | "km_asc"
type ViewMode = "grid" | "list"
type StatusTab = "tous" | "vente" | "location" | "vendus" | "en_attente" | "rejetee"

// ─── Constantes ───────────────────────────────────────────────────────────────

const CARBURANTS = ["Électrique", "Hybride", "Essence", "Diesel"]
const ANNEES_PILLS = ["2018+", "2020+", "2022+", "2024+"]
const TRANSMISSIONS = ["Automatique", "Manuelle"]
const PER_PAGE = 9

const SORT_LABELS: Record<SortKey, string> = {
    recent: "Plus récents",
    prix_asc: "Prix croissant",
    prix_desc: "Prix décroissant",
    km_asc: "Kilométrage ↑",
}

const EMPTY_FILTERS: Filters = {
    search: "",
    marque: "Toutes",
    prixMin: "",
    prixMax: "",
    anneeMin: "",
    carburant: [],
    transmission: "",
}

const STATUS_TABS: { key: StatusTab; label: string }[] = [
    { key: "tous", label: "Tous" },
    { key: "vente", label: "En vente" },
    { key: "location", label: "Location" },
    { key: "vendus", label: "Vendus / Loués" },
    { key: "en_attente", label: "En attente" },
    { key: "rejetee", label: "Rejetés" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatutColor = (statut: string, status_validation?: string | null) => {
    if (status_validation === "rejetee") return "bg-red-100 text-red-600"
    if (status_validation === "en_attente") return "bg-amber-100 text-amber-600"
    switch (statut) {
        case "disponible": return "bg-green-100 text-green-700"
        case "réservé": return "bg-amber-100 text-amber-600"
        case "vendu": return "bg-purple-100 text-purple-600"
        case "loué": return "bg-blue-100 text-blue-600"
        case "suspendu": return "bg-red-100 text-red-600"
        default: return "bg-zinc-100 text-zinc-500"
    }
}

const getStatutLabel = (statut: string, status_validation?: string | null) => {
    if (status_validation === "rejetee") return "Rejeté"
    if (status_validation === "en_attente") return "En attente"
    switch (statut) {
        case "disponible": return "Disponible"
        case "réservé": return "Réservé"
        case "vendu": return "Vendu"
        case "loué": return "En location"
        case "suspendu": return "Suspendu"
        default: return statut
    }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="flex min-h-screen pt-16 bg-zinc-50">
            <aside className="hidden lg:block w-64 shrink-0 border-r border-zinc-200 bg-white p-6 space-y-5">
                <Skeleton className="h-6 w-24" />
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </aside>
            <main className="flex-1 p-6 space-y-5">
                <div className="flex gap-3">
                    <Skeleton className="h-11 flex-1 rounded-xl" />
                    <Skeleton className="h-11 w-36 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="rounded-2xl border border-zinc-200 overflow-hidden bg-white">
                            <Skeleton className="h-44 w-full rounded-none" />
                            <div className="p-4 space-y-2">
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [mesvehicules, setMesVehicules] = useState<vehicule[]>([])
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
    const [sortBy, setSortBy] = useState<SortKey>("recent")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [page, setPage] = useState(1)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeTab, setActiveTab] = useState<StatusTab>("tous")

    const [detailVehicle, setDetailVehicle] = useState<vehicule | null>(null)
    const [editingVehicle, setEditingVehicle] = useState<vehicule | null>(null)
    const [vehicleToDelete, setVehicleToDelete] = useState<vehicule | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchVehicles = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await getMesVehicules()
            setMesVehicules(res.data?.vehicules ?? [])
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchVehicles() }, [fetchVehicles])
    useRevalidateOnFocus(fetchVehicles)
    useDataRefresh("vehicule", fetchVehicles)

    // ── Suppression ───────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!vehicleToDelete) return
        try {
            await deleteVehicule(vehicleToDelete.id)
            toast.success("Véhicule supprimé", {
                description: `${vehicleToDelete.description?.marque} ${vehicleToDelete.description?.modele} supprimé.`,
            })
            setDeleteOpen(false)
            setVehicleToDelete(null)
            fetchVehicles()
        } catch {
            toast.error("Erreur lors de la suppression")
        }
    }

    // ── Filtres ───────────────────────────────────────────────────────────────

    const marquesDisponibles = useMemo(() => {
        const uniques = Array.from(
            new Set(mesvehicules.map(v => v.description?.marque).filter(Boolean))
        ).sort()
        return ["Toutes", ...uniques]
    }, [mesvehicules])

    const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: val }))
        setPage(1)
    }

    const resetFilters = () => { setFilters(EMPTY_FILTERS); setPage(1) }

    const activeFilterCount = useMemo(() => {
        let n = 0
        if (filters.search) n++
        if (filters.marque !== "Toutes") n++
        if (filters.carburant.length > 0) n++
        if (filters.transmission) n++
        if (filters.prixMin) n++
        if (filters.prixMax) n++
        if (filters.anneeMin) n++
        return n
    }, [filters])

    // ── Compte par tab ────────────────────────────────────────────────────────

    const tabCount = useCallback((key: StatusTab): number => {
        if (key === "tous") return mesvehicules.length
        if (key === "en_attente") return mesvehicules.filter(v => v.status_validation === "en_attente").length
        if (key === "rejetee") return mesvehicules.filter(v => v.status_validation === "rejetee").length
        if (key === "vente") return mesvehicules.filter(v => v.post_type === "vente" && !["en_attente", "rejetee"].includes(v.status_validation ?? "")).length
        if (key === "location") return mesvehicules.filter(v => v.post_type === "location" && !["en_attente", "rejetee"].includes(v.status_validation ?? "")).length
        if (key === "vendus") return mesvehicules.filter(v => v.statut === "vendu" || v.statut === "loué").length
        return 0
    }, [mesvehicules])

    // ── Données filtrées + triées ─────────────────────────────────────────────

    const filteredAndSorted = useMemo(() => {
        let list = mesvehicules.filter(v => {
            // Filtre par tab statut
            if (activeTab === "en_attente" && v.status_validation !== "en_attente") return false
            if (activeTab === "rejetee" && v.status_validation !== "rejetee") return false
            if (activeTab === "vente" && !(v.post_type === "vente" && !["en_attente", "rejetee"].includes(v.status_validation ?? ""))) return false
            if (activeTab === "location" && !(v.post_type === "location" && !["en_attente", "rejetee"].includes(v.status_validation ?? ""))) return false
            if (activeTab === "vendus" && !(v.statut === "vendu" || v.statut === "loué")) return false

            // Filtres sidebar
            if (filters.search) {
                const q = `${v.description?.marque ?? ""} ${v.description?.modele ?? ""}`.toLowerCase()
                if (!q.includes(filters.search.toLowerCase())) return false
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

        return [...list].sort((a, b) => {
            if (sortBy === "prix_asc") return a.prix - b.prix
            if (sortBy === "prix_desc") return b.prix - a.prix
            if (sortBy === "km_asc") return Number(a.description?.kilometrage ?? 0) - Number(b.description?.kilometrage ?? 0)
            return 0
        })
    }, [mesvehicules, filters, sortBy, activeTab])

    const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PER_PAGE))
    const paginated = filteredAndSorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    // ── Carte véhicule ────────────────────────────────────────────────────────

    const VehicleCard = ({ v }: { v: vehicule }) => {
        const primaryPhoto = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
        const imageUrl = primaryPhoto ? getPhotoUrl(primaryPhoto.path) : null

        return (
            <Card className={cn(
                "rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5",
                viewMode === "list" && "flex flex-row"
            )}>
                <CardContent className={cn("p-0 flex flex-col", viewMode === "list" && "flex-row w-full")}>

                    {/* ── Image ─────────────────────────────────────────── */}
                    <div className={cn(
                        "relative bg-zinc-100 overflow-hidden shrink-0",
                        viewMode === "grid" ? "h-44 w-full" : "h-36 w-52"
                    )}>
                        {imageUrl
                            ? <Image src={imageUrl} alt={`${v.description?.marque} ${v.description?.modele}`} fill className="object-cover" unoptimized />
                            : <div className="w-full h-full flex items-center justify-center"><Car className="h-12 w-12 text-zinc-300" /></div>
                        }

                        {/* ⋮ → ouvre le panneau Détails */}
                        <button
                            onClick={() => setDetailVehicle(v)}
                            className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                        >
                            <MoreVertical className="h-4 w-4 text-white" />
                        </button>

                        {/* Badge type top-right */}
                        <div className="absolute top-2.5 right-2.5">
                            {v.post_type === "vente"
                                ? <span className="flex items-center gap-1 text-[10px] font-black tracking-wide px-2 py-0.5 rounded-sm bg-zinc-900/70 text-white backdrop-blur-sm"><Tag className="h-2.5 w-2.5" />Vente</span>
                                : <span className="flex items-center gap-1 text-[10px] font-black tracking-wide px-2 py-0.5 rounded-sm bg-blue-500/80 text-white backdrop-blur-sm"><Key className="h-2.5 w-2.5" />Location</span>
                            }
                        </div>

                        {/* Badge statut bottom-left */}
                        <div className="absolute bottom-2.5 left-2.5">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-sm", getStatutColor(v.statut, v.status_validation))}>
                                {getStatutLabel(v.statut, v.status_validation)}
                            </span>
                        </div>
                    </div>

                    {/* ── Infos ─────────────────────────────────────────── */}
                    <div className="p-4 flex flex-col flex-1 min-w-0">
                        {/* Prix */}
                        <p className="text-xl font-black text-move-gold mb-2">
                            {v.prix?.toLocaleString("fr-FR")}
                            <span className="text-xs font-normal text-zinc-400 ml-1">FCFA</span>
                        </p>

                        {/* Titre */}
                        <p className="font-bold text-sm text-zinc-900 mb-1 truncate">
                            {v.description?.marque} {v.description?.modele}
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

                        {/* Vues */}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3 pt-3 border-t border-zinc-100">
                            <Eye className="h-3 w-3" />
                            <span>{v.views_count ?? 0} vue{Number(v.views_count ?? 0) > 1 ? "s" : ""}</span>
                        </div>

                        {/* Actions vendeur */}
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-lg text-xs cursor-pointer border-zinc-200"
                                onClick={() => setDetailVehicle(v)}
                            >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Détails
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 rounded-lg text-xs bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer"
                                onClick={() => setEditingVehicle(v)}
                            >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Modifier
                            </Button>
                            <button
                                onClick={() => { setVehicleToDelete(v); setDeleteOpen(true) }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // ── Pagination ────────────────────────────────────────────────────────────

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

    // ── Loading ───────────────────────────────────────────────────────────────

    if (isLoading) return <PageSkeleton />

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex min-h-screen pt-16 bg-zinc-50">

            {/* ══════════════ SIDEBAR FILTRES ══════════════ */}
            <aside className={cn(
                "flex-col w-64 shrink-0 border-r border-zinc-200 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-300",
                sidebarOpen ? "hidden lg:flex" : "hidden"
            )}>
                <div className="p-5 space-y-6 flex-1">

                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-zinc-900">Filtres</h2>
                        {activeFilterCount > 0 && (
                            <button onClick={resetFilters} className="text-xs font-semibold text-move-gold hover:underline cursor-pointer">
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

                </div>
            </aside>

            {/* ══════════════ CONTENU PRINCIPAL ══════════════ */}
            <main className="flex-1 min-w-0 p-5 md:p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-zinc-900">Mes véhicules</h1>
                        <p className="text-sm text-zinc-500 mt-0.5">
                            {mesvehicules.length} annonce{mesvehicules.length > 1 ? "s" : ""} au total
                        </p>
                    </div>
                    <Link href="/vendeur/addVehicle">
                        <Button className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-bold cursor-pointer rounded-xl">
                            <Plus className="h-4 w-4" /> Publier un Véhicule
                        </Button>
                    </Link>
                </div>

                {/* Barre recherche + tri */}
                <div className="flex gap-3">
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
                            placeholder="Rechercher un véhicule..."
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

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-zinc-500 hidden sm:block whitespace-nowrap">Trier par :</span>
                        <Select value={sortBy} onValueChange={v => { setSortBy(v as SortKey); setPage(1) }}>
                            <SelectTrigger className="h-11 min-w-36 rounded-xl border-zinc-200 bg-white text-sm cursor-pointer">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {Object.entries(SORT_LABELS).map(([k, label]) => (
                                    <SelectItem key={k} value={k} className="text-sm cursor-pointer">{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabs statut (gold underline) */}
                <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto">
                    {STATUS_TABS.map(tab => {
                        const count = tabCount(tab.key)
                        const isActive = activeTab === tab.key
                        const isDanger = tab.key === "rejetee" && count > 0

                        return (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key); setPage(1) }}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
                                    isActive
                                        ? "border-move-gold text-move-gold"
                                        : isDanger
                                            ? "border-transparent text-red-500"
                                            : "border-transparent text-zinc-500 hover:text-zinc-800"
                                )}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={cn(
                                        "text-xs font-bold px-1.5 py-0.5 rounded-full",
                                        isActive ? "bg-move-gold/15 text-move-gold" :
                                            isDanger ? "bg-red-100 text-red-500" :
                                                "bg-zinc-100 text-zinc-500"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Compteur + toggle vue */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-500">
                        <span className="font-black text-zinc-900">{filteredAndSorted.length}</span>
                        {" "}véhicule{filteredAndSorted.length > 1 ? "s" : ""}
                    </p>
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
                            {activeFilterCount > 0
                                ? "Essayez de modifier vos filtres pour voir plus de résultats."
                                : "Aucune annonce dans cette catégorie pour le moment."
                            }
                        </p>
                        {activeFilterCount > 0 && (
                            <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-lg cursor-pointer border-zinc-200">
                                <X className="h-3.5 w-3.5 mr-1" />
                                Réinitialiser les filtres
                            </Button>
                        )}
                        {activeTab === "tous" && mesvehicules.length === 0 && (
                            <Link href="/vendeur/addVehicle" className="mt-3">
                                <Button className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-bold cursor-pointer rounded-xl">
                                    <Plus className="h-4 w-4" /> Publier un Véhicule
                                </Button>
                            </Link>
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

                {totalPages > 1 && <Pagination />}
            </main>

            {/* ══════════════ DIALOGS ══════════════ */}

            {detailVehicle && (
                <DetailsCard
                    isOpen={!!detailVehicle}
                    vehicule={detailVehicle}
                    onClose={() => setDetailVehicle(null)}
                />
            )}

            {editingVehicle && (
                <EditVehicle
                    isOpen={!!editingVehicle}
                    vehicule={editingVehicle}
                    onClose={() => setEditingVehicle(null)}
                    onSubmit={() => { setEditingVehicle(null); fetchVehicles() }}
                />
            )}

            <AlertDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open)
                    if (!open) setVehicleToDelete(null)
                }}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <Trash2Icon />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Supprimer le véhicule ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. {vehicleToDelete?.description.marque} {vehicleToDelete?.description.modele} sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline">Annuler</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete}>
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
