"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    ScrollText,
    ChevronLeft,
    ChevronRight,
    Info,
    Eye,
    RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { getLogs } from "@/src/actions/admin.actions"
import { PaginatedResponse } from "@/src/types"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface LogEntry {
    id: string
    action: string
    cible_type: "utilisateur" | "vehicule" | "signalement" | string
    id_cible: string
    details?: string
    date_action: string
    admin?: { id: number; fullname: string }
}

// Mappage action → libellé lisible + couleur sémantique (thème clair)
const ACTION_MAP: Record<string, { label: string; class: string }> = {
    VALIDATE_VEHICLE: { label: "Véhicule validé", class: "bg-green-100 text-green-700 border-green-200" },
    REJECT_VEHICLE: { label: "Véhicule rejeté", class: "bg-red-100 text-red-700 border-red-200" },
    SUSPEND_USER: { label: "Suspension", class: "bg-orange-100 text-orange-700 border-orange-200" },
    BAN_USER: { label: "Bannissement", class: "bg-red-100 text-red-700 border-red-200" },
    RESTORE_USER: { label: "Restauration", class: "bg-blue-100 text-blue-700 border-blue-200" },
    VALIDATE_ACCOUNT: { label: "Compte validé", class: "bg-green-100 text-green-700 border-green-200" },
    HANDLE_SIGNALEMENT: { label: "Signalement traité", class: "bg-primary/15 text-primary border-primary/25" },
}

const CIBLE_ROUTES: Record<string, string> = {
    vehicule: "/admin/vehicules",
    utilisateur: "/admin/users",
    signalement: "/admin/signalements",
}

// Badge pour le type de ressource ciblée
const CIBLE_MAP: Record<string, string> = {
    utilisateur: "bg-blue-100 text-blue-700 border-blue-200",
    vehicule: "bg-primary/15 text-primary border-primary/25",
    signalement: "bg-orange-100 text-orange-700 border-orange-200",
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [filterType, setFilterType] = useState("all")

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = { page: String(page) }
            if (filterType !== "all") params["cible_type"] = filterType

            // getLogs() accepte des params optionnels — pagination gérée côté backend
            // TODO: créer action getLogsPagines si la pagination serveur est nécessaire
            // Actuellement getLogs retourne AdminLog[] sans pagination — l'adapter si besoin
            const res = await getLogs(params)
            if (res.data) {
                // Le backend retourne un objet paginé Laravel : { data: [...], total, last_page }
                const paginated = res.data as unknown as { data: LogEntry[]; total: number; last_page: number }
                const items = Array.isArray(paginated.data) ? paginated.data : (Array.isArray(res.data) ? res.data as unknown as LogEntry[] : [])
                setLogs(items)
                setTotalPages(paginated.last_page ?? 1)
                setTotal(paginated.total ?? items.length)
            }
        } catch {
            toast.error("Impossible de charger le journal")
        } finally {
            setLoading(false)
        }
    }, [page, filterType])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    const handleRefresh = () => { setRefreshing(true); fetchLogs() }

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Journal de modération</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Historique complet des actions administrateur — {total} entrée(s)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50 shrink-0"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <div className="p-2 rounded-lg bg-secondary">
                        <ScrollText className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </div>

            <div>
                <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1) }}>
                    <SelectTrigger className="w-45">
                        <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="utilisateur">Utilisateurs</SelectItem>
                        <SelectItem value="vehicule">Véhicules</SelectItem>
                        <SelectItem value="signalement">Signalements</SelectItem>
                        <SelectItem value="formation">Formation</SelectItem>
                        <SelectItem value="abonnements">Abonnements</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tableau des logs */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Date</TableHead>
                                <TableHead>Administrateur</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Cible</TableHead>
                                <TableHead>ID cible</TableHead>
                                <TableHead>Détails</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(10)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        Aucune entrée dans le journal
                                    </TableCell>
                                </TableRow>
                            ) : logs.map((log) => {
                                const actionConfig = ACTION_MAP[log.action]
                                const route = CIBLE_ROUTES[log.cible_type]  
                                const cibleClass = CIBLE_MAP[log.cible_type] ?? "bg-secondary text-secondary-foreground"

                                return (
                                    <TableRow key={log.id} className="hover:bg-muted/40">
                                        {/* Date + heure sur deux lignes */}
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(log.date_action).toLocaleDateString("fr-FR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                            <br />
                                            <span className="font-mono text-[10px]">
                                                {new Date(log.date_action).toLocaleTimeString("fr-FR", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-sm font-medium">
                                            {log.admin?.fullname ?? "—"}
                                        </TableCell>

                                        <TableCell>
                                            <Badge className={`text-xs ${actionConfig?.class ?? "bg-secondary text-secondary-foreground"}`}>
                                                {actionConfig?.label ?? log.action}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <Badge className={`text-xs ${cibleClass}`}>
                                                {log.cible_type}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            #{log.id_cible}
                                        </TableCell>

                                        <TableCell className="max-w-50 space-y-1">
                                            {log.details && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex items-center gap-1 text-xs text-muted-foreground cursor-help truncate">
                                                                <Info className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">{log.details}</span>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs text-sm" side="left">
                                                            {log.details}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            {route && (
                                                <Link href={`${route}?open=${log.id_cible}`} className="text-xs text-primary underline underline-offset-2">
                                                    Voir le détail
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Page {page} sur {totalPages} — {total} entrées au total</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
