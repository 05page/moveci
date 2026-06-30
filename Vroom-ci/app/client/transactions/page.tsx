"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    CheckCircle2, XCircle, Clock, Car, User, Calendar, CircleDollarSign, KeyRound
} from "lucide-react"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TransactionConclue } from "@/src/types"
import { getMesDemandes, confirmerClient, refuserTransaction } from "@/src/actions/transactions.actions"
import Image from "next/image"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""

const statutConfig = {
    en_attente: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200" },
    confirmé:   { label: "Confirmé",   color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    expiré:     { label: "Expiré",     color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    refusé:     { label: "Refusé",     color: "bg-red-100 text-red-600 border-red-200" },
}

export default function TransactionsClientPage() {
    const [transactions, setTransactions] = useState<TransactionConclue[]>([])
    const [loading, setLoading]           = useState(true)
    const [codes, setCodes]               = useState<Record<string, string>>({})
    const [locationDates, setLocationDates] = useState<Record<string, { debut: string; fin: string }>>({})
    const [confirmLoading, setConfirmLoading] = useState<string | null>(null)

    const fetchData = useCallback(() => {
        getMesDemandes()
            .then(res => setTransactions(res?.data ?? []))
            .catch(() => toast.error("Erreur lors du chargement"))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // Recharge quand l'utilisateur revient sur l'onglet
    useRevalidateOnFocus(fetchData)
    // Recharge en temps réel via Reverb quand une transaction change
    useDataRefresh("transaction", fetchData)

    const handleConfirmer = async (t: TransactionConclue) => {
        const code = codes[t.id]?.trim()
        if (!code || code.length !== 6) {
            toast.error("Le code doit comporter 6 chiffres")
            return
        }
        const dates = locationDates[t.id]
        if (t.type === "location") {
            if (!dates?.debut || !dates?.fin) {
                toast.error("Les dates de début et de fin sont requises pour une location")
                return
            }
        }
        setConfirmLoading(t.id)
        try {
            await confirmerClient(t.id, {
                code,
                date_debut_location: t.type === "location" ? dates?.debut : undefined,
                date_fin_location:   t.type === "location" ? dates?.fin   : undefined,
            })
            toast.success("Transaction confirmée !")
            setTransactions(prev =>
                prev.map(tx => tx.id === t.id ? { ...tx, confirme_par_client: true } : tx)
            )
            // Recharge pour avoir le statut final
            const res = await getMesDemandes()
            setTransactions(res?.data ?? [])
        } catch {
            toast.error("Code incorrect ou transaction expirée")
        } finally {
            setConfirmLoading(null)
        }
    }

    const handleRefuser = async (id: string) => {
        try {
            await refuserTransaction(id)
            toast.success("Transaction refusée")
            setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, statut: "refusé" } : tx))
        } catch {
            toast.error("Erreur lors du refus")
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-8 w-48" />
                {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Mes transactions</h1>
                <p className="text-muted-foreground">Confirmez vos achats et locations avec le code reçu.</p>
            </div>

            {transactions.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3">
                    <Car className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Aucune transaction pour le moment</p>
                </div>
            )}

            <div className="space-y-4">
                {transactions.map(t => {
                    const cfg   = statutConfig[t.statut]
                    const photo = t.vehicule?.photos?.find(p => p.is_primary) ?? t.vehicule?.photos?.[0]
                    const isEnAttente = t.statut === "en_attente"

                    return (
                        <Card key={t.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {photo ? (
                                            <div className="relative h-14 w-20 rounded-lg overflow-hidden shrink-0">
                                                <Image
                                                    src={photo.path.startsWith('http') ? photo.path : `${BACKEND_URL}/storage/${photo.path}`}
                                                    alt="véhicule"
                                                    fill className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-14 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <Car className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div>
                                            <CardTitle className="text-base">
                                                {t.vehicule?.description?.marque} {t.vehicule?.description?.modele}
                                            </CardTitle>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                                <User className="h-3.5 w-3.5" />
                                                <span>{t.vendeur?.fullname}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className={`shrink-0 border ${cfg.color}`}>{cfg.label}</Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Infos du deal (visibles une fois le vendeur a confirmé) */}
                                {t.confirme_par_vendeur && t.type && (
                                    <div className="flex flex-wrap gap-4 text-sm bg-muted/50 rounded-lg p-3">
                                        <div className="flex items-center gap-1.5">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <span className="capitalize">{t.type}</span>
                                        </div>
                                        {t.prix_final && (
                                            <div className="flex items-center gap-1.5">
                                                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                                                <span>{Number(t.prix_final).toLocaleString("fr-FR")} FCFA</span>
                                            </div>
                                        )}
                                        {t.type === "location" && t.date_debut_location && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {new Date(t.date_debut_location).toLocaleDateString("fr-FR")} →{" "}
                                                    {t.date_fin_location && new Date(t.date_fin_location).toLocaleDateString("fr-FR")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Statut des confirmations */}
                                <div className="flex gap-4 text-sm">
                                    <div className={`flex items-center gap-1.5 ${t.confirme_par_vendeur ? "text-emerald-600" : "text-muted-foreground"}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Vendeur {t.confirme_par_vendeur ? "✓" : "en attente"}</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${t.confirme_par_client ? "text-emerald-600" : "text-muted-foreground"}`}>
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Vous {t.confirme_par_client ? "✓" : "en attente"}</span>
                                    </div>
                                </div>

                                {/* Expiration */}
                                {isEnAttente && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        Expire le {new Date(t.expires_at).toLocaleString("fr-FR")}
                                    </p>
                                )}

                                <Separator />

                                {/* Actions */}
                                {isEnAttente && !t.confirme_par_client && (
                                    <div className="space-y-3">
                                        {t.type === "location" && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" /> Date début
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={locationDates[t.id]?.debut ?? ""}
                                                        onChange={e => setLocationDates(prev => ({
                                                            ...prev,
                                                            [t.id]: { ...prev[t.id], debut: e.target.value }
                                                        }))}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" /> Date fin
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={locationDates[t.id]?.fin ?? ""}
                                                        onChange={e => setLocationDates(prev => ({
                                                            ...prev,
                                                            [t.id]: { ...prev[t.id], fin: e.target.value }
                                                        }))}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <Label className="text-sm flex items-center gap-1.5">
                                                <KeyRound className="h-4 w-4" />
                                                Code de confirmation (reçu par notification)
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="000000"
                                                    maxLength={6}
                                                    className="w-36 text-center tracking-widest font-mono text-lg"
                                                    value={codes[t.id] ?? ""}
                                                    onChange={e => setCodes(prev => ({ ...prev, [t.id]: e.target.value.replace(/\D/g, "") }))}
                                                />
                                                <Button
                                                    onClick={() => handleConfirmer(t)}
                                                    disabled={confirmLoading === t.id}
                                                    className="gap-1.5"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {confirmLoading === t.id ? "Envoi..." : "Confirmer"}
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" className="text-destructive border-destructive/30 gap-1.5">
                                                            <XCircle className="h-4 w-4" />
                                                            Refuser
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Refuser la transaction ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Le vendeur sera notifié et le véhicule restera disponible.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleRefuser(t.id)}
                                                                className="bg-red-600 hover:bg-red-700 text-white"
                                                            >
                                                                Confirmer le refus
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isEnAttente && t.confirme_par_client && !t.confirme_par_vendeur && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        En attente de la confirmation du vendeur…
                                    </p>
                                )}

                                {t.statut === "confirmé" && (
                                    <p className="text-sm text-emerald-600 flex items-center gap-2 font-medium">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Transaction finalisée avec succès
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
