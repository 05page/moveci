"use client"

import { getErrorMessage } from "@/src/lib/handleError"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Car, Calendar, MessageSquare, Star, RefreshCw,
    KeyRound, LifeBuoy, XCircle,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Reservation } from "@/src/types"
import { api } from "@/src/lib/api"
import { getPhotoUrl } from "@/src/lib/utils"
import { cn } from "@/src/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useUser } from "@/src/context/UserContext"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: fr })

type TabKey = "toutes" | "confirmee" | "en_attente" | "expiree" | "annulee"

const TABS: { key: TabKey; label: string }[] = [
    { key: "toutes",    label: "Toutes" },
    { key: "confirmee", label: "Confirmées" },
    { key: "en_attente",label: "En attente" },
    { key: "expiree",   label: "Terminées" },
    { key: "annulee",   label: "Annulées" },
]

const STATUT_STYLE: Record<Reservation["statut"], { label: string; className: string }> = {
    en_attente: { label: "EN ATTENTE", className: "bg-amber-100 text-amber-700" },
    confirmee:  { label: "CONFIRMÉ",   className: "bg-green-100 text-green-700" },
    annulee:    { label: "ANNULÉ",     className: "bg-red-100 text-red-600" },
    expiree:    { label: "TERMINÉ",    className: "bg-zinc-100 text-zinc-500" },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const PageSkeleton = () => (
    <div className="pt-20 min-h-screen bg-zinc-50 px-4 md:px-8 pb-16 space-y-5">
        <div className="flex gap-6 border-b border-zinc-200 pb-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-5 w-20 rounded" />)}
        </div>
        {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
    </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

const MesReservations = () => {
    const { user } = useUser()
    const router = useRouter()

    const [reservations, setReservations] = useState<Reservation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [cancelling, setCancelling] = useState<string | null>(null)
    const [tab, setTab] = useState<TabKey>("toutes")

    // Dialog avis
    const [avisOpen, setAvisOpen] = useState(false)
    const [avisVehiculeId, setAvisVehiculeId] = useState<string | null>(null)
    const [avisNote, setAvisNote] = useState(5)
    const [avisCommentaire, setAvisCommentaire] = useState("")
    const [avisLoading, setAvisLoading] = useState(false)

    const fetchReservations = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await api.get<Reservation[]>("/reservations")
            setReservations(res.data ?? [])
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchReservations() }, [fetchReservations])

    const handleAnnuler = async (id: string) => {
        setCancelling(id)
        try {
            await api.post(`/reservations/${id}/cancel`, {})
            setReservations(prev => prev.map(r => r.id === id ? { ...r, statut: "annulee" } : r))
            toast.success("Réservation annulée.")
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setCancelling(null)
        }
    }

    const handleContact = async (vehicule: Reservation["vehicule"]) => {
        if (!user || !vehicule?.creator?.id) return
        try {
            const { findOrCreateConversation } = await import("@/src/actions/conversations.actions")
            const res = await findOrCreateConversation({ vehicule_id: vehicule.id, other_user_id: vehicule.creator.id })
            const convId = res.data?.conversation?.id
            if (!convId) throw new Error()
            router.push(`/client/messages?conv=${convId}`)
        } catch {
            toast.error("Impossible d'ouvrir la conversation")
        }
    }

    const handleAvisSubmit = async () => {
        if (!avisVehiculeId) return
        setAvisLoading(true)
        try {
            await api.post("/avis", { vehicule_id: avisVehiculeId, note: avisNote, commentaire: avisCommentaire || null })
            toast.success("Avis publié !")
            setAvisOpen(false)
            setAvisCommentaire("")
            setAvisNote(5)
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setAvisLoading(false)
        }
    }

    const filtered = tab === "toutes" ? reservations : reservations.filter(r => r.statut === tab)

    if (isLoading) return <PageSkeleton />

    return (
        <div className="pt-20 min-h-screen bg-zinc-50 px-4 md:px-8 pb-16">

            {/* ── Tabs ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
                {TABS.map(t => {
                    const count = t.key === "toutes"
                        ? reservations.length
                        : reservations.filter(r => r.statut === t.key).length
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
                        onClick={fetchReservations}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* ── Liste / vide ──────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-5 shadow-sm">
                        <KeyRound className="h-9 w-9 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-2">Aucune réservation</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mb-6">
                        {tab === "toutes"
                            ? "Vous n'avez pas encore de réservation."
                            : "Aucune réservation dans cette catégorie."
                        }
                    </p>
                    <Link href="/vehicles">
                        <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                            Parcourir les véhicules
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => {
                        const v = r.vehicule
                        const photo = v?.photos?.find(p => p.is_primary) ?? v?.photos?.[0]
                        const imageUrl = photo ? getPhotoUrl(photo.path) : null
                        const statut = STATUT_STYLE[r.statut]

                        return (
                            <div key={r.id} className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 hover:shadow-md transition-shadow">

                                {/* Photo */}
                                <div className="relative w-36 h-24 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                                    {imageUrl
                                        ? <Image src={imageUrl} alt={`${v?.description?.marque} ${v?.description?.modele}`} fill className="object-cover" unoptimized />
                                        : <div className="absolute inset-0 flex items-center justify-center"><Car className="h-8 w-8 text-zinc-300" /></div>
                                    }
                                </div>

                                {/* Infos */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <p className="font-black text-zinc-900 text-base truncate">
                                        {v ? `${v.description?.marque} ${v.description?.modele}` : "Véhicule inconnu"}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                        <Calendar className="h-3 w-3 shrink-0" />
                                        <span>{fmtDate(r.created_at)} — {fmtDate(r.expires_at)}</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                                            {r.statut === "expiree" ? "Payé" : r.statut === "annulee" ? "Montant" : "Prix total"}
                                        </p>
                                        <p className="text-base font-black text-move-gold">
                                            {Number(v?.prix ?? 0).toLocaleString("fr-FR")}
                                            <span className="text-xs font-normal text-zinc-400 ml-1">FCFA</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Statut + actions */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={cn("text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full", statut.className)}>
                                        {statut.label}
                                    </span>

                                    {/* CONFIRMÉ → Contacter */}
                                    {r.statut === "confirmee" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleContact(v)}
                                            className="rounded-xl bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white text-xs gap-1.5 cursor-pointer h-8 px-3"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            Contacter
                                        </Button>
                                    )}

                                    {/* EN ATTENTE → Annuler + Contacter */}
                                    {r.statut === "en_attente" && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAnnuler(r.id)}
                                                disabled={cancelling === r.id}
                                                className="rounded-xl border-zinc-200 text-zinc-600 text-xs gap-1.5 cursor-pointer h-8 px-3"
                                            >
                                                {cancelling === r.id
                                                    ? <span className="h-3.5 w-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                                    : <XCircle className="h-3.5 w-3.5" />
                                                }
                                                Annuler
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleContact(v)}
                                                className="rounded-xl bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white text-xs gap-1.5 cursor-pointer h-8 px-3"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                Contacter
                                            </Button>
                                        </>
                                    )}

                                    {/* TERMINÉ → Noter */}
                                    {r.statut === "expiree" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setAvisVehiculeId(r.vehicule_id); setAvisOpen(true) }}
                                            className="rounded-xl border-zinc-200 text-zinc-600 text-xs gap-1.5 cursor-pointer h-8 px-3"
                                        >
                                            <Star className="h-3.5 w-3.5" />
                                            Noter
                                        </Button>
                                    )}

                                    {/* ANNULÉ → Support + Re-louer */}
                                    {r.statut === "annulee" && (
                                        <>
                                            <Link href="/contact">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-xl border-zinc-200 text-zinc-600 text-xs gap-1.5 cursor-pointer h-8 px-3"
                                                >
                                                    <LifeBuoy className="h-3.5 w-3.5" />
                                                    Support
                                                </Button>
                                            </Link>
                                            {v && (
                                                <Link href={`/vehicles/${v.id}`}>
                                                    <Button
                                                        size="sm"
                                                        className="rounded-xl bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white text-xs gap-1.5 cursor-pointer h-8 px-3"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                        Re-louer
                                                    </Button>
                                                </Link>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Dialog Avis ────────────────────────────────────────── */}
            <Dialog open={avisOpen} onOpenChange={open => { if (!open) setAvisOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Laisser un avis</DialogTitle>
                        <p className="text-sm text-zinc-500">Partagez votre expérience avec ce véhicule.</p>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Étoiles */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-zinc-500">Note</Label>
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setAvisNote(n)}
                                        className="cursor-pointer transition-transform hover:scale-110"
                                    >
                                        <Star className={cn("h-7 w-7 transition-colors", n <= avisNote ? "fill-move-gold text-move-gold" : "text-zinc-300")} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-zinc-500">Commentaire (optionnel)</Label>
                            <Textarea
                                placeholder="Décrivez votre expérience..."
                                value={avisCommentaire}
                                onChange={e => setAvisCommentaire(e.target.value)}
                                className="rounded-xl text-sm resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAvisOpen(false)} className="rounded-xl cursor-pointer">
                            Annuler
                        </Button>
                        <Button
                            disabled={avisLoading}
                            onClick={handleAvisSubmit}
                            className="bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl cursor-pointer"
                        >
                            {avisLoading ? "Publication..." : "Publier l'avis"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default MesReservations
