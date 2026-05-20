"use client"

import { getErrorMessage } from "@/src/lib/handleError"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
    Calendar as CalendarIcon,
    CalendarCheck,
    CalendarClock,
    CalendarX,
    Car,
    Clock,
    Phone,
    Star,
    User,
    XCircle,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { RendezVous } from "@/src/types"
import { getMesRdv, annulerRdv } from "@/src/actions/rdv.actions"
import { createAvis } from "@/src/actions/avis.actions"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"
import Link from "next/link"

// Formate un datetime ISO en date lisible : "25 février 2026"
const formatDate = (dt: string) =>
    format(new Date(dt), "d MMMM yyyy", { locale: fr })

// Formate un datetime ISO en heure : "10:30"
const formatHeure = (dt: string) =>
    format(new Date(dt), "HH:mm")

const TYPE_LABELS: Record<string, string> = {
    visite: "Visite",
    essai_routier: "Essai routier",
    premiere_rencontre: "Première rencontre",
}

const MesRdv = () => {
    const [rdvList, setRdvList] = useState<RendezVous[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [cancelling, setCancelling] = useState<string | null>(null)
    // État du dialog avis : quel RDV est en cours de notation
    const [avisRdv, setAvisRdv] = useState<RendezVous | null>(null)
    const [avisForm, setAvisForm] = useState({ note: 0, commentaire: "" })
    const [avisLoading, setAvisLoading] = useState(false)
    // vendeur_ids pour lesquels un avis a été soumis cette session (avant que le DataRefresh arrive)
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

    // Recharge les RDV quand l'utilisateur revient sur l'onglet
    useRevalidateOnFocus(fetchRdvs)
    // Recharge en temps réel via Reverb quand un RDV change
    useDataRefresh("rdv", fetchRdvs)

    // Annule un RDV côté backend et met à jour la liste locale
    const handleAnnuler = async (id: string) => {
        setCancelling(id)
        try {
            await annulerRdv(id)
            setRdvList(prev =>
                prev.map(r => r.id === id ? { ...r, statut: "annulé" } : r)
            )
            toast.success("Rendez-vous annulé")
        } catch {
            toast.error("Impossible d'annuler ce rendez-vous")
        } finally {
            setCancelling(null)
        }
    }

    // Soumet l'avis au backend puis marque localement le RDV comme noté
    const handleAvisSubmit = async () => {
        if (!avisRdv || avisForm.note === 0) {
            toast.error("Veuillez attribuer une note")
            return
        }
        setAvisLoading(true)
        try {
            await createAvis({
                rdv_id: avisRdv.id,
                note: avisForm.note,
                commentaire: avisForm.commentaire || undefined,
            })
            // Optimistic update : marque le vendeur comme déjà noté pendant que le DataRefresh arrive
            setAvisSubmisLocal(prev => new Set([...prev, avisRdv.vendeur_id]))
            toast.success("Avis enregistré, merci !")
            setAvisRdv(null)
            setAvisForm({ note: 0, commentaire: "" })
        } catch {
            toast.error("Impossible d'enregistrer l'avis")
        } finally {
            setAvisLoading(false)
        }
    }

    const getRdvByTab = (tab: string): RendezVous[] => {
        switch (tab) {
            case "a_venir":
                return rdvList.filter(r => r.statut === "confirmé" || r.statut === "en_attente")
            case "termines":
                return rdvList.filter(r => r.statut === "terminé")
            case "annules":
                return rdvList.filter(r => r.statut === "annulé" || r.statut === "refusé")
            default:
                return rdvList
        }
    }

    const getStatusBadge = (statut: string) => {
        switch (statut) {
            case "confirmé":
                return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-bold text-xs" variant="outline">Confirmé</Badge>
            case "en_attente":
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-xs" variant="outline">En attente</Badge>
            case "terminé":
                return <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs" variant="outline">Terminé</Badge>
            case "annulé":
                return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-xs" variant="outline">Annulé</Badge>
            case "refusé":
                return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-xs" variant="outline">Refusé</Badge>
            default:
                return <Badge variant="outline" className="font-bold text-xs">{statut}</Badge>
        }
    }

    const getStatusIcon = (statut: string) => {
        switch (statut) {
            case "confirmé":   return <CalendarCheck className="h-5 w-5 text-green-600" />
            case "en_attente": return <CalendarClock className="h-5 w-5 text-amber-600" />
            case "terminé":    return <CalendarCheck className="h-5 w-5 text-primary" />
            case "annulé":
            case "refusé":     return <XCircle className="h-5 w-5 text-red-600" />
            default:           return <CalendarIcon className="h-5 w-5 text-muted-foreground" />
        }
    }

    const getStatusIconBg = (statut: string) => {
        switch (statut) {
            case "confirmé":   return "bg-green-500/10"
            case "en_attente": return "bg-amber-500/10"
            case "terminé":    return "bg-primary/10"
            case "annulé":
            case "refusé":     return "bg-red-500/10"
            default:           return "bg-muted"
        }
    }

    const EmptyState = ({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>, title: string, description: string }) => (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6">
                <Icon className="h-8 w-8 text-zinc-300" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">{title}</h3>
            <p className="text-sm text-zinc-400 max-w-sm">{description}</p>
        </div>
    )

    const RdvCard = ({ rdv }: { rdv: RendezVous }) => (
        <Card className={`rounded-xl shadow-none border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all bg-white ${
            rdv.statut === "en_attente" ? "bg-amber-500/5 border-amber-500/20" : ""
        }`}>
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${getStatusIconBg(rdv.statut)} flex items-center justify-center shrink-0`}>
                        {getStatusIcon(rdv.statut)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-sm text-foreground truncate">
                                        {rdv.vehicule?.description?.marque} {rdv.vehicule?.description?.modele}
                                    </h4>
                                    {getStatusBadge(rdv.statut)}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <CalendarIcon className="h-3 w-3" />
                                        {formatDate(rdv.date_heure)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatHeure(rdv.date_heure)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {rdv.vendeur?.id
                                    ? <Link href={`/profil/${rdv.vendeur.id}`} className="hover:underline hover:text-zinc-700 transition-colors">{rdv.vendeur.fullname}</Link>
                                    : (rdv.vendeur?.fullname ?? "—")
                                }
                            </span>
                            {rdv.vendeur?.telephone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {rdv.vendeur.telephone}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0">
                                <Car className="h-2.5 w-2.5 mr-1" />
                                {TYPE_LABELS[rdv.type] ?? rdv.type}
                            </Badge>
                            <div className="flex items-center gap-1">
                                {(rdv.statut === "en_attente" || rdv.statut === "confirmé") && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={cancelling === rdv.id}
                                        onClick={() => handleAnnuler(rdv.id)}
                                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2 rounded-lg"
                                    >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {cancelling === rdv.id ? "..." : "Annuler"}
                                    </Button>
                                )}
                                {rdv.statut === "terminé" && !rdv.has_avis && !avisSubmisLocal.has(rdv.vendeur_id) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setAvisRdv(rdv); setAvisForm({ note: 0, commentaire: "" }) }}
                                        className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 px-2 rounded-lg"
                                    >
                                        <Star className="h-3 w-3 mr-1" />
                                        Laisser un avis
                                    </Button>
                                )}
                                {rdv.statut === "terminé" && (rdv.has_avis || avisSubmisLocal.has(rdv.vendeur_id)) && (
                                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-zinc-300" />
                                        Avis envoyé
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    const nosStats = [
        { label: "Total",    value: rdvList.length,                 icon: CalendarIcon,  color: "bg-zinc-100 text-zinc-600" },
        { label: "À venir",  value: getRdvByTab("a_venir").length,  icon: CalendarClock, color: "bg-blue-50 text-blue-600" },
        { label: "Terminés", value: getRdvByTab("termines").length, icon: CalendarCheck, color: "bg-green-50 text-green-600" },
        { label: "Annulés",  value: getRdvByTab("annules").length,  icon: CalendarX,     color: "bg-red-50 text-red-600" },
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

    return (
        <FadeIn className="pt-20 px-4 md:px-6 max-w-5xl mx-auto mb-16 space-y-8">
            {/* Header */}
            <SlideIn direction="left">
                <section className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
                                Mes Rendez-vous
                                {rdvList.length > 0 && (
                                    <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-zinc-900 text-white text-xs font-semibold">
                                        {rdvList.length}
                                    </span>
                                )}
                            </h1>
                            <div className="flex items-center gap-3 mt-1.5 text-sm text-zinc-500">
                                <span>{rdvList.length} au total</span>
                                <span className="text-zinc-300">·</span>
                                <span>{getRdvByTab("a_venir").length} à venir</span>
                                <span className="text-zinc-300">·</span>
                                <span>{getRdvByTab("termines").length} terminés</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-px bg-zinc-100" />
                </section>
            </SlideIn>

            {/* Tabs + liste */}
            <Tabs defaultValue="tous" className="w-full">
                <TabsList className="bg-transparent border-b border-zinc-200 rounded-none h-auto p-0 gap-0 justify-start w-full">
                    <TabsTrigger
                        value="tous"
                        className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 gap-2"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        <span>Tous</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="a_venir"
                        className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 gap-2"
                    >
                        <CalendarClock className="h-4 w-4" />
                        <span>À venir</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="termines"
                        className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 gap-2"
                    >
                        <CalendarCheck className="h-4 w-4" />
                        <span>Terminés</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="annules"
                        className="rounded-none px-4 py-2.5 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-zinc-500 gap-2"
                    >
                        <CalendarX className="h-4 w-4" />
                        <span>Annulés</span>
                    </TabsTrigger>
                </TabsList>

                {["tous", "a_venir", "termines", "annules"].map(tab => (
                    <TabsContent key={tab} value={tab} className="mt-6">
                        {getRdvByTab(tab).length === 0 ? (
                            <EmptyState
                                icon={CalendarIcon}
                                title="Aucun rendez-vous"
                                description="Aucun rendez-vous dans cette catégorie."
                            />
                        ) : (
                            <StaggerList className="space-y-3">
                                {getRdvByTab(tab).map((rdv) => (
                                    <StaggerItem key={rdv.id}>
                                        <RdvCard rdv={rdv} />
                                    </StaggerItem>
                                ))}
                            </StaggerList>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            {/* Dialog pour laisser un avis après un RDV terminé */}
            <Dialog open={!!avisRdv} onOpenChange={open => { if (!open) setAvisRdv(null) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Laisser un avis</DialogTitle>
                        <p className="text-sm text-zinc-500">
                            {avisRdv?.vendeur?.fullname ?? "ce vendeur"}
                        </p>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Étoiles cliquables — note de 1 à 5 */}
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setAvisForm(f => ({ ...f, note: n }))}
                                    className="transition-transform hover:scale-110"
                                >
                                    <Star className={`h-9 w-9 ${n <= avisForm.note ? "text-amber-400 fill-amber-400" : "text-zinc-300"}`} />
                                </button>
                            ))}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Commentaire (optionnel)</Label>
                            <Textarea
                                placeholder="Partagez votre expérience..."
                                value={avisForm.commentaire}
                                onChange={e => setAvisForm(f => ({ ...f, commentaire: e.target.value }))}
                                className="rounded-lg text-sm resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAvisRdv(null)} className="rounded-xl cursor-pointer">
                            Annuler
                        </Button>
                        <Button
                            disabled={avisLoading || avisForm.note === 0}
                            onClick={handleAvisSubmit}
                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl cursor-pointer"
                        >
                            {avisLoading ? "Envoi..." : "Envoyer l'avis"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </FadeIn>
    )
}

export default MesRdv
