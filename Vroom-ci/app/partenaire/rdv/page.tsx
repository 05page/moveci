"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/src/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    CalendarCheck,
    Car,
    Check,
    X,
    Flag,
    Clock,
    User,
    MapPin,
    FileText,
    RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { getNosRdv, confirmerRdv, refuserRdv, annulerRdv, terminerRdv } from "@/src/actions/rdv.actions"
import { RendezVous } from "@/src/types"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

// Filtres disponibles sur le statut du RDV
const FILTRES = [
    { value: "tous",       label: "Tous" },
    { value: "en_attente", label: "En attente" },
    { value: "confirmé",   label: "Confirmés" },
    { value: "refusé",     label: "Refusés" },
    { value: "annulé",     label: "Annulés" },
    { value: "terminé",    label: "Terminés" },
] as const

type FiltreValue = typeof FILTRES[number]["value"]

function badgeStatut(statut: string) {
    switch (statut) {
        case "en_attente": return "bg-yellow-100 text-yellow-700 border-yellow-200"
        case "confirmé":   return "bg-green-100 text-green-700 border-green-200"
        case "refusé":     return "bg-red-100 text-red-700 border-red-200"
        case "annulé":     return "bg-zinc-100 text-zinc-600 border-zinc-200"
        case "terminé":    return "bg-blue-100 text-blue-700 border-blue-200"
        default:           return "bg-muted text-muted-foreground"
    }
}

function labelType(type: string) {
    switch (type) {
        case "visite":             return "Visite"
        case "essai_routier":      return "Essai routier"
        case "premiere_rencontre": return "Première rencontre"
        default:                   return type
    }
}

export default function NosRdvPage() {
    const [rdvs, setRdvs]           = useState<RendezVous[]>([])
    const [loading, setLoading]     = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [filtre, setFiltre]       = useState<FiltreValue>("tous")

    // State pour les dialogs de confirmation d'action
    const [actionRdv, setActionRdv]   = useState<{ rdv: RendezVous; action: "confirmer" | "refuser" | "terminer" | "annuler" } | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const fetchRdvs = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getNosRdv()
            if (res.data) setRdvs(res.data)
        } catch {
            toast.error("Impossible de charger les rendez-vous")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchRdvs() }, [fetchRdvs])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchRdvs()
    }

    const rdvsFiltres = filtre === "tous"
        ? rdvs
        : rdvs.filter(r => r.statut === filtre)

    const comptages: Record<string, number> = { tous: rdvs.length }
    for (const r of rdvs) {
        comptages[r.statut] = (comptages[r.statut] ?? 0) + 1
    }

    const handleAction = async () => {
        if (!actionRdv) return
        setSubmitting(true)
        try {
            // Appel de l'action correspondante selon le type d'action demandé
            if (actionRdv.action === "confirmer") await confirmerRdv(actionRdv.rdv.id)
            else if (actionRdv.action === "refuser")   await refuserRdv(actionRdv.rdv.id)
            else if (actionRdv.action === "terminer")  await terminerRdv(actionRdv.rdv.id)
            else if (actionRdv.action === "annuler")   await annulerRdv(actionRdv.rdv.id)
            const labels: Record<string, string> = {
                confirmer: "confirmé",
                refuser:   "refusé",
                terminer:  "terminé",
                annuler:   "annulé",
            }
            toast.success(`Rendez-vous ${labels[actionRdv.action]}`)
            setActionRdv(null)
            fetchRdvs()
        } catch {
            toast.error("Une erreur est survenue")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <FadeIn className="space-y-6">
            {/* En-tête */}
            <SlideIn direction="left">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nos Rendez-Vous</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gérez les demandes de vos clients.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
                        <CalendarCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">{rdvs.length}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2 cursor-pointer"
                    >
                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        {refreshing ? "Chargement..." : "Actualiser"}
                    </Button>
                </div>
            </div>
            </SlideIn>

            {/* Filtres pills */}
            <div className="flex flex-wrap gap-2">
                {FILTRES.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setFiltre(value)}
                        className={[
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                            filtre === value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:bg-muted",
                        ].join(" ")}
                    >
                        {label}
                        {(comptages[value] ?? 0) > 0 && (
                            <span className={[
                                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                filtre === value ? "bg-white/20" : "bg-muted-foreground/15",
                            ].join(" ")}>
                                {comptages[value]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <Skeleton className="h-4 w-64" />
                                <Skeleton className="h-4 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : rdvsFiltres.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <CalendarCheck className="h-10 w-10 mb-3 opacity-30" />
                        <p className="font-medium">Aucun rendez-vous</p>
                        <p className="text-sm mt-1">Aucun RDV pour ce filtre</p>
                    </CardContent>
                </Card>
            ) : (
                <StaggerList className="space-y-3">
                    {rdvsFiltres.map((rdv) => (
                        <StaggerItem key={rdv.id}>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Icône */}
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary shrink-0">
                                        <Car className="h-6 w-6 text-muted-foreground" />
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="font-semibold text-sm">
                                                {rdv.vehicule?.description?.marque} {rdv.vehicule?.description?.modele}
                                                {rdv.vehicule?.description?.annee && (
                                                    <span className="text-muted-foreground font-normal ml-1">
                                                        ({rdv.vehicule.description.annee})
                                                    </span>
                                                )}
                                            </h3>
                                            <Badge className={`${badgeStatut(rdv.statut)} text-xs`}>
                                                {rdv.statut.charAt(0).toUpperCase() + rdv.statut.slice(1)}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {labelType(rdv.type)}
                                            </Badge>
                                        </div>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {rdv.client?.fullname ?? "Client inconnu"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(rdv.date_heure).toLocaleDateString("fr-FR", {
                                                    day: "2-digit", month: "short", year: "numeric",
                                                    hour: "2-digit", minute: "2-digit",
                                                })}
                                            </span>
                                            {rdv.lieu && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {rdv.lieu}
                                                </span>
                                            )}
                                            {rdv.motif && (
                                                <span className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    {rdv.motif}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions — selon le statut */}
                                    {rdv.statut === "en_attente" && (
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                                onClick={() => setActionRdv({ rdv, action: "confirmer" })}
                                            >
                                                <Check className="h-3 w-3 mr-1" />
                                                Confirmer
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-200 text-red-700 hover:bg-red-50 h-8 text-xs"
                                                onClick={() => setActionRdv({ rdv, action: "refuser" })}
                                            >
                                                <X className="h-3 w-3 mr-1" />
                                                Refuser
                                            </Button>
                                        </div>
                                    )}
                                    {rdv.statut === "confirmé" && (
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                                                onClick={() => setActionRdv({ rdv, action: "terminer" })}
                                            >
                                                <Flag className="h-3 w-3 mr-1" />
                                                Terminer
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 h-8 text-xs"
                                                onClick={() => setActionRdv({ rdv, action: "annuler" })}
                                            >
                                                <X className="h-3 w-3 mr-1" />
                                                Annuler
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        </StaggerItem>
                    ))}
                </StaggerList>
            )}

            {/* Dialog de confirmation d'action */}
            <AlertDialog open={!!actionRdv} onOpenChange={(open) => !open && setActionRdv(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionRdv?.action === "confirmer" && "Confirmer ce rendez-vous ?"}
                            {actionRdv?.action === "refuser"   && "Refuser ce rendez-vous ?"}
                            {actionRdv?.action === "terminer"  && "Marquer comme terminé ?"}
                            {actionRdv?.action === "annuler"   && "Annuler ce rendez-vous ?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            RDV avec <strong>{actionRdv?.rdv.client?.fullname}</strong> le{" "}
                            {actionRdv && new Date(actionRdv.rdv.date_heure).toLocaleDateString("fr-FR", {
                                day: "2-digit", month: "long", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                            })}.
                            <br />
                            Le client sera notifié automatiquement.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Separator />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAction}
                            disabled={submitting}
                            className={
                                actionRdv?.action === "confirmer" ? "bg-green-600 hover:bg-green-700" :
                                actionRdv?.action === "terminer"  ? "bg-blue-600 hover:bg-blue-700"  :
                                "bg-red-600 hover:bg-red-700"
                            }
                        >
                            {submitting ? "En cours..." : "Confirmer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </FadeIn>
    )
}
