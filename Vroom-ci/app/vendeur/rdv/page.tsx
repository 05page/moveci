"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { cn } from "@/src/lib/utils"
import { getPhotoUrl } from "@/src/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Calendar, Car, Check, CheckCircle2,
    ClipboardCheck, Clock, MapPin,
    RefreshCw, User, X, XCircle,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Image from "next/image"
import { RendezVous, TransactionConclue } from "@/src/types"
import { getNosRdv, confirmerRdv, refuserRdv, annulerRdv, terminerRdv } from "@/src/actions/rdv.actions"
import { getMesTransactions, confirmerVendeur } from "@/src/actions/transactions.actions"

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
    visite: "Visite",
    essai_routier: "Essai routier",
    premiere_rencontre: "Première rencontre",
}

type TabKey = "tous" | "a_venir" | "passes" | "annules"

const TABS: { key: TabKey; label: string }[] = [
    { key: "tous", label: "Tous" },
    { key: "a_venir", label: "À venir" },
    { key: "passes", label: "Passés" },
    { key: "annules", label: "Annulés" },
]

const STATUT_STYLE: Record<string, { label: string; className: string }> = {
    en_attente: { label: "EN ATTENTE", className: "bg-amber-100 text-amber-700" },
    "confirmé": { label: "CONFIRMÉ", className: "bg-green-100 text-green-700" },
    "terminé": { label: "TERMINÉ", className: "bg-zinc-100 text-zinc-500" },
    "annulé": { label: "ANNULÉ", className: "bg-red-100 text-red-600" },
    "refusé": { label: "REFUSÉ", className: "bg-red-100 text-red-600" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: fr })
const fmtHeure = (d: string) => format(new Date(d), "HH:mm")

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const PageSkeleton = () => (
    <div className="pt-16 min-h-screen bg-zinc-50 px-4 md:px-8 pb-16 space-y-5">
        <div className="flex gap-6 border-b border-zinc-200 pb-3 pt-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-20 rounded" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
    </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NosRdv() {
    const [rdvList, setRdvList] = useState<RendezVous[]>([])
    const [transactions, setTransactions] = useState<TransactionConclue[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [tab, setTab] = useState<TabKey>("a_venir")

    // Dialog finalisation
    const [finaliserOpen, setFinaliserOpen] = useState(false)
    const [finaliserLoading, setFinaliserLoading] = useState(false)
    const [finaliserTransaction, setFinaliserTransaction] = useState<TransactionConclue | null>(null)
    const [finaliserForm, setFinaliserForm] = useState({
        code: "", prix_final: "", date_debut: "", date_fin: "",
    })

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [rdvRes, txRes] = await Promise.all([getNosRdv(), getMesTransactions()])
            setRdvList(rdvRes?.data ?? [])
            setTransactions(txRes?.data ?? [])
        } catch {
            toast.error("Erreur lors du chargement")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])
    useRevalidateOnFocus(fetchData)
    useDataRefresh("rdv", fetchData)
    useDataRefresh("transaction", fetchData)

    // ── Actions ───────────────────────────────────────────────────────────────

    const updateStatut = (id: string, statut: RendezVous["statut"]) =>
        setRdvList(prev => prev.map(r => r.id === id ? { ...r, statut } : r))

    const handleAction = async (
        id: string,
        action: "confirmer" | "refuser" | "annuler" | "terminer",
        nouveauStatut: RendezVous["statut"],
        successMsg: string,
    ) => {
        setActionLoading(id + action)
        try {
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

    // ── Finalisation ──────────────────────────────────────────────────────────

    const openFinaliser = (rdv: RendezVous) => {
        const tx = transactions.find(t => t.rendez_vous_id === rdv.id && t.statut === "en_attente")
        if (!tx) { toast.info("Aucune transaction en attente pour ce RDV"); return }
        setFinaliserTransaction(tx)
        setFinaliserForm({ code: "", prix_final: "", date_debut: "", date_fin: "" })
        setFinaliserOpen(true)
    }

    const handleFinaliser = async () => {
        if (!finaliserTransaction) return
        if (!finaliserForm.code || finaliserForm.code.length !== 6) {
            toast.error("Le code doit contenir 6 chiffres"); return
        }
        if (!finaliserForm.prix_final) {
            toast.error("Veuillez renseigner le prix final"); return
        }
        const isLocation = finaliserTransaction.type === "location"
        if (isLocation && (!finaliserForm.date_debut || !finaliserForm.date_fin)) {
            toast.error("Veuillez renseigner les dates de location"); return
        }
        setFinaliserLoading(true)
        try {
            await confirmerVendeur(finaliserTransaction.id, finaliserForm.code)
            toast.success("Transaction confirmée !.")
            setTransactions(prev =>
                prev.map(t => t.id === finaliserTransaction.id ? { ...t, confirme_par_vendeur: true } : t)
            )
            setFinaliserOpen(false)
        } catch (err: unknown) {
            const msg = (err as { data?: { message?: string } })?.data?.message
            toast.error(msg ?? "Code incorrect ou transaction expirée")
        } finally {
            setFinaliserLoading(false)
        }
    }

    // ── Filtres ───────────────────────────────────────────────────────────────

    const getByTab = (key: TabKey): RendezVous[] => {
        switch (key) {
            case "a_venir": return rdvList.filter(r => r.statut === "en_attente" || r.statut === "confirmé")
            case "passes": return rdvList.filter(r => r.statut === "terminé")
            case "annules": return rdvList.filter(r => r.statut === "annulé" || r.statut === "refusé")
            default: return rdvList
        }
    }

    const filtered = getByTab(tab)

    if (isLoading) return <PageSkeleton />

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="pt-16 min-h-screen bg-zinc-50 px-4 md:px-8 pb-16">

            {/* ── Tabs ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto pt-6">
                {TABS.map(t => {
                    const count = getByTab(t.key).length
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
                                tab === t.key
                                    ? "border-move-gold text-move-gold"
                                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                            )}
                        >
                            {t.label}
                            {count > 0 && (
                                <span className={cn(
                                    "text-xs font-bold px-1.5 py-0.5 rounded-full",
                                    tab === t.key ? "bg-move-gold/15 text-move-gold" : "bg-zinc-100 text-zinc-500"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}

                <div className="ml-auto pb-2 shrink-0">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* ── Liste / vide ───────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-5 shadow-sm">
                        <Calendar className="h-9 w-9 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-2">Aucun rendez-vous</h3>
                    <p className="text-sm text-zinc-500 max-w-sm">
                        {tab === "tous"
                            ? "Vous n'avez pas encore de rendez-vous."
                            : "Aucun rendez-vous dans cette catégorie."
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(rdv => {
                        const v = rdv.vehicule
                        const photo = v?.photos?.find(p => p.is_primary) ?? v?.photos?.[0]
                        const imageUrl = photo ? getPhotoUrl(photo.path) : null
                        const statut = STATUT_STYLE[rdv.statut] ?? { label: rdv.statut, className: "bg-zinc-100 text-zinc-500" }
                        const txEnAttente = transactions.find(
                            t => t.rendez_vous_id === rdv.id && t.statut === "en_attente" && !t.confirme_par_vendeur
                        )

                        return (
                            <div key={rdv.id} className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 hover:shadow-md transition-shadow">

                                {/* Photo véhicule */}
                                <div className="relative w-36 h-24 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                                    {imageUrl
                                        ? <Image src={imageUrl}
                                            alt={`${v?.description?.marque} ${v?.description?.modele}`} fill className="object-cover" unoptimized />
                                        : <div className="absolute inset-0 flex items-center justify-center"><Car className="h-8 w-8 text-zinc-300" /></div>
                                    }
                                </div>

                                {/* Infos */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <p className="font-black text-zinc-900 text-base truncate">
                                        {v ? `${v.description?.marque} ${v.description?.modele}` : "Véhicule inconnu"}
                                    </p>

                                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            {fmtDate(rdv.date_heure)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            {fmtHeure(rdv.date_heure)}
                                        </span>
                                    </div>

                                    {rdv.client && (
                                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                                            <User className="h-3 w-3 shrink-0" />
                                            <span>{rdv.client.fullname}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 flex-wrap">
                                        {rdv.lieu && (
                                            <span className="flex items-center gap-1 text-xs text-zinc-400">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                {rdv.lieu}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                                            {TYPE_LABELS[rdv.type] ?? rdv.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Statut + actions */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={cn("text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full", statut.className)}>
                                        {statut.label}
                                    </span>

                                    {rdv.statut === "en_attente" && (
                                        <div className="flex flex-col gap-1.5">
                                            <Button size="sm"
                                                disabled={!!actionLoading}
                                                onClick={() => handleAction(rdv.id, "confirmer", "confirmé", "RDV confirmé")}
                                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer h-8 px-3">
                                                <Check className="h-3.5 w-3.5" /> Confirmer
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                disabled={!!actionLoading}
                                                onClick={() => handleAction(rdv.id, "refuser", "refusé", "RDV refusé")}
                                                className="rounded-xl border-zinc-200 text-red-500 hover:text-red-600 text-xs gap-1.5 cursor-pointer h-8 px-3">
                                                <X className="h-3.5 w-3.5" /> Refuser
                                            </Button>
                                        </div>
                                    )}

                                    {rdv.statut === "confirmé" && (
                                        <div className="flex flex-col gap-1.5">
                                            <Button size="sm"
                                                disabled={!!actionLoading}
                                                onClick={() => handleAction(rdv.id, "terminer", "terminé", "RDV marqué terminé")}
                                                className="rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white text-xs gap-1.5 cursor-pointer h-8 px-3">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Terminer
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                disabled={!!actionLoading}
                                                onClick={() => handleAction(rdv.id, "annuler", "annulé", "RDV annulé")}
                                                className="rounded-xl border-zinc-200 text-red-500 hover:text-red-600 text-xs gap-1.5 cursor-pointer h-8 px-3">
                                                <XCircle className="h-3.5 w-3.5" /> Annuler
                                            </Button>
                                        </div>
                                    )}

                                    {rdv.statut === "terminé" && txEnAttente && (
                                        <Button size="sm"
                                            onClick={() => openFinaliser(rdv)}
                                            className="rounded-xl bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white text-xs gap-1.5 cursor-pointer h-8 px-3">
                                            <ClipboardCheck className="h-3.5 w-3.5" /> Finaliser
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Dialog finalisation ────────────────────────────────── */}
            <Dialog open={finaliserOpen} onOpenChange={open => { if (!open) setFinaliserOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Finaliser la transaction</DialogTitle>
                        <p className="text-sm text-zinc-500">
                            Saisissez le code reçu par notification et les détails du deal.
                        </p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-zinc-500">Code de confirmation (6 chiffres)</Label>
                            <Input
                                placeholder="Ex : 814543"
                                maxLength={6}
                                value={finaliserForm.code}
                                onChange={e => setFinaliserForm(f => ({ ...f, code: e.target.value.replace(/\D/g, "") }))}
                                className="rounded-xl text-sm font-mono tracking-widest border-zinc-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-zinc-500">Prix final (FCFA)</Label>
                            <Input
                                type="number"
                                placeholder="Ex : 3 500 000"
                                value={finaliserForm.prix_final}
                                onChange={e => setFinaliserForm(f => ({ ...f, prix_final: e.target.value }))}
                                className="rounded-xl text-sm border-zinc-200"
                            />
                        </div>
                        {finaliserTransaction?.type === "location" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zinc-500">Date début</Label>
                                    <Input type="date" value={finaliserForm.date_debut}
                                        onChange={e => setFinaliserForm(f => ({ ...f, date_debut: e.target.value }))}
                                        className="rounded-xl text-sm border-zinc-200" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zinc-500">Date fin</Label>
                                    <Input type="date" value={finaliserForm.date_fin}
                                        onChange={e => setFinaliserForm(f => ({ ...f, date_fin: e.target.value }))}
                                        className="rounded-xl text-sm border-zinc-200" />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setFinaliserOpen(false)}
                            className="rounded-xl cursor-pointer border-zinc-200">
                            Annuler
                        </Button>
                        <Button disabled={finaliserLoading} onClick={handleFinaliser}
                            className="bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white rounded-xl cursor-pointer">
                            {finaliserLoading ? "Envoi..." : "Confirmer le deal"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
