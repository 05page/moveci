"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Car, GraduationCap, TrendingUp, CalendarCheck, Users, RefreshCw, Wallet, Eye, Inbox } from "lucide-react"
import { toast } from "sonner"
import { getMesStats } from "@/src/actions/stats.actions"
import { getMesFormations } from "@/src/actions/formations.actions"
import { VendeurStats, Formation } from "@/src/types"
import { useUser } from "@/src/context/UserContext"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

// Styles des médaillons de classement (or / argent / bronze) pour les tops
const RANK_STYLES = [
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
]

export default function PartenaireDashboard() {
    const { user } = useUser()
    const isAutoEcole = user?.role === "auto_ecole"

    const [data, setData]             = useState<VendeurStats | null>(null)
    const [formations, setFormations]  = useState<Formation[]>([])
    const [loading, setLoading]        = useState(true)
    const [refreshing, setRefreshing]  = useState(false)

    const fetchStats = useCallback(async () => {
        setLoading(true)
        try {
            if (isAutoEcole) {
                // Auto-école : on charge les formations pour dériver les KPIs
                const res = await getMesFormations()
                setFormations((res.data as unknown as Formation[]) ?? [])
            } else {
                // Concessionnaire : stats véhicules classiques
                const res = await getMesStats()
                if (res.data) setData(res.data)
            }
        } catch {
            toast.error("Impossible de charger les statistiques")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [isAutoEcole])

    useEffect(() => { fetchStats() }, [fetchStats])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchStats()
    }

    // ── KPIs Concessionnaire ──────────────────────────────────────────────────
    const totalVehicules = data
        ? (data.stats.total_vehicule ?? 0) + (data.stats.total_vehicule_vendu ?? 0) + (data.stats.total_vehicule_loue ?? 0)
        : 0

    const concessStats = [
        { label: "Véhicules listés", value: totalVehicules.toLocaleString("fr-FR"), icon: Car,
          chip: "bg-sky-50 dark:bg-sky-950/40", iconColor: "text-sky-600 dark:text-sky-400", accent: "bg-sky-500" },
        { label: "Vues totales", value: (data?.stats.total_vues ?? 0).toLocaleString("fr-FR"), icon: TrendingUp,
          chip: "bg-violet-50 dark:bg-violet-950/40", iconColor: "text-violet-600 dark:text-violet-400", accent: "bg-violet-500" },
        { label: "Rendez-vous", value: (data?.rdv.total_rdv ?? 0).toLocaleString("fr-FR"), icon: CalendarCheck,
          chip: "bg-emerald-50 dark:bg-emerald-950/40", iconColor: "text-emerald-600 dark:text-emerald-400", accent: "bg-emerald-500" },
        { label: "Revenus du mois", value: Number(data?.stats.total_revenus ?? 0).toLocaleString("fr-FR") + " FCFA", icon: Wallet,
          chip: "bg-amber-100/70 dark:bg-amber-950/50", iconColor: "text-amber-600 dark:text-amber-400",
          accent: "bg-gradient-to-r from-primary to-amber-400", featured: true },
    ]

    // ── KPIs Auto-école (dérivés de la liste formations) ─────────────────────
    const formationsActives     = formations.filter(f => f.statut_validation === "validé").length
    const totalInscriptions     = formations.reduce((sum, f) => sum + (f.inscriptions_count ?? 0), 0)
    const totalRevenus          = formations.reduce((sum, f) => sum + (f.prix ?? 0) * (f.inscriptions_count ?? 0), 0)

    const autoEcoleStats = [
        { label: "Formations actives", value: formationsActives.toString(), icon: BookOpen,
          chip: "bg-sky-50 dark:bg-sky-950/40", iconColor: "text-sky-600 dark:text-sky-400", accent: "bg-sky-500" },
        { label: "Inscriptions totales", value: totalInscriptions.toLocaleString("fr-FR"), icon: Users,
          chip: "bg-emerald-50 dark:bg-emerald-950/40", iconColor: "text-emerald-600 dark:text-emerald-400", accent: "bg-emerald-500" },
        { label: "Permis proposés", value: new Set(formations.map(f => f.type_permis)).size.toString(), icon: GraduationCap,
          chip: "bg-violet-50 dark:bg-violet-950/40", iconColor: "text-violet-600 dark:text-violet-400", accent: "bg-violet-500" },
        { label: "Revenus estimés", value: totalRevenus.toLocaleString("fr-FR") + " FCFA", icon: Wallet,
          chip: "bg-amber-100/70 dark:bg-amber-950/50", iconColor: "text-amber-600 dark:text-amber-400",
          accent: "bg-gradient-to-r from-primary to-amber-400", featured: true },
    ]

    const stats = isAutoEcole ? autoEcoleStats : concessStats

    // Top 3 selon le rôle (formations les plus inscrites / véhicules les plus vus)
    const topFormations = [...formations]
        .sort((a, b) => (b.inscriptions_count ?? 0) - (a.inscriptions_count ?? 0))
        .slice(0, 3)
    const topVehicules = data?.top_vehicule_vues.my_top_vehicle_most_vues?.slice(0, 3) ?? []

    return (
        <FadeIn className="space-y-6">
            <SlideIn direction="left">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        {user?.fullname ? `Bienvenue, ${user.fullname} — ` : "Bienvenue sur "}
                        {isAutoEcole ? "votre espace auto-école." : "votre espace concessionnaire."}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="gap-2 cursor-pointer shrink-0"
                >
                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    {refreshing ? "Chargement..." : "Actualiser"}
                </Button>
            </div>
            </SlideIn>

            {/* KPIs */}
            <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <StaggerItem key={stat.label}>
                    <Card className={cn(
                        "relative overflow-hidden rounded-2xl border-border/40 shadow-sm transition-shadow hover:shadow-md",
                        stat.featured && "bg-gradient-to-br from-primary/10 via-card to-card",
                    )}>
                        {/* Filet d'accent coloré en tête de card */}
                        <div className={cn("absolute inset-x-0 top-0 h-[3px]", stat.accent)} />
                        <CardContent className="px-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1.5">
                                    <p className="text-[13px] font-medium text-muted-foreground">{stat.label}</p>
                                    {loading
                                        ? <Skeleton className="h-8 w-24" />
                                        : <p className="truncate text-2xl font-bold tracking-tight tabular-nums">{stat.value}</p>
                                    }
                                </div>
                                <div className={cn("shrink-0 rounded-xl p-2.5", stat.chip)}>
                                    <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    </StaggerItem>
                ))}
            </StaggerList>

            {/* Blocs secondaires selon le rôle */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-2xl border-border/40 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <span className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950/40">
                                <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </span>
                            Activité récente
                        </CardTitle>
                        <CardDescription>Dernières actions sur votre espace</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-3/4" />
                            </div>
                        ) : !isAutoEcole && (data?.rdv.rdv_recents?.length ?? 0) > 0 ? (
                            <ul className="divide-y divide-border/60">
                                {data!.rdv.rdv_recents.slice(0, 3).map((rdv) => (
                                    <li key={rdv.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                        <div className="rounded-lg bg-muted p-2">
                                            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                            {rdv.client?.fullname ?? "Client"}
                                        </p>
                                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                                            {rdv.post_type}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : isAutoEcole && formations.length > 0 ? (
                            <ul className="divide-y divide-border/60">
                                {formations.slice(0, 3).map((f) => (
                                    <li key={f.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                        <div className="rounded-lg bg-muted p-2">
                                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{f.description?.titre ?? "Formation"}</p>
                                            <p className="text-xs text-muted-foreground">Permis {f.type_permis}</p>
                                        </div>
                                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                            {f.inscriptions_count ?? 0} inscrits
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                <div className="rounded-full bg-muted p-3">
                                    <Inbox className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">Aucune activité récente pour le moment.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <span className="rounded-lg bg-violet-50 p-1.5 dark:bg-violet-950/40">
                                {isAutoEcole
                                    ? <GraduationCap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    : <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
                            </span>
                            {isAutoEcole ? "Mes formations" : "Top véhicules"}
                        </CardTitle>
                        <CardDescription>
                            {isAutoEcole
                                ? "Formations avec le plus d'inscrits"
                                : "Les plus consultés sur la plateforme"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-3/4" />
                            </div>
                        ) : isAutoEcole ? (
                            topFormations.length > 0 ? (
                                <ul className="divide-y divide-border/60">
                                    {topFormations.map((f, i) => (
                                        <li key={f.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                            <span className={cn(
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                                RANK_STYLES[i] ?? RANK_STYLES[2],
                                            )}>
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">Permis {f.type_permis}</p>
                                                <p className="text-xs text-muted-foreground">{f.prix?.toLocaleString("fr-FR")} FCFA</p>
                                            </div>
                                            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                                <Users className="h-3.5 w-3.5" />
                                                {f.inscriptions_count ?? 0}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                    <div className="rounded-full bg-muted p-3">
                                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Aucune formation publiée.</p>
                                </div>
                            )
                        ) : (
                            topVehicules.length > 0 ? (
                                <ul className="divide-y divide-border/60">
                                    {topVehicules.map((v, i) => (
                                        <li key={v.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                            <span className={cn(
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                                RANK_STYLES[i] ?? RANK_STYLES[2],
                                            )}>
                                                {i + 1}
                                            </span>
                                            <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                                {v.description?.marque} {v.description?.modele}
                                            </p>
                                            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                                <Eye className="h-3.5 w-3.5" />
                                                {v.views_count}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                    <div className="rounded-full bg-muted p-3">
                                        <Car className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Aucun véhicule publié.</p>
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </FadeIn>
    )
}
