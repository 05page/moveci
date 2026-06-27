"use client"

import { getErrorMessage } from "@/src/lib/handleError"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
    Calendar, Car, Clock, MapPin,
    RefreshCw, Star, User, XCircle,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { RendezVous } from "@/src/types"
import { getMesRdv, annulerRdv } from "@/src/actions/rdv.actions"
import { createAvis } from "@/src/actions/avis.actions"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { getPhotoUrl } from "@/src/lib/utils"
import { cn } from "@/src/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Image from "next/image"
import Link from "next/link"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: fr })
const fmtHeure = (d: string) => format(new Date(d), "HH:mm")

const TYPE_LABELS: Record<RendezVous["type"], string> = {
    visite: "Visite",
    essai_routier: "Essai routier",
    premiere_rencontre: "Première rencontre",
}

type TabKey = "tous" | "a_venir" | "termines" | "annules"

const TABS: { key: TabKey; label: string }[] = [
    { key: "tous", label: "Tous" },
    { key: "a_venir", label: "À venir" },
    { key: "termines", label: "Terminés" },
    { key: "annules", label: "Annulés" },
]

const STATUT_STYLE: Record<string, { label: string; className: string }> = {
    en_attente: { label: "EN ATTENTE", className: "bg-amber-100 text-amber-700" },
    "confirmé": { label: "CONFIRMÉ", className: "bg-green-100 text-green-700" },
    "terminé": { label: "TERMINÉ", className: "bg-zinc-100 text-zinc-500" },
    "annulé": { label: "ANNULÉ", className: "bg-red-100 text-red-600" },
    "refusé": { label: "REFUSÉ", className: "bg-red-100 text-red-600" },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const PageSkeleton = () => (
    <div className="pt-20 min-h-screen bg-zinc-50 px-4 md:px-8 pb-16 space-y-5">
        <div className="flex gap-6 border-b border-zinc-200 pb-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-20 rounded" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
    </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

const MesRdv = () => {
    const [rdvList, setRdvList] = useState<RendezVous[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [cancelling, setCancelling] = useState<string | null>(null)
    const [tab, setTab] = useState<TabKey>("tous")

    // Dialog avis
    const [avisRdv, setAvisRdv] = useState<RendezVous | null>(null)
    const [avisNote, setAvisNote] = useState(0)
    const [avisCommentaire, setAvisCommentaire] = useState("")
    const [avisLoading, setAvisLoading] = useState(false)
    // Vendeurs déjà notés dans cette session (avant re-fetch Reverb)
    const [avisSubmisLocal, setAvisSubmisLocal] = useState<Set<string>>(new Set())

    const fetchRdvs = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await getMesRdv()
            setRdvList(res.data ?? [])
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchRdvs() }, [fetchRdvs])
    useRevalidateOnFocus(fetchRdvs)
    useDataRefresh("rdv", fetchRdvs)

    const handleAnnuler = async (id: string) => {
        setCancelling(id)
        try {
            await annulerRdv(id)
            setRdvList(prev => prev.map(r => r.id === id ? { ...r, statut: "annulé" } : r))
            toast.success("Rendez-vous annulé")
        } catch {
            toast.error("Impossible d'annuler ce rendez-vous")
        } finally {
            setCancelling(null)
        }
    }

    const handleAvisSubmit = async () => {
        if (!avisRdv || avisNote === 0) {
            toast.error("Veuillez attribuer une note")
            return
        }
        setAvisLoading(true)
        try {
            await createAvis({ rdv_id: avisRdv.id, note: avisNote, commentaire: avisCommentaire || undefined })
            setAvisSubmisLocal(prev => new Set([...prev, avisRdv.vendeur_id]))
            toast.success("Avis enregistré, merci !")
            setAvisRdv(null)
            setAvisCommentaire("")
            setAvisNote(0)
        } catch {
            toast.error("Impossible d'enregistrer l'avis")
        } finally {
            setAvisLoading(false)
        }
    }

    const getByTab = (key: TabKey): RendezVous[] => {
        switch (key) {
            case "a_venir": return rdvList.filter(r => r.statut === "confirmé" || r.statut === "en_attente")
            case "termines": return rdvList.filter(r => r.statut === "terminé")
            case "annules": return rdvList.filter(r => r.statut === "annulé" || r.statut === "refusé")
            default: return rdvList
        }
    }

    const filtered = getByTab(tab)

    if (isLoading) return <PageSkeleton />

    return (
        <div className="pt-20 min-h-screen bg-zinc-50 px-4 md:px-8 pb-16">

            {/* ── Tabs ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
                {TABS.map(t => {
                    const count = t.key === "tous" ? rdvList.length : getByTab(t.key).length
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
                        onClick={fetchRdvs}
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
                        <Calendar className="h-9 w-9 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-2">Aucun rendez-vous</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mb-6">
                        {tab === "tous"
                            ? "Vous n'avez pas encore de rendez-vous."
                            : "Aucun rendez-vous dans cette catégorie."
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
                    {filtered.map(rdv => {
                        const v = rdv.vehicule
                        const photo = v?.photos?.find(p => p.is_primary) ?? v?.photos?.[0]
                        const imageUrl = photo ? getPhotoUrl(photo.path) : null
                        const statut = STATUT_STYLE[rdv.statut] ?? { label: rdv.statut, className: "bg-zinc-100 text-zinc-500" }
                        const dejaNote = rdv.has_avis || avisSubmisLocal.has(rdv.vendeur_id)

                        return (
                            <div key={rdv.id} className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 hover:shadow-md transition-shadow">

                                {/* Photo ou icône calendrier */}
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

                                    {/* Date + heure */}
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

                                    {/* Vendeur */}
                                    {rdv.vendeur && (
                                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                                            <User className="h-3 w-3 shrink-0" />
                                            {rdv.vendeur.id
                                                ? <Link href={`/profil/${rdv.vendeur.id}`} className="hover:text-zinc-700 hover:underline transition-colors">{rdv.vendeur.fullname}</Link>
                                                : <span>{rdv.vendeur.fullname}</span>
                                            }
                                        </div>
                                    )}

                                    {/* Lieu + type */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {rdv.lieu && (
                                            <span className="flex items-center gap-1 text-xs text-zinc-400">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                {rdv.lieu}
                                            </span>
                                        )}
                                        <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                                            {TYPE_LABELS[rdv.type]}
                                        </span>
                                    </div>
                                </div>

                                {/* Statut + actions */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={cn("text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full", statut.className)}>
                                        {statut.label}
                                    </span>

                                    {/* EN ATTENTE ou CONFIRMÉ → Annuler */}
                                    {(rdv.statut === "en_attente" || rdv.statut === "confirmé") && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAnnuler(rdv.id)}
                                            disabled={cancelling === rdv.id}
                                            className="rounded-xl border-zinc-200 text-zinc-600 text-xs gap-1.5 cursor-pointer h-8 px-3"
                                        >
                                            {cancelling === rdv.id
                                                ? <span className="h-3.5 w-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                                : <XCircle className="h-3.5 w-3.5" />
                                            }
                                            Annuler
                                        </Button>
                                    )}

                                    {/* TERMINÉ → Noter ou "Avis envoyé" */}
                                    {rdv.statut === "terminé" && !dejaNote && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setAvisRdv(rdv); setAvisNote(0); setAvisCommentaire("") }}
                                            className="rounded-xl border-zinc-200 text-zinc-600 text-xs gap-1.5 cursor-pointer h-8 px-3"
                                        >
                                            <Star className="h-3.5 w-3.5" />
                                            Noter
                                        </Button>
                                    )}
                                    {rdv.statut === "terminé" && dejaNote && (
                                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                                            <Star className="h-3.5 w-3.5 fill-zinc-300 text-zinc-300" />
                                            Avis envoyé
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Dialog Avis ────────────────────────────────────────── */}
            <Dialog open={!!avisRdv} onOpenChange={open => { if (!open) setAvisRdv(null) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Laisser un avis</DialogTitle>
                        <p className="text-sm text-zinc-500">{avisRdv?.vendeur?.fullname ?? "ce vendeur"}</p>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
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
                                placeholder="Partagez votre expérience..."
                                value={avisCommentaire}
                                onChange={e => setAvisCommentaire(e.target.value)}
                                className="rounded-xl text-sm resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAvisRdv(null)} className="rounded-xl cursor-pointer">
                            Annuler
                        </Button>
                        <Button
                            disabled={avisLoading || avisNote === 0}
                            onClick={handleAvisSubmit}
                            className="bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl cursor-pointer"
                        >
                            {avisLoading ? "Envoi..." : "Envoyer l'avis"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default MesRdv
