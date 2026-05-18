"use client"

import React, { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { cn } from "@/src/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    CalendarDays, Clock, Car, Phone,
    CheckCircle2, XCircle, CalendarIcon,
    ChevronDown, ChevronUp, Check, X, ClipboardCheck,
    RefreshCw,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { addDays } from "date-fns"
import { type DateRange } from "react-day-picker"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { RendezVous, TransactionConclue } from "@/src/types"
import { getNosRdv, confirmerRdv, refuserRdv, annulerRdv, terminerRdv } from "@/src/actions/rdv.actions"
import { getMesTransactions, confirmerVendeur } from "@/src/actions/transactions.actions"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

const CARD = "rounded-xl shadow-none border border-zinc-200 bg-white hover:shadow-sm transition-all"

const TYPE_LABELS: Record<string, string> = {
    visite: "Visite",
    essai_routier: "Essai routier",
    premiere_rencontre: "Première rencontre",
}

// Formate un datetime ISO en date lisible : "25 fév. 2026"
const formatDate = (dt: string) => format(new Date(dt), "d MMM yyyy", { locale: fr })
const formatHeure = (dt: string) => format(new Date(dt), "HH:mm")

export default function RdvPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [openCalendar, setOpenCalendar] = useState(false)
    const [rdvList, setRdvList] = useState<RendezVous[]>([])
    // Suivi de l'action en cours par rdv (confirmer/refuser/annuler/terminer)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Transactions en attente de confirmation vendeur
    const [transactions, setTransactions] = useState<TransactionConclue[]>([])

    // Dialog "Finaliser la transaction"
    const [finaliserOpen, setFinaliserOpen] = useState(false)
    const [finaliserLoading, setFinaliserLoading] = useState(false)
    const [finaliserTransaction, setFinaliserTransaction] = useState<TransactionConclue | null>(null)
    const [finaliserForm, setFinaliserForm] = useState({
        code: "", prix_final: "", date_debut: "", date_fin: "",
    })

    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 30),
    })

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            // Charge RDVs et transactions en parallèle
            const [rdvRes, txRes] = await Promise.all([
                getNosRdv(),
                getMesTransactions(),
            ])
            setRdvList(rdvRes?.data ?? [])
            setTransactions(txRes?.data ?? [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur Serveur")
        } finally {
            setIsLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Recharge quand l'utilisateur revient sur l'onglet
    useRevalidateOnFocus(fetchData)
    // Recharge en temps réel via Reverb quand un RDV ou une transaction change
    useDataRefresh("rdv", fetchData)
    useDataRefresh("transaction", fetchData)

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    // Met à jour le statut d'un RDV localement après une action
    const updateStatut = (id: string, statut: RendezVous["statut"]) => {
        setRdvList(prev => prev.map(r => r.id === id ? { ...r, statut } : r))
    }

    const handleAction = async (
        id: string,
        action: "confirmer" | "refuser" | "annuler" | "terminer",
        nouveauStatut: RendezVous["statut"],
        successMsg: string,
    ) => {
        setActionLoading(id + action)
        try {
            // Appel de l'action correspondante selon le type d'action demandé
            if (action === "confirmer") await confirmerRdv(id)
            else if (action === "refuser") await refuserRdv(id)
            else if (action === "annuler") await annulerRdv(id)
            else if (action === "terminer") await terminerRdv(id)
            updateStatut(id, nouveauStatut)
            toast.success(successMsg)
        } catch {
            toast.error("Une erreur est survenue")
        } finally {
            setActionLoading(null)
        }
    }

    /** Ouvre le dialog de finalisation pour le RDV terminé donné. */
    const openFinaliser = (rdv: RendezVous) => {
        const tx = transactions.find(
            t => t.rendez_vous_id === rdv.id && t.statut === "en_attente"
        )
        if (!tx) {
            toast.info("Aucune transaction en attente pour ce RDV")
            return
        }
        setFinaliserTransaction(tx)
        setFinaliserForm({ code: "", prix_final: "", date_debut: "", date_fin: "" })
        setFinaliserOpen(true)
    }

    /** Soumet la confirmation vendeur avec les infos du deal. */
    const handleFinaliser = async () => {
        if (!finaliserTransaction) return
        if (!finaliserForm.code || finaliserForm.code.length !== 6) {
            toast.error("Le code doit contenir 6 chiffres")
            return
        }
        if (!finaliserForm.prix_final) {
            toast.error("Veuillez renseigner le prix final")
            return
        }
        const isLocation = finaliserTransaction.type === "location"
        if (isLocation && (!finaliserForm.date_debut || !finaliserForm.date_fin)) {
            toast.error("Veuillez renseigner les dates de location")
            return
        }
        setFinaliserLoading(true)
        try {
            await confirmerVendeur(finaliserTransaction.id, {
                code: finaliserForm.code,
                type: finaliserTransaction.type!,
                prix_final: Number(finaliserForm.prix_final),
                ...(isLocation && {
                    date_debut_location: finaliserForm.date_debut,
                    date_fin_location: finaliserForm.date_fin,
                }),
            })
            toast.success("Transaction confirmée ! En attente de la confirmation du client.")
            // Met à jour la transaction localement
            setTransactions(prev =>
                prev.map(t => t.id === finaliserTransaction.id
                    ? { ...t, confirme_par_vendeur: true }
                    : t
                )
            )
            setFinaliserOpen(false)
        } catch (err: unknown) {
            const msg = (err as { data?: { message?: string } })?.data?.message
            toast.error(msg ?? "Code incorrect ou transaction expirée")
        } finally {
            setFinaliserLoading(false)
        }
    }

    const filterRdvs = (tab: string) => {
        if (tab === "a_venir")  return rdvList.filter(r => r.statut === "en_attente" || r.statut === "confirmé")
        if (tab === "passes")   return rdvList.filter(r => r.statut === "terminé")
        if (tab === "annules")  return rdvList.filter(r => r.statut === "annulé" || r.statut === "refusé")
        return rdvList
    }

    const nosStats = [
        { label: "Total",     value: rdvList.length,                         icon: CalendarDays,  color: "bg-zinc-900/10 text-zinc-700" },
        { label: "À venir",   value: filterRdvs("a_venir").length,           icon: Clock,         color: "bg-blue-500/10 text-blue-600" },
        { label: "Effectués", value: filterRdvs("passes").length,            icon: CheckCircle2,  color: "bg-green-500/10 text-green-600" },
        { label: "Annulés",   value: filterRdvs("annules").length,           icon: XCircle,       color: "bg-red-500/10 text-red-600" },
    ]

    if (isLoading) {
        return (
            <div className="pt-20 px-4 md:px-6 max-w-5xl mx-auto mb-16 space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="h-px bg-zinc-100" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-zinc-100">
                            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/5" />
                                <Skeleton className="h-3 w-2/5" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const RdvCard = ({ rdv }: { rdv: RendezVous }) => {
        // Transaction en attente liée à ce RDV (non encore confirmée par le vendeur)
        const txEnAttente = transactions.find(
            t => t.rendez_vous_id === rdv.id && t.statut === "en_attente" && !t.confirme_par_vendeur
        )
        return (
            <Card className={cn(CARD)}>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Bloc date */}
                        <div className="flex md:flex-col items-center gap-2 md:gap-0 md:w-20 shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900/10 text-zinc-700 flex flex-col items-center justify-center text-center">
                                <CalendarIcon className="h-4 w-4 mb-0.5" />
                                <span className="text-[10px] font-bold leading-none">{formatDate(rdv.date_heure).split(" ")[0]}</span>
                            </div>
                            <div className="text-xs text-muted-foreground md:mt-1 md:text-center">
                                <p className="font-medium">{formatDate(rdv.date_heure).split(" ").slice(1).join(" ")}</p>
                                <p>{formatHeure(rdv.date_heure)}</p>
                            </div>
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="rounded-full text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                                    {TYPE_LABELS[rdv.type] ?? rdv.type}
                                </Badge>
                                <Badge className={cn("rounded-full text-xs", {
                                    "bg-amber-500/10 text-amber-600 border-amber-500/20": rdv.statut === "en_attente",
                                    "bg-green-500/10 text-green-600 border-green-500/20": rdv.statut === "confirmé",
                                    "bg-zinc-100 text-zinc-600 border-zinc-200": rdv.statut === "terminé",
                                    "bg-red-500/10 text-red-600 border-red-500/20": rdv.statut === "annulé" || rdv.statut === "refusé",
                                })}>
                                    {rdv.statut === "en_attente" ? "En attente"
                                        : rdv.statut === "confirmé" ? "Confirmé"
                                        : rdv.statut === "terminé" ? "Terminé"
                                        : rdv.statut === "annulé" ? "Annulé"
                                        : "Refusé"}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-zinc-900/10 flex items-center justify-center text-zinc-700 text-xs font-bold shrink-0">
                                    {rdv.client?.fullname?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{rdv.client?.fullname}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Car className="h-3 w-3" /> {rdv.vehicule?.description?.marque} {rdv.vehicule?.description?.modele}
                                    </p>
                                </div>
                            </div>

                            {rdv.client?.telephone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {rdv.client.telephone}
                                </p>
                            )}

                            {rdv.motif && (
                                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 italic">
                                    {rdv.motif}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex md:flex-col gap-2 shrink-0">
                            {rdv.statut === "en_attente" && (
                                <>
                                    <Button
                                        size="sm"
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(rdv.id, "confirmer", "confirmé", "RDV confirmé")}
                                        className="gap-1 cursor-pointer rounded-lg text-xs bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <Check className="h-3 w-3" /> Confirmer
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(rdv.id, "refuser", "refusé", "RDV refusé")}
                                        className="gap-1 cursor-pointer rounded-lg text-xs text-red-500 hover:text-red-600"
                                    >
                                        <X className="h-3 w-3" /> Refuser
                                    </Button>
                                </>
                            )}
                            {rdv.statut === "confirmé" && (
                                <>
                                    <Button
                                        size="sm"
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(rdv.id, "terminer", "terminé", "RDV marqué terminé")}
                                        className="gap-1 cursor-pointer rounded-lg text-xs bg-zinc-900 hover:bg-zinc-700 text-white"
                                    >
                                        <CheckCircle2 className="h-3 w-3" /> Terminer
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!!actionLoading}
                                        onClick={() => handleAction(rdv.id, "annuler", "annulé", "RDV annulé")}
                                        className="gap-1 cursor-pointer rounded-lg text-xs text-red-500 hover:text-red-600"
                                    >
                                        <XCircle className="h-3 w-3" /> Annuler
                                    </Button>
                                </>
                            )}
                            {rdv.statut === "terminé" && txEnAttente && (
                                <Button
                                    size="sm"
                                    onClick={() => openFinaliser(rdv)}
                                    className="gap-1 cursor-pointer rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <ClipboardCheck className="h-3 w-3" /> Finaliser
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="pt-20 px-4 md:px-6 pb-12">
            <FadeIn className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <SlideIn direction="left">
                    <section className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                                    Rendez-vous
                                </h1>
                                <div className="flex items-center gap-3 mt-1.5 text-sm text-zinc-500">
                                    <span>{rdvList.length} au total</span>
                                    <span className="text-zinc-300">·</span>
                                    <span>{filterRdvs("a_venir").length} à venir</span>
                                    <span className="text-zinc-300">·</span>
                                    <span>{filterRdvs("passes").length} terminés</span>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="gap-2 cursor-pointer shrink-0 rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                                {refreshing ? "Chargement..." : "Rafraîchir"}
                            </Button>
                        </div>
                        <div className="h-px bg-zinc-100" />
                    </section>
                </SlideIn>

                {/* Calendrier toggle */}
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <button
                        onClick={() => setOpenCalendar(!openCalendar)}
                        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <CalendarIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-sm text-zinc-900">Calendrier</p>
                                <p className="text-xs text-zinc-500">
                                    {dateRange?.from && dateRange?.to
                                        ? `${dateRange.from.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${dateRange.to.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                                        : "Sélectionner une période"
                                    }
                                </p>
                            </div>
                        </div>
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            openCalendar ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-500"
                        )}>
                            {openCalendar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </button>
                    {openCalendar && (
                        <div className="border-t border-zinc-100 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-center overflow-x-auto">
                                <Calendar
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Dialog finalisation transaction */}
                <Dialog open={finaliserOpen} onOpenChange={open => { if (!open) setFinaliserOpen(false) }}>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="font-black text-zinc-900">Finaliser la transaction</DialogTitle>
                            <p className="text-sm text-zinc-500">
                                Saisissez le code reçu par notification et les détails du deal.
                            </p>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500">Code de confirmation (6 chiffres)</Label>
                                <Input
                                    placeholder="Ex : 814543"
                                    maxLength={6}
                                    value={finaliserForm.code}
                                    onChange={e => setFinaliserForm(f => ({ ...f, code: e.target.value.replace(/\D/g, "") }))}
                                    className="rounded-lg text-sm font-mono tracking-widest"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500">Prix final (FCFA)</Label>
                                <Input
                                    type="number"
                                    placeholder="Ex : 3500000"
                                    value={finaliserForm.prix_final}
                                    onChange={e => setFinaliserForm(f => ({ ...f, prix_final: e.target.value }))}
                                    className="rounded-lg text-sm"
                                />
                            </div>
                            {finaliserTransaction?.type === "location" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-zinc-500">Date début</Label>
                                        <Input
                                            type="date"
                                            value={finaliserForm.date_debut}
                                            onChange={e => setFinaliserForm(f => ({ ...f, date_debut: e.target.value }))}
                                            className="rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-zinc-500">Date fin</Label>
                                        <Input
                                            type="date"
                                            value={finaliserForm.date_fin}
                                            onChange={e => setFinaliserForm(f => ({ ...f, date_fin: e.target.value }))}
                                            className="rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setFinaliserOpen(false)} className="rounded-xl cursor-pointer">
                                Annuler
                            </Button>
                            <Button
                                disabled={finaliserLoading}
                                onClick={handleFinaliser}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                            >
                                {finaliserLoading ? "Envoi..." : "Confirmer le deal"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Tabs + liste */}
                <Tabs defaultValue="a_venir" className="animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                    <TabsList className="bg-transparent border-b border-zinc-200 rounded-none h-auto p-0 gap-0 justify-start w-full">
                        <TabsTrigger
                            value="tous"
                            className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500"
                        >
                            Tous ({rdvList.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="a_venir"
                            className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 gap-1.5"
                        >
                            <Clock className="h-3.5 w-3.5" /> À venir ({filterRdvs("a_venir").length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="passes"
                            className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 gap-1.5"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Passés ({filterRdvs("passes").length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="annules"
                            className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:text-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 gap-1.5"
                        >
                            <XCircle className="h-3.5 w-3.5" /> Annulés ({filterRdvs("annules").length})
                        </TabsTrigger>
                    </TabsList>

                    {["tous", "a_venir", "passes", "annules"].map(tab => (
                        <TabsContent key={tab} value={tab} className="mt-6">
                            {filterRdvs(tab).length > 0 && (
                                <StaggerList className="space-y-3">
                                    {filterRdvs(tab).map(r => (
                                        <StaggerItem key={r.id}>
                                            <RdvCard rdv={r} />
                                        </StaggerItem>
                                    ))}
                                </StaggerList>
                            )}
                            {filterRdvs(tab).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6">
                                        <CalendarDays className="h-8 w-8 text-zinc-300" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-zinc-900 mb-1">Aucun rendez-vous</h3>
                                    <p className="text-sm text-zinc-400">Pas de rendez-vous dans cette catégorie</p>
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </FadeIn>
        </div>
    )
}
