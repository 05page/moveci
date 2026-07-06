"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Eye, Wallet, Tag, Key, Car, Fuel, Gauge,
    BarChart3, CalendarCheck, RefreshCw,
} from "lucide-react"
import { getMesStats } from "@/src/actions/stats.actions"
import { VendeurStats, TopVehicle } from "@/src/types"
import { StatsChart } from "./stats-chart"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

const CARD = "rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm"

const formatMontant = (n: number | string) => {
    const num = Number(n)
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`
    return num.toLocaleString("fr-FR")
}

const getStatutConfig = (statut: string) => {
    switch (statut) {
        case "disponible": return { label: "Disponible", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
        case "vendu":      return { label: "Vendu",      className: "bg-zinc-100 text-zinc-700 border-zinc-300" }
        case "loué":       return { label: "Loué",       className: "bg-sky-50 text-sky-700 border-sky-200" }
        case "réservé":    return { label: "Réservé",    className: "bg-amber-50 text-amber-700 border-amber-200" }
        default:           return { label: statut,       className: "bg-muted text-muted-foreground" }
    }
}

export default function StatsPage() {
    const [data, setData]             = useState<VendeurStats | null>(null)
    const [loading, setLoading]       = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const res = await getMesStats()
            if (res.data) setData(res.data)
        } catch {
            toast.error("Impossible de charger les statistiques")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    const topVehicules: TopVehicle[] = data?.top_vehicule_vues?.my_top_vehicle_most_vues ?? []

    const statsCards = [
        {
            label: "Revenus totaux",
            value: `${formatMontant(data?.stats?.total_revenus ?? 0)} FCFA`,
            icon: Wallet,
            color: "bg-zinc-900/10 text-zinc-700",
        },
        {
            label: "Vues totales",
            value: (data?.stats?.total_vues ?? 0).toLocaleString("fr-FR"),
            icon: Eye,
            color: "bg-purple-500/10 text-purple-600",
        },
        {
            label: "Ventes réalisées",
            value: (data?.stats?.total_vehicule_vendu ?? 0).toString(),
            icon: Tag,
            color: "bg-zinc-900/10 text-zinc-700",
        },
        {
            label: "Locations actives",
            value: (data?.stats?.total_vehicule_loue ?? 0).toString(),
            icon: Key,
            color: "bg-blue-500/10 text-blue-600",
        },
        {
            label: "Rendez-vous",
            value: (data?.rdv?.total_rdv ?? 0).toString(),
            icon: CalendarCheck,
            color: "bg-emerald-500/10 text-emerald-600",
        },
        {
            label: "Annonces actives",
            value: (data?.stats?.total_vehicule ?? 0).toString(),
            icon: BarChart3,
            color: "bg-amber-500/10 text-amber-600",
        },
    ]

    const VehicleRow = ({ v, index }: { v: TopVehicle; index: number }) => {
        const cfg = getStatutConfig(v.statut)
        return (
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-muted/30 border border-border/40 hover:shadow-md transition-all duration-300">
                <div className="w-8 h-8 rounded-lg bg-zinc-900/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-zinc-700">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">
                            {v.description?.marque} {v.description?.modele}
                        </p>
                        <Badge className={cn(
                            "rounded-full text-[10px]",
                            v.post_type === "vente"
                                ? "bg-zinc-900/10 text-zinc-700 border-zinc-900/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        )}>
                            {v.post_type === "vente" ? "Vente" : "Location"}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        {v.description?.carburant && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Fuel className="h-3 w-3" /> {v.description.carburant}
                            </span>
                        )}
                        {v.description?.kilometrage && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Gauge className="h-3 w-3" /> {v.description.kilometrage} km
                            </span>
                        )}
                        {v.description?.annee && (
                            <span className="text-[10px] text-muted-foreground">{v.description.annee}</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] font-medium ${cfg.className}`}>
                        {cfg.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {v.views_count} vues
                    </span>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen pt-20 px-4 md:px-6 pb-12">
                <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                    <Skeleton className="h-10 w-48" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-80 rounded-2xl" />
                    {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-20 px-4 md:px-6 pb-12">
            <FadeIn>
            <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">

                {/* Header */}
                <SlideIn direction="left">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900/10 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-zinc-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Statistiques</h1>
                            <p className="text-muted-foreground text-sm">Analyse de vos performances</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2 cursor-pointer self-start md:self-auto"
                    >
                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        {refreshing ? "Chargement..." : "Actualiser"}
                    </Button>
                </div>
                </SlideIn>

                {/* Stats Cards */}
                <StaggerList className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {statsCards.map((s, i) => (
                        <StaggerItem key={i}>
                        <Card className={cn(CARD, "hover:shadow-lg transition-all duration-300")}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                                        <s.icon className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-xl font-bold">{s.value}</p>
                                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                            </CardContent>
                        </Card>
                        </StaggerItem>
                    ))}
                </StaggerList>

                {/* Graphique mensuel */}
                <StatsChart data={data?.stats_mensuel ?? []} />

                {/* Performance par véhicule */}
                <Card className={cn(CARD)}>
                    <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                                <Car className="h-5 w-5 text-zinc-700" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Performance par véhicule</CardTitle>
                                <p className="text-sm text-muted-foreground">Vos annonces les plus vues</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-4">
                        {topVehicules.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                                <Car className="h-8 w-8" />
                                <p className="text-sm">Aucune annonce pour le moment</p>
                            </div>
                        ) : (
                            <Tabs defaultValue="tous">
                                <TabsList className="bg-muted/50 rounded-xl p-1 mb-4">
                                    <TabsTrigger value="tous" className="rounded-lg cursor-pointer data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Tous</TabsTrigger>
                                    <TabsTrigger value="vente" className="rounded-lg cursor-pointer data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Ventes</TabsTrigger>
                                    <TabsTrigger value="location" className="rounded-lg cursor-pointer data-[state=active]:bg-blue-500 data-[state=active]:text-white">Locations</TabsTrigger>
                                </TabsList>

                                {(["tous", "vente", "location"] as const).map(tab => {
                                    const filtered = tab === "tous"
                                        ? topVehicules
                                        : topVehicules.filter(v => v.post_type === tab)
                                    return (
                                        <TabsContent key={tab} value={tab} className="space-y-3">
                                            {filtered.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-4">
                                                    Aucun véhicule dans cette catégorie
                                                </p>
                                            ) : (
                                                filtered
                                                    .sort((a, b) => b.views_count - a.views_count)
                                                    .map((v, i) => <VehicleRow key={v.id} v={v} index={i} />)
                                            )}
                                        </TabsContent>
                                    )
                                })}
                            </Tabs>
                        )}
                    </CardContent>
                </Card>

            </div>
            </FadeIn>
        </div>
    )
}
