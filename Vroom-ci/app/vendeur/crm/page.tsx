"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Users, Search, CircleDollarSign, Calendar, TrendingUp,
    ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal,
    X, PackageX, RefreshCw,
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import { CrmClient } from "@/src/types"
import { getCrmClients } from "@/src/actions/crm.actions"
import Link from "next/link"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""
const PER_PAGE = 12

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusTab = "tous" | "confirmé" | "terminé" | "en_attente" | "annulé" | "refusé"
type SortKey   = "interaction_desc" | "ca_desc" | "ca_asc" | "nom_asc"

const STATUS_TABS: { key: StatusTab; label: string }[] = [
    { key: "tous",       label: "Tous" },
    { key: "confirmé",   label: "Confirmé" },
    { key: "terminé",    label: "Terminé" },
    { key: "en_attente", label: "En attente" },
    { key: "annulé",     label: "Annulé" },
    { key: "refusé",     label: "Refusé" },
]

const SORT_LABELS: Record<SortKey, string> = {
    interaction_desc: "Dernière interaction",
    ca_desc:          "CA décroissant",
    ca_asc:           "CA croissant",
    nom_asc:          "Nom A → Z",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pastille de chaleur basée sur la date de dernière interaction */
function getActivityBadge(derniere_interaction: string | null): {
    dot: string; label: string; labelClass: string; badgeClass: string
} {
    if (!derniere_interaction) return {
        dot: "bg-zinc-300", label: "Inactif", labelClass: "text-zinc-400",
        badgeClass: "bg-zinc-100 text-zinc-500",
    }
    const days = Math.floor((Date.now() - new Date(derniere_interaction).getTime()) / 86_400_000)
    if (days < 7)  return { dot: "bg-emerald-500", label: "Actif",  labelClass: "text-emerald-600", badgeClass: "bg-emerald-100 text-emerald-700" }
    if (days < 30) return { dot: "bg-amber-400",   label: "Tiède",  labelClass: "text-amber-500",   badgeClass: "bg-amber-100 text-amber-600" }
    return              { dot: "bg-red-400",        label: "Froid",  labelClass: "text-red-500",     badgeClass: "bg-red-100 text-red-600" }
}

function formatDate(date: string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="flex min-h-screen pt-16 bg-zinc-50">
            <aside className="hidden lg:block w-64 shrink-0 border-r border-zinc-200 bg-white p-6 space-y-5">
                <Skeleton className="h-6 w-24" />
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </aside>
            <main className="flex-1 p-6 space-y-5">
                <div className="flex gap-3">
                    <Skeleton className="h-11 flex-1 rounded-xl" />
                    <Skeleton className="h-11 w-36 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-9 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmPage() {
    const [clients, setClients]       = useState<CrmClient[]>([])
    const [loading, setLoading]       = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch]         = useState("")
    const [activeTab, setActiveTab]   = useState<StatusTab>("tous")
    const [sortBy, setSortBy]         = useState<SortKey>("interaction_desc")
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [page, setPage]             = useState(1)

    const fetchClients = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        else setRefreshing(true)
        try {
            const res = await getCrmClients()
            setClients(res?.data ?? [])
        } catch {
            toast.error("Erreur de chargement")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchClients() }, [fetchClients])

    // ── KPI ───────────────────────────────────────────────────────────────────

    const kpis = useMemo(() => {
        const now    = Date.now()
        const actifs = clients.filter(c => {
            if (!c.derniere_interaction) return false
            return (now - new Date(c.derniere_interaction).getTime()) / 86_400_000 < 30
        })
        const caTotal = clients.reduce((acc, c) => acc + Number(c.chiffre_affaires ?? 0), 0)
        const rdvTotal = clients.reduce((acc, c) => acc + (c.nb_rdv ?? 0), 0)
        return { total: clients.length, actifs: actifs.length, caTotal, rdvTotal }
    }, [clients])

    // ── Tab count ─────────────────────────────────────────────────────────────

    const tabCount = useCallback((key: StatusTab) => {
        if (key === "tous") return clients.length
        return clients.filter(c => c.statut_dernier_rdv === key).length
    }, [clients])

    // ── Filtrage + tri ────────────────────────────────────────────────────────

    const filtered = useMemo(() => {
        let list = [...clients]

        if (activeTab !== "tous") list = list.filter(c => c.statut_dernier_rdv === activeTab)

        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(c =>
                c.fullname.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                (c.telephone ?? "").includes(q)
            )
        }

        list.sort((a, b) => {
            if (sortBy === "ca_desc") return Number(b.chiffre_affaires) - Number(a.chiffre_affaires)
            if (sortBy === "ca_asc")  return Number(a.chiffre_affaires) - Number(b.chiffre_affaires)
            if (sortBy === "nom_asc") return a.fullname.localeCompare(b.fullname)
            // interaction_desc
            if (!a.derniere_interaction && !b.derniere_interaction) return 0
            if (!a.derniere_interaction) return 1
            if (!b.derniere_interaction) return -1
            return new Date(b.derniere_interaction).getTime() - new Date(a.derniere_interaction).getTime()
        })

        return list
    }, [clients, search, activeTab, sortBy])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
    const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    const resetFilters = () => { setSearch(""); setActiveTab("tous"); setPage(1) }
    const hasFilters   = search || activeTab !== "tous"

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
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                {pages.map((p, i) => p === "…" ? (
                    <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-zinc-400">…</span>
                ) : (
                    <button key={p} onClick={() => setPage(p as number)}
                        className={cn("w-9 h-9 rounded-lg text-sm font-semibold transition-colors cursor-pointer",
                            page === p ? "bg-move-gold text-white shadow-sm" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                        )}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer transition-colors">
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        )
    }

    if (loading) return <PageSkeleton />

    return (
        <div className="flex min-h-screen pt-16 bg-zinc-50">

            {/* ══════════════ SIDEBAR ══════════════ */}
            <aside className={cn(
                "flex-col w-64 shrink-0 border-r border-zinc-200 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-all duration-300",
                sidebarOpen ? "hidden lg:flex" : "hidden"
            )}>
                <div className="p-5 space-y-6 flex-1">

                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-zinc-900">Filtres</h2>
                        {hasFilters && (
                            <button onClick={resetFilters} className="text-xs font-semibold text-move-gold hover:underline cursor-pointer">
                                Réinitialiser
                            </button>
                        )}
                    </div>

                    {/* Tri */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Trier par</label>
                        <div className="space-y-1">
                            {Object.entries(SORT_LABELS).map(([k, label]) => (
                                <button
                                    key={k}
                                    onClick={() => { setSortBy(k as SortKey); setPage(1) }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
                                        sortBy === k
                                            ? "bg-move-gold/10 text-move-gold font-semibold"
                                            : "text-zinc-600 hover:bg-zinc-100"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* KPI en pied de sidebar */}
                <div className="p-5 border-t border-zinc-100 space-y-3">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Vue d'ensemble</p>
                    {[
                        { label: "Total clients",   value: kpis.total,  icon: Users,             color: "text-zinc-600",    bg: "bg-zinc-100" },
                        { label: "Actifs (30j)",    value: kpis.actifs, icon: TrendingUp,         color: "text-emerald-600", bg: "bg-emerald-100" },
                        { label: "Total RDV",       value: kpis.rdvTotal, icon: Calendar,         color: "text-blue-600",    bg: "bg-blue-100" },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
                                <s.icon className={cn("h-4 w-4", s.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-zinc-900">{s.value}</p>
                                <p className="text-xs text-zinc-400 truncate">{s.label}</p>
                            </div>
                        </div>
                    ))}
                    {kpis.caTotal > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-move-gold/10">
                                <CircleDollarSign className="h-4 w-4 text-move-gold" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-zinc-900">{Number(kpis.caTotal).toLocaleString("fr-FR")} F</p>
                                <p className="text-xs text-zinc-400">CA total</p>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ══════════════ CONTENU ══════════════ */}
            <main className="flex-1 min-w-0 p-5 md:p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-zinc-900">Suivi clients</h1>
                        <p className="text-sm text-zinc-500 mt-0.5">
                            {kpis.total} contact{kpis.total > 1 ? "s" : ""} dans votre base
                        </p>
                    </div>
                    <button
                        onClick={() => fetchClients(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                        Actualiser
                    </button>
                </div>

                {/* Barre recherche + tri */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-3 flex-1">
                        <button
                            onClick={() => setSidebarOpen(o => !o)}
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
                                placeholder="Nom, email ou téléphone…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1) }}
                                className="pl-10 pr-9 h-11 rounded-xl border-zinc-200 bg-white text-sm placeholder:text-zinc-400"
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 whitespace-nowrap">Trier par :</span>
                        <Select value={sortBy} onValueChange={v => { setSortBy(v as SortKey); setPage(1) }}>
                            <SelectTrigger className="h-11 flex-1 sm:min-w-44 rounded-xl border-zinc-200 bg-white text-sm cursor-pointer">
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

                {/* Tabs statut */}
                <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto">
                    {STATUS_TABS.map(tab => {
                        const count    = tabCount(tab.key)
                        const isActive = activeTab === tab.key
                        return (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key); setPage(1) }}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
                                    isActive
                                        ? "border-move-gold text-move-gold"
                                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                                )}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={cn(
                                        "text-xs font-bold px-1.5 py-0.5 rounded-full",
                                        isActive ? "bg-move-gold/15 text-move-gold" : "bg-zinc-100 text-zinc-500"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Compteur */}
                <p className="text-sm text-zinc-500">
                    <span className="font-black text-zinc-900">{filtered.length}</span>
                    {" "}client{filtered.length > 1 ? "s" : ""}
                </p>

                {/* Grille clients */}
                {paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                            <PackageX className="h-8 w-8 text-zinc-300" />
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 mb-1.5">Aucun client trouvé</h3>
                        <p className="text-sm text-zinc-500 max-w-sm mb-5">
                            {hasFilters
                                ? "Essayez de modifier vos filtres."
                                : "Vos clients apparaissent ici après un premier rendez-vous."
                            }
                        </p>
                        {hasFilters && (
                            <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-lg cursor-pointer border-zinc-200">
                                <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {paginated.map(client => {
                            const activity = getActivityBadge(client.derniere_interaction)
                            return (
                                <Card key={client.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                                    <CardContent className="p-5 flex flex-col gap-4">

                                        {/* En-tête client */}
                                        <div className="flex items-center gap-3">
                                            <div className="relative shrink-0">
                                                <Avatar className="h-12 w-12 ring-2 ring-zinc-100">
                                                    <AvatarImage src={client.avatar ? `${BACKEND_URL}/storage/${client.avatar}` : undefined} />
                                                    <AvatarFallback className="text-base font-black bg-zinc-100 text-zinc-600">
                                                        {client.fullname.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white", activity.dot)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-zinc-900 truncate">{client.fullname}</p>
                                                <p className="text-xs text-zinc-400 truncate">{client.email}</p>
                                            </div>
                                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", activity.badgeClass)}>
                                                {activity.label}
                                            </span>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-100">
                                            <div className="text-center">
                                                <p className="text-lg font-black text-zinc-900">{client.nb_rdv}</p>
                                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">RDV</p>
                                            </div>
                                            <div className="text-center border-x border-zinc-100">
                                                <p className="text-lg font-black text-zinc-900">{client.nb_transactions}</p>
                                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Ventes</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-black text-move-gold">
                                                    {Number(client.chiffre_affaires) > 0
                                                        ? `${(Number(client.chiffre_affaires) / 1_000_000).toFixed(1)}M`
                                                        : "—"
                                                    }
                                                </p>
                                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">CA</p>
                                            </div>
                                        </div>

                                        {/* Dernier contact */}
                                        <p className="text-xs text-zinc-400">
                                            Dernier contact : <span className={cn("font-semibold", activity.labelClass)}>{formatDate(client.derniere_interaction)}</span>
                                        </p>

                                        {/* Action */}
                                        <Link href={`/vendeur/crm/${client.id}`}>
                                            <Button size="sm" className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer gap-1.5">
                                                Voir la fiche
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}

                {totalPages > 1 && <Pagination />}
            </main>
        </div>
    )
}
