"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
    BarChart3, TrendingUp, Eye, Heart, MessageCircle,
    Wallet, Car, Tag, Key, Users, Star, ArrowUp,
    Calendar, Target, Clock, CheckCircle2, ShoppingCart,
    RefreshCw,
} from "lucide-react"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

interface MonthlyStat {
    mois: string
    revenus: number
    ventes: number
    locations: number
    vues: number
}

interface VehiculePerf {
    id: number
    nom: string
    type: "vente" | "location"
    vues: number
    favoris: number
    messages: number
    taux: number
}

const CARD = "rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm"

const monthlyStats: MonthlyStat[] = [
    { mois: "Août", revenus: 28500000, ventes: 2, locations: 8, vues: 890 },
    { mois: "Sept", revenus: 32000000, ventes: 3, locations: 10, vues: 1020 },
    { mois: "Oct", revenus: 38750000, ventes: 3, locations: 12, vues: 1150 },
    { mois: "Nov", revenus: 35200000, ventes: 2, locations: 11, vues: 980 },
    { mois: "Déc", revenus: 41000000, ventes: 4, locations: 14, vues: 1340 },
    { mois: "Jan", revenus: 45750000, ventes: 4, locations: 15, vues: 1245 },
]

const vehiculesPerf: VehiculePerf[] = [
    { id: 1, nom: "Toyota RAV4 2024", type: "vente", vues: 342, favoris: 28, messages: 15, taux: 4.4 },
    { id: 2, nom: "BMW X3 2023", type: "location", vues: 289, favoris: 19, messages: 12, taux: 4.2 },
    { id: 3, nom: "Mercedes Classe C 2023", type: "vente", vues: 256, favoris: 22, messages: 9, taux: 3.5 },
    { id: 4, nom: "Peugeot 3008 2024", type: "location", vues: 198, favoris: 14, messages: 7, taux: 3.5 },
    { id: 5, nom: "Hyundai Tucson 2023", type: "vente", vues: 178, favoris: 11, messages: 5, taux: 2.8 },
    { id: 6, nom: "Audi Q5 2022", type: "location", vues: 310, favoris: 25, messages: 18, taux: 5.8 },
    { id: 7, nom: "Volkswagen Golf 2023", type: "vente", vues: 145, favoris: 9, messages: 4, taux: 2.8 },
]

export default function StatsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchData = useCallback(async () => {
        const toastId = toast.loading("Chargement des statistiques...")
        try {
            await new Promise(r => setTimeout(r, 1500))
            setIsLoading(false)
        } finally {
            setRefreshing(false)
            toast.dismiss(toastId)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    const formatMontant = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
        if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
        return n.toString()
    }

    const totalRevenus = monthlyStats.reduce((s, m) => s + m.revenus, 0)
    const totalVues = monthlyStats.reduce((s, m) => s + m.vues, 0)
    const totalVentes = monthlyStats.reduce((s, m) => s + m.ventes, 0)
    const totalLocations = monthlyStats.reduce((s, m) => s + m.locations, 0)
    const maxRevenu = Math.max(...monthlyStats.map(m => m.revenus))

    const currentMonth = monthlyStats[monthlyStats.length - 1]
    const prevMonth = monthlyStats[monthlyStats.length - 2]
    const revenusChange = ((currentMonth.revenus - prevMonth.revenus) / prevMonth.revenus * 100).toFixed(1)
    const vuesChange = ((currentMonth.vues - prevMonth.vues) / prevMonth.vues * 100).toFixed(1)

    const stats = [
        { label: "Revenus totaux", value: `${formatMontant(totalRevenus)} FCFA`, icon: Wallet, color: "bg-zinc-900/10 text-zinc-700", trend: `+${revenusChange}%`, up: true },
        { label: "Vues totales", value: totalVues.toLocaleString(), icon: Eye, color: "bg-purple-500/10 text-purple-600", trend: `+${vuesChange}%`, up: true },
        { label: "Ventes réalisées", value: totalVentes.toString(), icon: Tag, color: "bg-zinc-900/10 text-zinc-700", trend: "+2 ce mois", up: true },
        { label: "Locations actives", value: totalLocations.toString(), icon: Key, color: "bg-blue-500/10 text-blue-600", trend: "+4 ce mois", up: true },
    ]

    const kpis = [
        { label: "Taux de conversion", value: "3.8%", icon: Target, color: "bg-amber-500/10 text-amber-600", desc: "Messages / Vues" },
        { label: "Temps de réponse", value: "~2h", icon: Clock, color: "bg-blue-500/10 text-blue-600", desc: "Moyenne de réponse" },
        { label: "Note moyenne", value: "4.8/5", icon: Star, color: "bg-amber-500/10 text-amber-600", desc: "87 avis clients" },
        { label: "Taux de finalisation", value: "72%", icon: CheckCircle2, color: "bg-zinc-900/10 text-zinc-700", desc: "Ventes conclues" },
    ]

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 px-4 md:px-6 pb-12">
                <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-72 rounded-2xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                    </div>
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
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
                    <div className="flex items-center gap-2 self-start md:self-auto">
                        <Badge variant="outline" className="rounded-full">
                            <Calendar className="h-3 w-3 mr-1" /> 6 derniers mois
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="gap-2 cursor-pointer"
                        >
                            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                            {refreshing ? "Chargement..." : "Actualiser"}
                        </Button>
                    </div>
                </div>
                </SlideIn>

                {/* Stats Cards */}
                <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {stats.map((s, i) => (
                        <StaggerItem key={i}>
                        <Card className={cn(CARD, "hover:shadow-lg transition-all duration-300")}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                                        <s.icon className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-xl font-bold">{s.value}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                    <span className={cn("text-xs font-medium", s.up ? "text-zinc-700" : "text-red-500")}>
                                        {s.trend}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                        </StaggerItem>
                    ))}
                </StaggerList>

                {/* Revenue Chart */}
                <Card className={cn(CARD)}>
                    <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-zinc-700" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Revenus mensuels</CardTitle>
                                    <p className="text-sm text-muted-foreground">Évolution sur 6 mois</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full font-bold gap-1">
                                <ArrowUp className="h-3 w-3" /> +{revenusChange}%
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-4">
                        {/* Bar Chart */}
                        <div className="flex items-end gap-2 md:gap-4 h-48 md:h-56">
                            {monthlyStats.map((m, i) => {
                                const height = (m.revenus / maxRevenu) * 100
                                const isLast = i === monthlyStats.length - 1
                                return (
                                    <div key={m.mois} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground">
                                            {formatMontant(m.revenus)}
                                        </span>
                                        <div className="w-full relative" style={{ height: `${height}%` }}>
                                            <div className={cn(
                                                "w-full h-full rounded-t-lg transition-all duration-500",
                                                isLast ? "bg-zinc-900" : "bg-zinc-900/20",
                                            )} />
                                        </div>
                                        <span className={cn("text-xs font-medium", isLast ? "text-zinc-700" : "text-muted-foreground")}>
                                            {m.mois}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        <Separator className="my-4" />

                        {/* Breakdown */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-lg font-bold text-zinc-700">{formatMontant(currentMonth.revenus)}</p>
                                <p className="text-xs text-muted-foreground">Ce mois</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">{currentMonth.ventes}</p>
                                <p className="text-xs text-muted-foreground">Ventes</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">{currentMonth.locations}</p>
                                <p className="text-xs text-muted-foreground">Locations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* KPIs */}
                <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {kpis.map((k, i) => (
                        <StaggerItem key={i}>
                        <Card className={cn(CARD, "hover:shadow-lg transition-all duration-300")}>
                            <CardContent className="p-4">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", k.color)}>
                                    <k.icon className="h-5 w-5" />
                                </div>
                                <p className="text-xl font-bold">{k.value}</p>
                                <p className="text-xs font-semibold text-muted-foreground mt-0.5">{k.label}</p>
                                <p className="text-[10px] text-muted-foreground">{k.desc}</p>
                            </CardContent>
                        </Card>
                        </StaggerItem>
                    ))}
                </StaggerList>

                {/* Vues Chart */}
                <Card className={cn(CARD)}>
                    <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                <Eye className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Vues mensuelles</CardTitle>
                                <p className="text-sm text-muted-foreground">Trafic sur vos annonces</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-4">
                        <div className="space-y-3">
                            {monthlyStats.map((m, i) => {
                                const maxVues = Math.max(...monthlyStats.map(s => s.vues))
                                const width = (m.vues / maxVues) * 100
                                const isLast = i === monthlyStats.length - 1
                                return (
                                    <div key={m.mois} className="flex items-center gap-3">
                                        <span className={cn("text-xs font-medium w-10", isLast ? "text-purple-600" : "text-muted-foreground")}>
                                            {m.mois}
                                        </span>
                                        <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-700", isLast ? "bg-purple-500" : "bg-purple-500/20")}
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                        <span className={cn("text-xs font-bold w-12 text-right", isLast ? "text-purple-600" : "text-muted-foreground")}>
                                            {m.vues}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Performance par véhicule */}
                <Card className={cn(CARD)}>
                    <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                                <Car className="h-5 w-5 text-zinc-700" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Performance par véhicule</CardTitle>
                                <p className="text-sm text-muted-foreground">Engagement sur vos annonces</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-4">
                        <Tabs defaultValue="tous">
                            <TabsList className="bg-muted/50 rounded-xl p-1 mb-4">
                                <TabsTrigger value="tous" className="rounded-lg cursor-pointer data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Tous</TabsTrigger>
                                <TabsTrigger value="vente" className="rounded-lg cursor-pointer data-[state=active]:bg-zinc-900 data-[state=active]:text-white">Ventes</TabsTrigger>
                                <TabsTrigger value="location" className="rounded-lg cursor-pointer data-[state=active]:bg-blue-500 data-[state=active]:text-white">Locations</TabsTrigger>
                            </TabsList>

                            {["tous", "vente", "location"].map(tab => {
                                const filtered = tab === "tous"
                                    ? vehiculesPerf
                                    : vehiculesPerf.filter(v => v.type === tab)
                                return (
                                    <TabsContent key={tab} value={tab} className="space-y-3">
                                        {filtered.sort((a, b) => b.vues - a.vues).map((v, i) => (
                                            <div key={v.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-muted/30 border border-border/40 hover:shadow-md transition-all duration-300">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-900/10 flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-black text-zinc-700">#{i + 1}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-sm truncate">{v.nom}</p>
                                                        <Badge className={cn("rounded-full text-[10px]",
                                                            v.type === "vente"
                                                                ? "bg-zinc-900/10 text-zinc-700 border-zinc-900/20"
                                                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                        )}>
                                                            {v.type === "vente" ? "Vente" : "Location"}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1.5">
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Eye className="h-3 w-3" /> {v.vues} vues
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Heart className="h-3 w-3" /> {v.favoris} favoris
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <MessageCircle className="h-3 w-3" /> {v.messages} msg
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <Badge variant="outline" className={cn("rounded-full text-xs font-bold",
                                                        v.taux >= 4 ? "bg-zinc-900/10 text-zinc-700 border-zinc-900/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                    )}>
                                                        {v.taux}% conv.
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </TabsContent>
                                )
                            })}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Résumé rapide */}
                <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sources de trafic */}
                    <StaggerItem>
                    <Card className={CARD}>
                        <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg">Sources de trafic</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 pt-4 space-y-3">
                            {[
                                { source: "Recherche directe", pct: 45, color: "bg-zinc-900" },
                                { source: "Page d'accueil", pct: 28, color: "bg-blue-500" },
                                { source: "Partage / Lien", pct: 18, color: "bg-purple-500" },
                                { source: "Autres", pct: 9, color: "bg-muted-foreground" },
                            ].map(s => (
                                <div key={s.source} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{s.source}</span>
                                        <span className="font-bold">{s.pct}%</span>
                                    </div>
                                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    </StaggerItem>

                    {/* Entonnoir de conversion */}
                    <StaggerItem>
                    <Card className={CARD}>
                        <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <ShoppingCart className="h-5 w-5 text-amber-600" />
                                </div>
                                <CardTitle className="text-lg">Entonnoir de conversion</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 pt-4 space-y-3">
                            {[
                                { etape: "Vues des annonces", valeur: "6 625", pct: 100, color: "bg-purple-500" },
                                { etape: "Ajouts aux favoris", valeur: "428", pct: 35, color: "bg-blue-500" },
                                { etape: "Messages reçus", valeur: "252", pct: 20, color: "bg-amber-500" },
                                { etape: "Ventes / Locations", valeur: "88", pct: 8, color: "bg-zinc-900" },
                            ].map(s => (
                                <div key={s.etape} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{s.etape}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{s.valeur}</span>
                                            <Badge variant="outline" className="rounded-full text-[10px]">{s.pct}%</Badge>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    </StaggerItem>
                </StaggerList>
            </div>
            </FadeIn>
        </div>
    )
}
