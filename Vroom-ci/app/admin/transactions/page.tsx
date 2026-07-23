"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    RefreshCw, ArrowLeftRight, CheckCircle2, Clock,
    XCircle, User, Car, Tag, KeyRound, CalendarDays,
    TrendingUp, Wallet, AlertCircle,
} from "lucide-react"
import { getAdminTransactions } from "@/src/actions/admin.actions"
import { TransactionConclue } from "@/src/types"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"


interface AdminTransaction extends Omit<TransactionConclue, 'vehicule'> {
    vendeur?: { id: string; fullname: string; email: string; role: string }
    client?:  { id: string; fullname: string; email: string }
    vehicule?: {
        description?: { marque?: string; modele?: string; annee?: number }
    }
}

interface PaginatedTransactions {
    data: AdminTransaction[]
    total: number
    per_page: number
    current_page: number
    last_page: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statutConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    en_attente: { label: "En attente",  className: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock },
    confirmé:   { label: "Confirmée",   className: "bg-green-100 text-green-700 border-green-200",   icon: CheckCircle2 },
    expiré:     { label: "Expirée",     className: "bg-zinc-100 text-zinc-500 border-zinc-200",      icon: AlertCircle },
    refusé:     { label: "Refusée",     className: "bg-red-100 text-red-600 border-red-200",         icon: XCircle },
}

const formatDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: fr })
const formatMontant = (n: number | null) =>
    n != null ? n.toLocaleString("fr-FR") + " FCFA" : "—"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<AdminTransaction[]>([])
    const [total, setTotal]               = useState(0)
    const [loading, setLoading]           = useState(true)
    const [refreshing, setRefreshing]     = useState(false)

    // Filtres
    const [filtreStatut, setFiltreStatut] = useState("tous")
    const [filtreType,   setFiltreType]   = useState("tous")

    const fetchData = useCallback(async () => {
        try {
            const params: Record<string, string> = {}
            if (filtreStatut !== "tous") params.statut = filtreStatut
            if (filtreType   !== "tous") params.type   = filtreType

            const res = await getAdminTransactions(params)
            const paginated = res.data as unknown as PaginatedTransactions
            setTransactions(paginated?.data ?? [])
            setTotal(paginated?.total ?? 0)
        } catch {
            toast.error("Impossible de charger les transactions")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [filtreStatut, filtreType])

    useEffect(() => { fetchData() }, [fetchData])

    const handleRefresh = () => { setRefreshing(true); fetchData() }

    // ── KPIs dérivés ─────────────────────────────────────────────────────────
    const nbConfirmees  = transactions.filter(t => t.statut === "confirmé").length
    const nbEnAttente   = transactions.filter(t => t.statut === "en_attente").length
    const totalRevenus  = transactions
        .filter(t => t.statut === "confirmé" && t.type === "vente")
        .reduce((sum, t) => sum + (Number(t.prix_final) || 0), 0)

    const kpis = [
        { label: "Total",        value: total,        icon: ArrowLeftRight, color: "bg-zinc-100 text-zinc-700" },
        { label: "Confirmées",   value: nbConfirmees,  icon: CheckCircle2,   color: "bg-green-100 text-green-700" },
        { label: "En attente",   value: nbEnAttente,   icon: Clock,          color: "bg-amber-100 text-amber-700" },
        { label: "CA ventes",    value: formatMontant(totalRevenus), icon: Wallet, color: "bg-blue-100 text-blue-700" },
    ]

    return (
        <FadeIn>
        <div className="space-y-6">
            {/* Header */}
            <SlideIn direction="left">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
                    <p className="text-sm text-muted-foreground">
                        Suivi de toutes les transactions conclues sur la plateforme
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
            <StaggerList className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpis.map(k => (
                    <StaggerItem key={k.label}>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", k.color)}>
                                <k.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{k.value}</p>
                                <p className="text-xs text-muted-foreground">{k.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                    </StaggerItem>
                ))}
            </StaggerList>

            <Separator />

            {/* Filtres */}
            <div className="flex gap-3 flex-wrap">
                <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                    <SelectTrigger className="w-40 rounded-lg text-sm">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tous">Tous les statuts</SelectItem>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="confirmé">Confirmée</SelectItem>
                        <SelectItem value="expiré">Expirée</SelectItem>
                        <SelectItem value="refusé">Refusée</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filtreType} onValueChange={setFiltreType}>
                    <SelectTrigger className="w-36 rounded-lg text-sm">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tous">Tous les types</SelectItem>
                        <SelectItem value="vente">Vente</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
            ) : transactions.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-medium">Aucune transaction</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Aucune transaction ne correspond aux filtres sélectionnés.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <StaggerList className="space-y-3">
                    {transactions.map(tx => {
                        const cfg = statutConfig[tx.statut] ?? statutConfig["en_attente"]
                        const Icon = cfg.icon
                        return (
                            <StaggerItem key={tx.id}>
                            <Card className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">

                                        {/* Statut + type */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={cn("gap-1 rounded-full text-xs", cfg.className)}>
                                                <Icon className="h-3 w-3" />
                                                {cfg.label}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full text-xs gap-1">
                                                {tx.type === "vente"
                                                    ? <><Tag className="h-3 w-3" /> Vente</>
                                                    : <><KeyRound className="h-3 w-3" /> Location</>
                                                }
                                            </Badge>
                                        </div>

                                        {/* Véhicule */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-sm font-medium truncate">
                                                {tx.vehicule?.description?.marque} {tx.vehicule?.description?.modele}
                                                {tx.vehicule?.description?.annee && ` (${tx.vehicule.description.annee})`}
                                            </span>
                                        </div>

                                        {/* Vendeur → Client */}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                                            <User className="h-3.5 w-3.5" />
                                            <span className="font-medium text-foreground">{tx.vendeur?.fullname ?? "—"}</span>
                                            <ArrowLeftRight className="h-3.5 w-3.5" />
                                            <span className="font-medium text-foreground">{tx.client?.fullname ?? "—"}</span>
                                        </div>

                                        {/* Prix + date */}
                                        <div className="flex items-center gap-4 text-sm shrink-0">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <TrendingUp className="h-3.5 w-3.5" />
                                                <span className="font-semibold text-foreground">
                                                    {formatMontant(tx.prix_final)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                <span>{formatDate(tx.created_at)}</span>
                                            </div>
                                        </div>

                                        {/* Confirmations */}
                                        <div className="flex gap-2 shrink-0">
                                            <Badge variant="outline" className={cn(
                                                "text-xs rounded-full",
                                                tx.confirme_par_vendeur
                                                    ? "border-green-300 text-green-700"
                                                    : "border-zinc-200 text-zinc-400"
                                            )}>
                                                {tx.confirme_par_vendeur ? "✓" : "○"} Vendeur
                                            </Badge>
                                            <Badge variant="outline" className={cn(
                                                "text-xs rounded-full",
                                                tx.confirme_par_client
                                                    ? "border-green-300 text-green-700"
                                                    : "border-zinc-200 text-zinc-400"
                                            )}>
                                                {tx.confirme_par_client ? "✓" : "○"} Client
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Dates de location si applicable */}
                                    {tx.type === "location" && tx.date_debut_location && (
                                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex gap-3">
                                            <span>Du {formatDate(tx.date_debut_location)}</span>
                                            <span>au {tx.date_fin_location ? formatDate(tx.date_fin_location) : "—"}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            </StaggerItem>
                        )
                    })}
                </StaggerList>
            )}
        </div>
        </FadeIn>
    )
}
