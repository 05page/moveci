"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { HelpCircle, Loader2, MessageSquare, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { getMesTickets, soumettreTicket } from "@/src/actions/support.actions"
import type { SupportTicket } from "@/src/types"


/** Couleurs et labels pour chaque statut de ticket */
const STATUT_CONFIG: Record<SupportTicket["statut"], { label: string; className: string }> = {
    "ouvert":   { label: "Ouvert",    className: "bg-blue-100 text-blue-700 border-blue-200" },
    "en_cours": { label: "En cours",  className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    "résolu": { label: "Résolu",    className: "bg-green-100 text-green-700 border-green-200" },
    "fermé":  { label: "Fermé",     className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
}

/** Couleurs pour les niveaux de priorité */
const PRIORITE_CONFIG: Record<SupportTicket["priorite"], { label: string; className: string }> = {
    basse:    { label: "Basse",    className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    normale:  { label: "Normale",  className: "bg-blue-100 text-blue-700 border-blue-200" },
    haute:    { label: "Haute",    className: "bg-orange-100 text-orange-700 border-orange-200" },
    urgente:  { label: "Urgente",  className: "bg-red-100 text-red-700 border-red-200" },
}

/** Formate une date en relatif lisible ("il y a 2 heures") */
function timeAgo(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

function TicketsSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map(i => (
                <div key={i} className="p-4 border border-border/60 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                </div>
            ))}
        </div>
    )
}

export default function AideContent() {
    const [sujet, setSujet]       = useState("")
    const [message, setMessage]   = useState("")
    const [priorite, setPriorite] = useState<string>("normale")
    const [sending, setSending]   = useState(false)
    const [tickets, setTickets]       = useState<SupportTicket[]>([])
    const [loadingTickets, setLoadingTickets] = useState(true)

    useEffect(() => {
        getMesTickets()
            .then(res => {
                setTickets((res.data as unknown as { data: SupportTicket[] })?.data ?? [])
            })
            .catch(() => toast.error("Impossible de charger vos demandes"))
            .finally(() => setLoadingTickets(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation minimale côté client
        if (!sujet.trim()) {
            toast.error("Veuillez saisir un sujet")
            return
        }
        if (message.trim().length < 20) {
            toast.error("Le message doit contenir au moins 20 caractères")
            return
        }

        setSending(true)
        try {
            const res = await soumettreTicket({ sujet: sujet.trim(), message: message.trim(), priorite })
            const newTicket = (res as unknown as { data: SupportTicket })?.data

            if (newTicket) {
                // Ajouter le nouveau ticket en tête de liste sans recharger
                setTickets(prev => [newTicket, ...prev])
            }

            console.log(newTicket);

            toast.success("Votre demande a bien été envoyée")

            // Reset du formulaire
            setSujet("")
            setMessage("")
            setPriorite("normale")
        } catch {
            toast.error("Impossible d'envoyer la demande")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="pt-20 px-4 md:px-6 max-w-3xl mx-auto mb-12 space-y-6">

            <div className="rounded-2xl bg-zinc-900 p-6 md:p-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-white">Centre d&apos;aide</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Posez votre question, notre équipe vous répond rapidement</p>
                </div>
            </div>

            <Card className="border-border/60">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        Soumettre une demande
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Sujet */}
                        <div className="space-y-1.5">
                            <Label htmlFor="sujet">Sujet</Label>
                            <Input
                                id="sujet"
                                value={sujet}
                                onChange={e => setSujet(e.target.value)}
                                placeholder="Décrivez brièvement votre problème"
                                disabled={sending}
                                maxLength={120}
                            />
                        </div>

                        {/* Message */}
                        <div className="space-y-1.5">
                            <Label htmlFor="message">
                                Message
                                <span className="text-muted-foreground font-normal ml-1">(20 caractères min.)</span>
                            </Label>
                            <Textarea
                                id="message"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Expliquez votre situation en détail..."
                                rows={5}
                                disabled={sending}
                                className="resize-none"
                            />
                            {message.length < 20 && message.length > 0 && (
                                <p className="text-xs text-muted-foreground text-right">
                                    {message.length}/20
                                </p>
                            )}
                        </div>

                        {/* Priorité */}
                        <div className="space-y-1.5">
                            <Label htmlFor="priorite">Priorité</Label>
                            <Select value={priorite} onValueChange={setPriorite} disabled={sending}>
                                <SelectTrigger id="priorite">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="basse">Basse — pas urgent</SelectItem>
                                    <SelectItem value="normale">Normale</SelectItem>
                                    <SelectItem value="haute">Haute — bloque mon activité</SelectItem>
                                    <SelectItem value="urgente">Urgente — problème critique</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="submit" disabled={sending} className="w-full sm:w-auto cursor-pointer">
                            {sending
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours…</>
                                : "Envoyer la demande"
                            }
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* ── Liste de mes demandes ────────────────────────────────────── */}
            <Card className="border-border/60">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Mes demandes
                        </CardTitle>
                        {tickets.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{tickets.length}</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingTickets ? (
                        <TicketsSkeleton />
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 opacity-20" />
                            <p className="text-sm">Aucune demande pour l&apos;instant</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tickets.map(ticket => {
                                const statutCfg  = STATUT_CONFIG[ticket.statut]
                                const prioriteCfg = PRIORITE_CONFIG[ticket.priorite]

                                return (
                                    <div
                                        key={ticket.id}
                                        className="p-4 border border-border/60 rounded-xl space-y-2 hover:bg-muted/30 transition-colors"
                                    >
                                        {/* Ligne statut + sujet */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={`border text-xs shrink-0 ${statutCfg.className}`}>
                                                {statutCfg.label}
                                            </Badge>
                                            <Badge className={`border text-xs shrink-0 ${prioriteCfg.className}`}>
                                                {prioriteCfg.label}
                                            </Badge>
                                            <span className="font-medium text-sm">{ticket.sujet}</span>
                                        </div>

                                        {/* Date */}
                                        <p className="text-xs text-muted-foreground">
                                            {timeAgo(ticket.created_at)}
                                        </p>

                                        {/* Message original (tronqué) */}
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {ticket.message}
                                        </p>

                                        {/* Réponse admin — encadré bleu clair */}
                                        {ticket.reponse_admin && (
                                            <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100 space-y-1">
                                                <p className="text-xs font-semibold text-blue-700">
                                                    Réponse de l&apos;équipe Move
                                                    {ticket.repondu_at && (
                                                        <span className="font-normal ml-1 text-blue-500">
                                                            · {timeAgo(ticket.repondu_at)}
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-blue-800 leading-relaxed">
                                                    {ticket.reponse_admin}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
