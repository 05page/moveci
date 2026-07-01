 "use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Wallet, Clock, CheckCircle2, Tag, Key, User,
    FileText, XCircle, Car, KeyRound, CircleDollarSign, Calendar,
} from "lucide-react"
import { TransactionConclue } from "@/src/types"
import { getMesTransactions, confirmerVendeur, refuserTransactionVendeur } from "@/src/actions/transactions.actions"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""

const statutConfig: Record<string, { label: string; color: string }> = {
    en_attente: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200" },
    confirmé: { label: "Confirmé", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    expiré: { label: "Expiré", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    refusé: { label: "Refusé", color: "bg-red-100 text-red-600 border-red-200" },
}

interface ConfirmForm {
    code: string
}

export default function TransactionsVendeurPage() {
    const [transactions, setTransactions] = useState<TransactionConclue[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [forms, setForms] = useState<Record<string, ConfirmForm>>({})
    const [confirmLoading, setConfirmLoading] = useState<string | null>(null)
    const [refusLoading, setRefusLoading] = useState<string | null>(null)
    const [motifs, setMotifs] = useState<Record<string, string>>({})

    const fetchData = useCallback(() => {
        getMesTransactions()
            .then(res => setTransactions(res?.data ?? []))
            .catch(() => toast.error("Erreur lors du chargement"))
            .finally(() => setIsLoading(false))
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // Recharge quand l'utilisateur revient sur l'onglet
    useRevalidateOnFocus(fetchData)
    // Recharge en temps réel via Reverb quand une transaction change
    useDataRefresh("transaction", fetchData)

    const getForm = (id: string): ConfirmForm =>
        forms[id] ?? { code: "" }

    const setForm = (id: string, patch: Partial<ConfirmForm>) =>
        setForms(prev => ({ ...prev, [id]: { ...getForm(id), ...patch } }))

    const handleConfirmerVendeur = async (t: TransactionConclue) => {
        const form = getForm(t.id)
        if (!form.code || form.code.length !== 6) { toast.error("Code à 6 chiffres requis"); return }

        setConfirmLoading(t.id)
        try {
            await confirmerVendeur(t.id, form.code)
            toast.success("Confirmation envoyée !")
            const res = await getMesTransactions()
            setTransactions(res?.data ?? [])
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Code incorrect ou transaction expirée")
        }
        finally {
            setConfirmLoading(null)
        }
    }

    const handleRefuserVendeur = async (t: TransactionConclue) => {
        setRefusLoading(t.id)
        try {
            await refuserTransactionVendeur(t.id, motifs[t.id])
            toast.success("Transaction refusée — le véhicule est de nouveau disponible")
            fetchData()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur survenue lors de l'annulation")
        }
        finally {
            setRefusLoading(null)
        }
    }

    const enAttente = transactions.filter(t => t.statut === "en_attente")
    const confirmes = transactions.filter(t => t.statut === "confirmé")
    const totalPrix = confirmes.reduce((s, t) => s + (t.prix_final ?? 0), 0)

    const filterTab = (tab: string) => {
        if (tab === "ventes") return transactions.filter(t => t.type === "vente")
        if (tab === "locations") return transactions.filter(t => t.type === "location")
        if (tab === "attente") return enAttente
        return transactions
    }

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-zinc-700" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Transactions</h1>
                    <p className="text-muted-foreground text-sm">Ventes et locations conclues après vos RDV</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total confirmé", value: `${totalPrix.toLocaleString("fr-FR")} FCFA`, icon: Wallet },
                    { label: "En attente", value: enAttente.length, icon: Clock },
                    { label: "Ventes conclues", value: confirmes.filter(t => t.type === "vente").length, icon: Tag },
                    { label: "Locations conclues", value: confirmes.filter(t => t.type === "location").length, icon: Key },
                ].map((s, i) => (
                    <Card key={i}>
                        <CardContent className="p-4 flex flex-col gap-1">
                            <s.icon className="h-5 w-5 text-muted-foreground mb-1" />
                            <p className="text-xl font-bold">{s.value}</p>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Liste */}
            <Tabs defaultValue="toutes">
                <TabsList className="mb-4">
                    <TabsTrigger value="toutes">Toutes ({transactions.length})</TabsTrigger>
                    <TabsTrigger value="attente">En attente ({enAttente.length})</TabsTrigger>
                    <TabsTrigger value="ventes">Ventes</TabsTrigger>
                    <TabsTrigger value="locations">Locations</TabsTrigger>
                </TabsList>

                {["toutes", "attente", "ventes", "locations"].map(tab => (
                    <TabsContent key={tab} value={tab} className="space-y-4">
                        {filterTab(tab).length === 0 && (
                            <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
                                <FileText className="h-10 w-10 opacity-30" />
                                <p className="text-sm">Aucune transaction</p>
                            </div>
                        )}
                        {filterTab(tab).map(t => {
                            const cfg = statutConfig[t.statut]
                            const photo = t.vehicule?.photos?.find(p => p.is_primary) ?? t.vehicule?.photos?.[0]
                            const form = getForm(t.id)
                            const isEnAttente = t.statut === "en_attente"

                            // Prix estimé calculé depuis vehicule.prix (tarif/jour pour location)
                            const prixEstime = (() => {
                                const base = t.vehicule?.prix ? Number(t.vehicule.prix) : null
                                if (!base) return { valeur: "—", label: "Prix total (FCFA)" }
                                if (t.type === "vente") return { valeur: base.toLocaleString("fr-FR"), label: "Prix total (FCFA)" }
                                if (t.date_debut_location && t.date_fin_location) {
                                    const jours = Math.max(1, Math.ceil(
                                        (new Date(t.date_fin_location).getTime() - new Date(t.date_debut_location).getTime()) / 86400000
                                    ))
                                    return { valeur: (base * jours).toLocaleString("fr-FR"), label: `Prix estimé (${jours}j × ${base.toLocaleString("fr-FR")} FCFA)` }
                                }
                                return { valeur: `${base.toLocaleString("fr-FR")} /jour`, label: "Tarif journalier (dates non reçues)" }
                            })()

                            return (
                                <Card key={t.id} className={cn(isEnAttente && "border-amber-300")}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                {photo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={photo.path.startsWith('http') ? photo.path : `${BACKEND_URL}/storage/${photo.path}`}
                                                        alt="véhicule"
                                                        className="h-14 w-20 object-cover rounded-lg shrink-0"
                                                    />
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
                                                        <span>{t.client?.fullname}</span>
                                                    </div>
                                                    {t.type && (
                                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                            {t.type === "vente" ? <Tag className="h-3.5 w-3.5" /> : <Key className="h-3.5 w-3.5" />}
                                                            <span className="capitalize">{t.type}</span>
                                                            {t.prix_final && <span>— {Number(t.prix_final).toLocaleString("fr-FR")} FCFA</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge className={`shrink-0 border ${cfg.color}`}>{cfg.label}</Badge>
                                        </div>
                                    </CardHeader>

                                    {/* Formulaire de confirmation vendeur */}
                                    {isEnAttente && !t.confirme_par_vendeur && t.confirme_par_client && (
                                        <CardContent className="space-y-4 pt-0">
                                            <Separator />
                                            <p className="text-sm font-medium">Confirmez avec votre code reçu par notification</p>

                                            {/* Infos du deal — lecture seule */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs flex items-center gap-1">
                                                        <CircleDollarSign className="h-3.5 w-3.5" /> {prixEstime.label}
                                                    </Label>
                                                    <Input
                                                        disabled
                                                        value={prixEstime.valeur}
                                                        className="font-mono bg-muted"
                                                    />
                                                </div>
                                                {t.type === "location" && (
                                                    <>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" /> Date début
                                                            </Label>
                                                            <Input
                                                                disabled
                                                                value={t.date_debut_location
                                                                    ? new Date(t.date_debut_location).toLocaleDateString("fr-FR")
                                                                    : "En attente du client"}
                                                                className="bg-muted"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" /> Date fin
                                                            </Label>
                                                            <Input
                                                                disabled
                                                                value={t.date_fin_location
                                                                    ? new Date(t.date_fin_location).toLocaleDateString("fr-FR")
                                                                    : "En attente du client"}
                                                                className="bg-muted"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex items-end gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Code de confirmation</Label>
                                                    <Input
                                                        placeholder="000000"
                                                        maxLength={6}
                                                        className="w-32 text-center tracking-widest font-mono text-lg"
                                                        value={form.code}
                                                        onChange={e => setForm(t.id, { code: e.target.value.replace(/\D/g, "") })}
                                                    />
                                                </div>
                                                <Button
                                                    onClick={() => handleConfirmerVendeur(t)}
                                                    disabled={confirmLoading === t.id || refusLoading === t.id}
                                                    className="gap-1.5"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {confirmLoading === t.id ? "Envoi..." : "Confirmer"}
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            disabled={confirmLoading === t.id || refusLoading === t.id}
                                                            className="gap-1.5 text-red-500 hover:text-red-600 hover:border-red-200"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                            {refusLoading === t.id ? "Refus..." : "Refuser"}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Refuser la transaction ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Le client sera notifié et un signalement sera créé sur votre compte.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <Textarea
                                                            placeholder="Raison du refus (optionnel)"
                                                            value={motifs[t.id] ?? ""}
                                                            onChange={e => setMotifs(prev => ({ ...prev, [t.id]: e.target.value }))}
                                                        />
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleRefuserVendeur(t)}
                                                                className="bg-red-600 hover:bg-red-700 text-white"
                                                            >
                                                                Confirmer le refus
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </CardContent>
                                    )}

                                    {isEnAttente && !t.confirme_par_vendeur && !t.confirme_par_client && (
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-500" />
                                                En attente de la confirmation du client…
                                            </p>
                                        </CardContent>
                                    )}

                                    {t.statut === "confirmé" && (
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-emerald-600 flex items-center gap-2 font-medium">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Transaction finalisée — véhicule marqué comme {t.type === "vente" ? "vendu" : "loué"}
                                            </p>
                                        </CardContent>
                                    )}

                                    {t.statut === "refusé" && (
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-red-500 flex items-center gap-2">
                                                <XCircle className="h-4 w-4" />
                                                Transaction refusée — le véhicule est de nouveau disponible
                                            </p>
                                        </CardContent>
                                    )}
                                </Card>
                            )
                        })}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
