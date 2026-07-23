"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    Car,
    Users,
    ShieldAlert,
    ScrollText,
    CheckCircle2,
    Clock,
    Activity,
    UserCheck,
    RefreshCw,
} from "lucide-react"
import { getUsersPaginated, getVehiculesEnAttente, getSignalementsPaginated, getLogs } from "@/src/actions/admin.actions"
import { PaginatedResponse } from "@/src/types"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

// Types locaux pour les données admin non encore dans src/types/index.ts
interface AdminUser {
    id: number
    fullname: string
    email: string
    role: string
    statut: string
    created_at: string
}

interface AdminVehicule {
    id: string
    status_validation: string
    description?: { marque: string; modele: string; annee: number }
    creator?: { fullname: string }
    created_at: string
}

interface Signalement {
    id: string
    statut: string
    type: string
    date_signalement: string
    client?: { fullname: string }
}

interface LogEntry {
    id: string
    action: string
    cible_type: string
    id_cible: string
    details?: string
    date_action: string
    admin?: { fullname: string }
}

// Badge coloré selon le type d'action de modération
function ActionBadge({ action }: { action: string }) {
    const map: Record<string, { label: string; class: string }> = {
        VALIDATE_VEHICLE:     { label: "Véhicule validé",        class: "bg-green-100 text-green-700 border-green-200" },
        REJECT_VEHICLE:       { label: "Véhicule rejeté",        class: "bg-red-100 text-red-700 border-red-200" },
        SUSPEND_VEHICLE:      { label: "Véhicule suspendu",      class: "bg-amber-100 text-amber-700 border-amber-200" },
        DELETE_VEHICLE:       { label: "Véhicule supprimé",      class: "bg-red-100 text-red-700 border-red-200" },
        RESTORE_VEHICLE:      { label: "Véhicule restauré",      class: "bg-blue-100 text-blue-700 border-blue-200" },
        FORCE_DELETE_VEHICLE: { label: "Suppression définitive", class: "bg-zinc-900 text-white border-zinc-900" },
        SUSPEND_USER:         { label: "Utilisateur suspendu",   class: "bg-amber-100 text-amber-700 border-amber-200" },
        BAN_USER:             { label: "Utilisateur banni",      class: "bg-red-100 text-red-700 border-red-200" },
        RESTORE_USER:         { label: "Utilisateur restauré",   class: "bg-blue-100 text-blue-700 border-blue-200" },
        VALIDATE_ACCOUNT:     { label: "Compte validé",          class: "bg-green-100 text-green-700 border-green-200" },
        HANDLE_SIGNALEMENT:   { label: "Signalement traité",     class: "bg-primary/15 text-primary border-primary/25" },
        VALIDATE_FORMATION:   { label: "Formation validée",      class: "bg-green-100 text-green-700 border-green-200" },
        REJECT_FORMATION:     { label: "Formation rejetée",      class: "bg-red-100 text-red-700 border-red-200" },
    }
    const config = map[action] ?? { label: action, class: "bg-secondary text-secondary-foreground" }
    return <Badge className={`text-xs ${config.class}`}>{config.label}</Badge>
}

export default function AdminDashboard() {
    const [loadingUsers, setLoadingUsers]         = useState(true)
    const [loadingVehicules, setLoadingVehicules] = useState(true)
    const [loadingSignal, setLoadingSignal]       = useState(true)
    const [loadingLogs, setLoadingLogs]           = useState(true)
    const [refreshing, setRefreshing]             = useState(false)

    const [totalUsers, setTotalUsers]                 = useState(0)
    const [pendingVehicules, setPendingVehicules]     = useState(0)
    const [pendingSignal, setPendingSignal]           = useState(0)
    const [pendingPartenaires, setPendingPartenaires] = useState(0)
    const [recentLogs, setRecentLogs]                 = useState<LogEntry[]>([])

    /**
     * Charge toutes les données du tableau de bord admin en parallèle.
     * Réinitialisé les états de chargement à chaque appel pour permettre le rafraîchissement manuel.
     */
    const fetchAll = useCallback(() => {
        setLoadingUsers(true)
        setLoadingVehicules(true)
        setLoadingSignal(true)
        setLoadingLogs(true)

        getUsersPaginated({ page: "1" })
            .then(r => { if (r.data) setTotalUsers(r.data.total) })
            .finally(() => setLoadingUsers(false))

        // Compter les demandes partenaires en attente de validation
        getUsersPaginated({ statut: "en_attente", page: "1" })
            .then(r => { if (r.data) setPendingPartenaires(r.data.total) })

        getVehiculesEnAttente()
            .then(r => { if (r.data) setPendingVehicules(r.data.length) })
            .finally(() => setLoadingVehicules(false))

        // getSignalementsPaginated retourne une réponse paginée — on lit .total
        getSignalementsPaginated({ statut: "en_attente" })
            .then(r => { if (r.data) setPendingSignal((r.data as unknown as { total: number }).total) })
            .finally(() => setLoadingSignal(false))

        // getLogs() retourne une réponse paginée — les logs sont dans r.data.data
        getLogs()
            .then(r => {
                const logs = (r.data as unknown as { data: LogEntry[] })?.data ?? (r.data as unknown as LogEntry[])
                if (Array.isArray(logs)) setRecentLogs(logs.slice(0, 5))
            })
            .finally(() => {
                setLoadingLogs(false)
                setRefreshing(false)
            })
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchAll()
    }

    const stats = [
        {
            label: "Utilisateurs",
            value: totalUsers,
            icon: Users,
            loading: loadingUsers,
            iconColor: "text-blue-600",
            iconBg: "bg-blue-50",
        },
        {
            label: "Véhicules en attente",
            value: pendingVehicules,
            icon: Car,
            loading: loadingVehicules,
            iconColor: "text-primary",
            iconBg: "bg-primary/10",
            urgent: pendingVehicules > 0,
        },
        {
            label: "Signalements ouverts",
            value: pendingSignal,
            icon: ShieldAlert,
            loading: loadingSignal,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-50",
            urgent: pendingSignal > 0,
        },
        {
            label: "Demandes partenaires",
            value: pendingPartenaires,
            icon: UserCheck,
            loading: loadingUsers,
            iconColor: "text-yellow-600",
            iconBg: "bg-yellow-50",
            urgent: pendingPartenaires > 0,
        },
        {
            label: "Actions récentes",
            value: recentLogs.length,
            icon: ScrollText,
            loading: loadingLogs,
            iconColor: "text-purple-600",
            iconBg: "bg-purple-50",
        },
    ]

    return (
        <FadeIn>
        <div className="space-y-6">
            {/* En-tête */}
            <SlideIn direction="left">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Tableau de bord de modération — Move CI
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

            {/* Cartes de statistiques */}
            <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <StaggerItem key={stat.label}>
                    <Card
                        className={`relative overflow-hidden ${stat.urgent ? "ring-1 ring-primary/50" : ""}`}
                    >
                        {stat.urgent && (
                            // Point animé pour attirer l'attention sur ce qui est urgent
                            <span className="absolute top-3 right-3 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                            </span>
                        )}
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                                </div>
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.label}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {stat.loading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                <span className="text-3xl font-bold tabular-nums">
                                    {stat.value}
                                </span>
                            )}
                        </CardContent>
                    </Card>
                    </StaggerItem>
                ))}
            </StaggerList>

            <Separator />

            {/* Journal de modération récent */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold">Activité récente</h2>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {loadingLogs ? (
                            <div className="p-4 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="h-4 w-4 rounded-full" />
                                        <Skeleton className="h-4 flex-1" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : recentLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <CheckCircle2 className="h-8 w-8 mb-2 text-green-600" />
                                <p className="text-sm">Aucune action récente</p>
                            </div>
                        ) : (
                            <StaggerList className="divide-y">
                                {recentLogs.map((log) => (
                                    <StaggerItem key={log.id}>
                                    <div
                                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <ActionBadge action={log.action} />
                                            <span className="text-sm text-muted-foreground truncate">
                                                par{" "}
                                                <span className="text-foreground font-medium">
                                                    {log.admin?.fullname ?? "Admin"}
                                                </span>
                                                {log.details && ` — ${log.details}`}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {new Date(log.date_action).toLocaleDateString("fr-FR", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    </StaggerItem>
                                ))}
                            </StaggerList>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Actions rapides */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold">Actions prioritaires</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a href="/admin/vehicules">
                        <Card className="hover:shadow-sm transition-shadow cursor-pointer group">
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Car className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                        Valider les annonces
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {pendingVehicules} véhicule(s) en attente
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="/admin/signalements">
                        <Card className="hover:shadow-sm transition-shadow cursor-pointer group">
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="p-2 rounded-lg bg-amber-50">
                                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium group-hover:text-amber-600 transition-colors">
                                        Traiter les signalements
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {pendingSignal} signalement(s) ouvert(s)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="/admin/users?statut=en_attente">
                        <Card className={`hover:shadow-sm transition-shadow cursor-pointer group ${pendingPartenaires > 0 ? "ring-1 ring-yellow-300" : ""}`}>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="p-2 rounded-lg bg-yellow-50">
                                    <UserCheck className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium group-hover:text-yellow-600 transition-colors">
                                        Valider les partenaires
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {pendingPartenaires} demande(s) en attente
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                </div>
            </div>
        </div>
        </FadeIn>
    )
}
