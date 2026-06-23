"use client"

import { getErrorMessage } from "@/src/lib/handleError"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, MapPin, Star, Edit, Car, ShoppingBag, ShieldCheck, Lock } from "lucide-react"
import { useEffect, useState } from "react"
import { EditProfil } from "@/app/components/EditProfil"
import { ChangerMotDePasse } from "@/app/components/ChangerMotDePasse"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/src/lib/api"
import { getMesDemandes } from "@/src/actions/transactions.actions"
import { Avis, TransactionConclue } from "@/src/types"
import { useUser } from "@/src/context/UserContext"

function ProfileLoading() {
    return (
        <div className="space-y-6">
            <Card className="rounded-3xl border border-zinc-200 bg-white">
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <Skeleton className="h-24 w-24 rounded-full shrink-0" />
                        <div className="flex-1 space-y-3">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 sm:h-24 rounded-2xl sm:rounded-3xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 rounded-3xl" />
                <Skeleton className="h-64 rounded-3xl" />
            </div>
        </div>
    )
}

export function ProfileContent() {
    const { user } = useUser()
    const [transactions, setTransactions] = useState<TransactionConclue[]>([])
    const [open, setOpen]                           = useState(false)
    const [changePasswordOpen, setChangePasswordOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [avisData, setAvisData] = useState<{ avis: Avis[]; note_moyenne: number; total: number } | null>(null)

    useEffect(() => {
        if (!user) return
        const fetchData = async () => {
            try {
                setIsLoading(true)
                const txRes = await getMesDemandes()
                setTransactions(txRes.data ?? [])
                if (user.role === "vendeur") {
                    const avisRes = await api.get<{ avis: Avis[]; note_moyenne: number; total: number }>(`/avis/vendeur/${user.id}`)
                    setAvisData(avisRes.data ?? null)
                }
            } catch (error) {
                toast.error(getErrorMessage(error))
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [user?.id])

    const mesVoituresLouees = transactions.filter(t => t.statut === "confirmé" && t.type === "location")
    const mesVoituresAchetees = transactions.filter(t => t.statut === "confirmé" && t.type === "vente")
    const initiales = user?.fullname?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"

    if (isLoading) return <ProfileLoading />

    return (
        <div className="space-y-6">

            {/* ── Header ───────────────────────────────────────── */}
            <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">

                        {/* Avatar */}
                        <div className="shrink-0">
                            <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-zinc-100">
                                <AvatarImage src="" alt={user?.fullname} />
                                <AvatarFallback className="text-3xl font-black bg-zinc-900 text-white">
                                    {initiales}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Infos */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">
                                    {user?.fullname ?? ""}
                                </h1>
                                {user?.email_verified_at && (
                                    <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 font-semibold text-xs gap-1 self-center">
                                        <ShieldCheck className="h-3 w-3 text-green-500" />
                                        PROFIL VÉRIFIÉ
                                    </Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-zinc-500">
                                {user?.adresse && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {user.adresse}
                                    </span>
                                )}
                                {(user?.created_at || user?.email_verified_at) && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Inscrit le {new Date(user.created_at ?? user.email_verified_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Stats ────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-move-gold/10 flex items-center justify-center shrink-0">
                            <Car className="h-4 w-4 sm:h-5 sm:w-5 text-move-gold" />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xl sm:text-2xl font-black text-zinc-900">{mesVoituresLouees.length}</p>
                            <p className="text-[9px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wide leading-tight">Voitures louées</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-move-gold" />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xl sm:text-2xl font-black text-zinc-900">
                                {user?.role === "vendeur" ? (avisData?.total ?? 0) : "—"}
                            </p>
                            <p className="text-[9px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wide leading-tight">Notes générales</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-3 sm:p-5 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xl sm:text-2xl font-black text-zinc-900">{mesVoituresAchetees.length}</p>
                            <p className="text-[9px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wide leading-tight">Voitures achetées</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Infos + Sécurité ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Informations Personnelles */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-zinc-900">Informations Personnelles</h2>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setOpen(true)}
                                className="text-move-gold hover:text-move-gold hover:bg-move-gold/10 font-semibold cursor-pointer"
                            >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Modifier
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Nom Complet</p>
                                <div className="h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center">
                                    <p className="text-sm font-semibold text-zinc-700">{user?.fullname ?? "—"}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Adresse Email</p>
                                <div className="h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center">
                                    <p className="text-sm font-semibold text-zinc-700">{user?.email ?? "—"}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Téléphone</p>
                                <div className="h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center">
                                    <p className="text-sm font-semibold text-zinc-700">{user?.telephone ?? "Non défini"}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sécurité */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-zinc-900">Sécurité</h2>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setChangePasswordOpen(true)}
                                className="text-move-gold hover:text-move-gold hover:bg-move-gold/10 font-semibold cursor-pointer"
                            >
                                Mettre à jour
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50">
                                <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center shrink-0">
                                    <Lock className="h-4 w-4 text-zinc-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-zinc-800">Mot de passe</p>
                                    <p className="text-xs text-zinc-400">Dernière modification : inconnue</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50">
                                <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-4 w-4 text-zinc-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-zinc-800">Double Authentification</p>
                                    <p className="text-xs text-zinc-400">Sécurisez davantage votre compte</p>
                                </div>
                                <span className="text-xs font-semibold text-zinc-400 bg-zinc-200 px-2 py-1 rounded-full">
                                    Bientôt
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {user && <EditProfil open={open} onOpenChange={setOpen} onSubmit={() => {}} user={user} />}
            <ChangerMotDePasse open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
        </div>
    )
}
