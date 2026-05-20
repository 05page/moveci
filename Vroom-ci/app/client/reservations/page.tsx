"use client"

import { getErrorMessage } from "@/src/lib/handleError"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Car,
    Clock,
    CalendarX,
    KeyRound,
    XCircle,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Reservation } from "@/src/types"
import { api } from "@/src/lib/api"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Link from "next/link"

// Formate une date ISO en "25 mars 2026"
const formatDate = (dt: string) =>
    format(new Date(dt), "d MMMM yyyy", { locale: fr })

const STATUT_CONFIG: Record<Reservation["statut"], { label: string; className: string }> = {
    en_attente: { label: "En attente",  className: "bg-amber-100 text-amber-700" },
    confirmee:  { label: "Confirmée",   className: "bg-green-100 text-green-700" },
    annulee:    { label: "Annulée",     className: "bg-red-100 text-red-700" },
    expiree:    { label: "Expirée",     className: "bg-zinc-100 text-zinc-500" },
}

const MesReservations = () => {
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [cancelling, setCancelling] = useState<string | null>(null)

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

    // Annule une réservation et met à jour la liste localement
    const handleAnnuler = async (id: string) => {
        setCancelling(id)
        try {
            await api.post(`/reservations/${id}/cancel`, {})
            setReservations(prev =>
                prev.map(r => r.id === id ? { ...r, statut: "annulee" } : r)
            )
            toast.success("Réservation annulée.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erreur lors de l'annulation")
        } finally {
            setCancelling(null)
        }
    }

    if (isLoading) return (
        <div className="pt-20 px-4 max-w-2xl mx-auto space-y-4">
            {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
        </div>
    )

    return (
        <div className="pt-20 px-4 max-w-2xl mx-auto mb-12">
            <h1 className="text-2xl font-bold mb-6">Mes réservations</h1>

            {reservations.length === 0 ? (
                <div className="text-center py-20 text-zinc-400">
                    <KeyRound className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Aucune réservation pour le moment.</p>
                    <Link href="/vehicles">
                        <Button className="mt-4" variant="outline">Parcourir les véhicules</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {reservations.map(r => {
                        const config = STATUT_CONFIG[r.statut]
                        const vehicule = r.vehicule

                        return (
                            <Card key={r.id} className="rounded-2xl border border-zinc-200">
                                <CardContent className="p-4 flex flex-col gap-3">
                                    {/* En-tête : véhicule + badge statut */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Car className="h-5 w-5 text-zinc-400 shrink-0" />
                                            {vehicule ? (
                                                <Link
                                                    href={`/vehicles/${vehicule.id}`}
                                                    className="font-semibold text-zinc-800 hover:underline"
                                                >
                                                    {vehicule.description?.marque} {vehicule.description?.modele} {vehicule.description?.annee}
                                                </Link>
                                            ) : (
                                                <span className="font-semibold text-zinc-800">Véhicule inconnu</span>
                                            )}
                                        </div>
                                        <Badge className={config.className}>{config.label}</Badge>
                                    </div>

                                    {/* Dates */}
                                    <div className="flex flex-col gap-1 text-sm text-zinc-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            Réservé le {formatDate(r.created_at)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <CalendarX className="h-3.5 w-3.5" />
                                            Expire le {formatDate(r.expires_at)}
                                        </div>
                                    </div>

                                    {/* Bouton annuler — uniquement si en_attente */}
                                    {r.statut === "en_attente" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="self-end text-red-600 border-red-200 hover:bg-red-50 rounded-xl gap-1"
                                            disabled={cancelling === r.id}
                                            onClick={() => handleAnnuler(r.id)}
                                        >
                                            {cancelling === r.id
                                                ? <span className="h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                : <XCircle className="h-3.5 w-3.5" />
                                            }
                                            Annuler
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default MesReservations
