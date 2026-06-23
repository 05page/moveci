"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, BookOpen, Car, GraduationCap, TrendingUp, CalendarCheck, Users, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { getMesStats } from "@/src/actions/stats.actions"
import { getMesFormations } from "@/src/actions/formations.actions"
import { VendeurStats, Formation } from "@/src/types"
import { useUser } from "@/src/context/UserContext"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

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
        { label: "Véhicules listés",  value: totalVehicules.toLocaleString("fr-FR"),                                    icon: Car },
        { label: "Vues totales",      value: (data?.stats.total_vues ?? 0).toLocaleString("fr-FR"),                     icon: TrendingUp },
        { label: "Rendez-vous",       value: (data?.rdv.total_rdv ?? 0).toLocaleString("fr-FR"),                        icon: CalendarCheck },
        { label: "Revenus du mois",   value: Number(data?.stats.total_revenus ?? 0).toLocaleString("fr-FR") + " FCFA",  icon: BarChart3 },
    ]

    // ── KPIs Auto-école (dérivés de la liste formations) ─────────────────────
    const formationsActives     = formations.filter(f => f.statut_validation === "validé").length
    const totalInscriptions     = formations.reduce((sum, f) => sum + (f.inscriptions_count ?? 0), 0)
    const totalRevenus          = formations.reduce((sum, f) => sum + (f.prix ?? 0) * (f.inscriptions_count ?? 0), 0)

    const autoEcoleStats = [
        { label: "Formations actives",  value: formationsActives.toString(),                         icon: BookOpen },
        { label: "Inscriptions totales",value: totalInscriptions.toLocaleString("fr-FR"),            icon: Users },
        { label: "Permis proposés",     value: new Set(formations.map(f => f.type_permis)).size.toString(), icon: GraduationCap },
        { label: "Revenus estimés",     value: totalRevenus.toLocaleString("fr-FR") + " FCFA",       icon: BarChart3 },
    ]

    const stats = isAutoEcole ? autoEcoleStats : concessStats

    return (
        <FadeIn className="space-y-6">
            <SlideIn direction="left">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        {isAutoEcole
                            ? "Bienvenue sur votre espace auto-école."
                            : "Bienvenue sur votre espace concessionnaire."}
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
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading
                                ? <Skeleton className="h-8 w-24 mt-1" />
                                : <div className="text-2xl font-bold">{stat.value}</div>
                            }
                        </CardContent>
                    </Card>
                    </StaggerItem>
                ))}
            </StaggerList>

            {/* Blocs secondaires selon le rôle */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Activité récente</CardTitle>
                        <CardDescription>Dernières actions sur votre espace</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : !isAutoEcole && (data?.rdv.rdv_recents?.length ?? 0) > 0 ? (
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {data!.rdv.rdv_recents.slice(0, 3).map((rdv) => (
                                    <li key={rdv.id} className="flex justify-between">
                                        <span>RDV — {rdv.client?.fullname ?? "Client"}</span>
                                        <span className="text-xs opacity-60 capitalize">{rdv.post_type}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : isAutoEcole && formations.length > 0 ? (
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {formations.slice(0, 3).map((f) => (
                                    <li key={f.id} className="flex justify-between">
                                        <span>Permis {f.type_permis} — {f.description?.titre ?? "Formation"}</span>
                                        <span className="text-xs opacity-60">
                                            {f.inscriptions_count ?? 0} inscrits
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Aucune activité récente pour le moment.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{isAutoEcole ? "Mes formations" : "Top véhicules"}</CardTitle>
                        <CardDescription>
                            {isAutoEcole
                                ? "Formations avec le plus d'inscrits"
                                : "Les plus consultés sur la plateforme"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : isAutoEcole ? (
                            formations.length > 0 ? (
                                <ul className="space-y-2 text-sm">
                                    {[...formations]
                                        .sort((a, b) => (b.inscriptions_count ?? 0) - (a.inscriptions_count ?? 0))
                                        .slice(0, 3)
                                        .map((f) => (
                                            <li key={f.id} className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Permis {f.type_permis} — {f.prix?.toLocaleString("fr-FR")} FCFA
                                                </span>
                                                <span className="font-medium">{f.inscriptions_count ?? 0} inscrits</span>
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">Aucune formation publiée.</p>
                            )
                        ) : (
                            (data?.top_vehicule_vues.my_top_vehicle_most_vues?.length ?? 0) > 0 ? (
                                <ul className="space-y-2 text-sm">
                                    {data!.top_vehicule_vues.my_top_vehicle_most_vues.slice(0, 3).map((v) => (
                                        <li key={v.id} className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {v.description?.marque} {v.description?.modele}
                                            </span>
                                            <span className="font-medium">{v.views_count} vues</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">Aucun véhicule publié.</p>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </FadeIn>
    )
}
