"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { MessageSquare, Loader2, HeadphonesIcon, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { getAdminTickets, repondreTicket } from "@/src/actions/support.actions"
import type { SupportTicket } from "@/src/types"

/** Couleurs et labels pour les statuts */
const STATUT_CONFIG: Record<SupportTicket["statut"], { label: string; className: string }> = {
    ouvert:   { label: "Ouvert",    className: "bg-blue-100 text-blue-700 border-blue-200" },
    en_cours: { label: "En cours",  className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    "résolu": { label: "Résolu",    className: "bg-green-100 text-green-700 border-green-200" },
    "fermé":  { label: "Fermé",     className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
}

/** Couleurs et labels pour les priorités */
const PRIORITE_CONFIG: Record<SupportTicket["priorite"], { label: string; className: string }> = {
    basse:    { label: "Basse",    className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    normale:  { label: "Normale",  className: "bg-blue-100 text-blue-700 border-blue-200" },
    haute:    { label: "Haute",    className: "bg-amber-100 text-amber-700 border-amber-200" },
    urgente:  { label: "Urgente",  className: "bg-red-100 text-red-700 border-red-200" },
}

const DEFAULT_STATUT_CONFIG = { label: "Statut inconnu", className: "bg-zinc-100 text-zinc-500 border-zinc-200" }
const DEFAULT_PRIORITE_CONFIG = { label: "Priorité inconnue", className: "bg-zinc-100 text-zinc-500 border-zinc-200" }

function normalizeValue(value: string) {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function resolveStatutConfig(statut: unknown) {
    if (typeof statut !== "string") return DEFAULT_STATUT_CONFIG

    switch (normalizeValue(statut)) {
        case "ouvert":
            return STATUT_CONFIG.ouvert
        case "en_cours":
        case "encours":
            return STATUT_CONFIG.en_cours
        case "resolu":
            return STATUT_CONFIG["résolu"]
        case "ferme":
            return STATUT_CONFIG["fermé"]
        default:
            return DEFAULT_STATUT_CONFIG
    }
}

function resolvePrioriteConfig(priorite: unknown) {
    if (typeof priorite !== "string") return DEFAULT_PRIORITE_CONFIG

    switch (normalizeValue(priorite)) {
        case "basse":
            return PRIORITE_CONFIG.basse
        case "normale":
            return PRIORITE_CONFIG.normale
        case "haute":
            return PRIORITE_CONFIG.haute
        case "urgente":
            return PRIORITE_CONFIG.urgente
        default:
            return DEFAULT_PRIORITE_CONFIG
    }
}

/** Tabs disponibles : valeur → label affiché + filtre API */
const TABS = [
    { value: "tous", label: "Tous", filtre: undefined },
    { value: "ouvert", label: "Ouverts", filtre: "ouvert" },
    { value: "en_cours", label: "En cours", filtre: "en_cours" },
    { value: "resolu", label: "Résolus", filtre: "résolu" },
    { value: "ferme", label: "Fermés", filtre: "fermé" },
] as const

/** Formate une date en relatif court ("il y a 5 min") */
function timeAgo(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

function TableSkeleton() {
    return (
        <>
            {[1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 rounded-lg" /></TableCell>
                </TableRow>
            ))}
        </>
    )
}

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState<typeof TABS[number]["value"]>("tous")
    const [selected, setSelected] = useState<SupportTicket | null>(null)
    const [reponse, setReponse] = useState("")
    const [sending, setSending] = useState(false)

    const fetchTickets = useCallback(async () => {
        setLoading(true)
        const tab = TABS.find(t => t.value === activeTab)
        try {
            const res = await getAdminTickets(tab?.filtre)
            setTickets(res.data ?? [])
        } catch {
            toast.error("Impossible de charger les tickets")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [activeTab])

    useEffect(() => { fetchTickets() }, [fetchTickets])

    const handleRefresh = () => { setRefreshing(true); fetchTickets() }

    const openSheet = (ticket: SupportTicket) => {
        setSelected(ticket)
        setReponse(ticket.reponse_admin ?? "")
    }

    const closeSheet = () => {
        setSelected(null)
        setReponse("")
    }

    const handleRepondre = async () => {
        if (!selected || !reponse.trim()) return

        setSending(true)
        try {
            await repondreTicket(selected.id, reponse.trim())
            setTickets(prev =>
                prev.map(t =>
                    t.id === selected.id
                        ? { ...t, reponse_admin: reponse.trim(), statut: "résolu" as const }
                        : t
                )
            )
            toast.success("Réponse envoyée")
            closeSheet()
        } catch {
            toast.error("Impossible d'envoyer la réponse")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
                        <HeadphonesIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">Support</h1>
                        <p className="text-sm text-muted-foreground">Gérez les demandes d&apos;aide des utilisateurs</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50 shrink-0"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
                <TabsList className="h-9">
                    {TABS.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="border border-border/60 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="text-xs font-semibold">Utilisateur</TableHead>
                            <TableHead className="text-xs font-semibold">Sujet</TableHead>
                            <TableHead className="text-xs font-semibold">Priorité</TableHead>
                            <TableHead className="text-xs font-semibold">Statut</TableHead>
                            <TableHead className="text-xs font-semibold">Date</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableSkeleton />
                        ) : tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-3">
                                        <MessageSquare className="h-8 w-8 opacity-20" />
                                        <p className="text-sm">Aucun ticket dans cette catégorie</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map(ticket => {
                                const statutCfg = resolveStatutConfig(ticket.statut)
                                const prioriteCfg = resolvePrioriteConfig(ticket.priorite)

                                return (
                                    <TableRow key={ticket.id} className="hover:bg-muted/20">
                                        <TableCell>
                                            <div>
                                                <p className="text-sm font-medium">{ticket.user?.fullname ?? "—"}</p>
                                                <p className="text-xs text-muted-foreground">{ticket.user?.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm max-w-[280px] truncate">{ticket.sujet}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`border text-xs ${prioriteCfg.className}`}>
                                                {prioriteCfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`border text-xs ${statutCfg.className}`}>
                                                {statutCfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {timeAgo(ticket.created_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1.5 cursor-pointer"
                                                onClick={() => openSheet(ticket)}
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                Répondre
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Sheet open={!!selected} onOpenChange={open => { if (!open) closeSheet() }}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            Répondre au ticket
                        </SheetTitle>
                    </SheetHeader>

                    {selected && (
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-muted/40 space-y-1">
                                <p className="text-sm font-semibold">{selected.user?.fullname ?? "Utilisateur inconnu"}</p>
                                <p className="text-xs text-muted-foreground">{selected.user?.email}</p>
                                {selected.user?.role && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                        {selected.user.role}
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sujet</p>
                                    <p className="text-sm font-medium">{selected.sujet}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className={`border text-xs ${resolvePrioriteConfig(selected.priorite).className}`}>
                                            {resolvePrioriteConfig(selected.priorite).label}
                                        </Badge>
                                        <Badge className={`border text-xs ${resolveStatutConfig(selected.statut).className}`}>
                                            {resolveStatutConfig(selected.statut).label}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{timeAgo(selected.created_at)}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</p>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-3">
                                        {selected.message}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reponse-admin">
                                    Votre réponse
                                    {selected.reponse_admin && (
                                        <span className="ml-1 text-muted-foreground font-normal">(déjà répondu — vous pouvez modifier)</span>
                                    )}
                                </Label>
                                <Textarea
                                    id="reponse-admin"
                                    value={reponse}
                                    onChange={e => setReponse(e.target.value)}
                                    placeholder="Rédigez votre réponse à l'utilisateur..."
                                    rows={6}
                                    disabled={sending}
                                    className="resize-none"
                                />
                            </div>

                            <Button
                                onClick={handleRepondre}
                                disabled={sending || !reponse.trim()}
                                className="w-full cursor-pointer"
                            >
                                {sending
                                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours…</>
                                    : "Envoyer la réponse"
                                }
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
