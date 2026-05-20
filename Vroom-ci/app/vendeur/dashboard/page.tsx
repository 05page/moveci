"use client"

import { cn } from "@/src/lib/utils"
import { getErrorMessage } from "@/src/lib/handleError"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    Calendar,
    Car,
    CheckCircle2,
    Clock,
    Eye,
    Fuel,
    KeyRound,
    MapPin,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Phone,
    Plus,
    Star,
    Tag,
    TrendingUp,
    Users,
    Wallet,
    BarChart3,
    CalendarCheck,
    CircleDollarSign,
    Package,
    Bell,
    ChevronRight,
    Sparkles,
    RefreshCw,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { toast } from "sonner"
import Link from "next/link"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"
import {
    Bar, BarChart, CartesianGrid, Line, ComposedChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

//Endpoint vendeur
import { VendeurStats, VendeurRdv, Avis } from "@/src/types"
import { getMesStats } from "@/src/actions/stats.actions"
import { getAvisVendeur } from "@/src/actions/avis.actions"
import { updateProfile, updateContact } from "@/src/actions/auth.actions"
import { useUser } from "@/src/context/UserContext"
import type { User } from "@/src/types"

const VendeurDashboard = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats] = useState<VendeurStats | null>(null);
    const { user, setUser } = useUser()

    // État du dialog de modification de profil
    const [editOpen, setEditOpen]     = useState(false)
    const [saving, setSaving]         = useState(false)
    const [editForm, setEditForm]     = useState({
        fullname:  "",
        telephone: "",
        adresse:   "",
    })
    const [rdv, setRdv] = useState<VendeurRdv | null>(null);
    // Avis reçus par le vendeur connecté
    const [avisData, setAvisData] = useState<{ avis: Avis[]; note_moyenne: number; total: number } | null>(null)

    // Fetch des avis — séparé car user.id arrive de façon asynchrone via UserContext
    const fetchAvis = useCallback(() => {
        if (!user?.id) return
        getAvisVendeur(user.id)
            .then(res => setAvisData(res.data ?? null))
            .catch(() => {})
    }, [user?.id])

    useEffect(() => {
        fetchAvis()
    }, [fetchAvis])

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [statsRes] = await Promise.all([
                getMesStats()
            ]);
            setStats(statsRes?.data ?? null);
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Recharge les stats quand l'utilisateur revient sur l'onglet
    useRevalidateOnFocus(fetchData)
    // Recharge en temps réel via Reverb quand un RDV ou véhicule change
    useDataRefresh("rdv", fetchData)
    useDataRefresh("vehicule", fetchData)
    // Recharge les avis quand un client en laisse un nouveau
    useDataRefresh("avis", fetchAvis)

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    // Pré-remplit le form avec les données actuelles de l'user
    const openEdit = () => {
        setEditForm({
            fullname:  user?.fullname  ?? "",
            telephone: user?.telephone ?? "",
            adresse:   user?.adresse   ?? "",
        })
        setEditOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // fullname → PUT /me/update  |  telephone + adresse → PUT /me/contact
            await Promise.all([
                updateProfile({ fullname: editForm.fullname }),
                updateContact({ telephone: editForm.telephone, adresse: editForm.adresse }),
            ])
            // Met à jour le contexte user localement pour éviter un rechargement
            if (user) setUser({ ...user, ...editForm })
            toast.success("Profil mis à jour")
            setEditOpen(false)
        } catch {
            toast.error("Erreur lors de la mise à jour")
        } finally {
            setSaving(false)
        }
    }

    const formatMontant = (montant: number) => {
        if (montant >= 1000000) return `${(montant / 1000000).toFixed(1)}M`
        if (montant >= 1000) return `${(montant / 1000).toFixed(0)}K`
        return montant.toString()
    }

    const getStatutColor = (statut: string) => {
        switch (statut) {
            case "confirmé": return "bg-zinc-900/10 text-zinc-700 border-zinc-900/20"
            case "en_attente": return "bg-amber-500/10 text-amber-600 border-amber-500/20"
            case "terminé": return "bg-primary/10 text-primary border-primary/20"
            case "disponible": return "bg-zinc-900/10 text-zinc-700 border-zinc-900/20"
            case "réservé": return "bg-amber-500/10 text-amber-600 border-amber-500/20"
            case "vendu": return "bg-purple-500/10 text-purple-600 border-purple-500/20"
            default: return "bg-muted text-muted-foreground"
        }
    }

    const getStatutLabel = (statut: string) => {
        switch (statut) {
            case "confirmé": return "Confirmé"
            case "en_attente": return "En attente"
            case "terminé": return "Terminé"
            default: return statut.charAt(0).toUpperCase() + statut.slice(1)
        }
    }

    const getRdvTypeColor = (type: string) => {
        switch (type) {
            case "visite": return "bg-blue-500/10 text-blue-600"
            case "essai": return "bg-zinc-900/10 text-zinc-700"
            case "finalisation": return "bg-purple-500/10 text-purple-600"
            default: return "bg-muted text-muted-foreground"
        }
    }

    if (isLoading) {
        return (
            <div className="pt-20 px-4 md:px-6 space-y-4 md:space-y-6 max-w-6xl mx-auto mb-12">
                {/* Welcome Header Skeleton */}
                <Card className="rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-14 w-14 md:h-16 md:w-16 rounded-2xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-7 w-48 md:h-8 md:w-64" />
                                    <Skeleton className="h-4 w-32 md:w-48" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-36 rounded-xl" />
                                <Skeleton className="h-9 w-28 rounded-xl" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="w-10 h-10 rounded-xl" />
                                        <Skeleton className="h-5 w-14 rounded-full" />
                                    </div>
                                    <Skeleton className="h-7 w-24" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Charts + RDV Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <Card className="md:col-span-2 rounded-2xl md:rounded-3xl shadow-xl border border-border/40 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-4 md:p-6">
                            <Skeleton className="h-6 w-48 mb-6" />
                            <div className="flex items-end gap-3 h-48">
                                {[60, 80, 45, 90, 55, 70].map((h, i) => (
                                    <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl md:rounded-3xl shadow-xl border border-border/40 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-4 md:p-6 space-y-4">
                            <Skeleton className="h-6 w-40" />
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Table Skeleton */}
                <Card className="rounded-2xl md:rounded-3xl shadow-xl border border-border/40 bg-card/50 backdrop-blur-sm">
                    <div className="p-4 border-b border-border/40">
                        <div className="flex gap-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-10 w-28 rounded-lg" />
                            ))}
                        </div>
                    </div>
                    <div className="p-4 md:p-6 space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-28" />
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <>
        <FadeIn className="pt-20 px-4 md:px-6 space-y-4 md:space-y-6 max-w-6xl mx-auto mb-12">

            {/* ==================== WELCOME HEADER ==================== */}
            <SlideIn direction="left">
            <Card className="rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 md:h-16 md:w-16 border-4 border-background shadow-xl ring-4 ring-green-500 shrink-0">
                                <AvatarImage src="" alt={user?.fullname} />
                                <AvatarFallback className="text-xl md:text-2xl bg-linear-to-br from-green-500 to-green-600 text-white font-black">
                                    {user?.fullname.split(" ").map(n => n[0]).join("").toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <h1 className="text-xl md:text-2xl font-black tracking-tight">
                                        Bonjour, {user?.fullname.split(" ")[1]}
                                    </h1>
                                    <Badge className="bg-green-500 text-white font-bold rounded-full">
                                        Vendeur
                                    </Badge>
                                    {/* {vendeur.verified && (
                                        <Badge variant="outline" className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Vérifié
                                        </Badge>
                                    )} */}
                                </div>
                                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                                    Voici un apercu de votre activite ce mois-ci
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="gap-2 cursor-pointer"
                            >
                                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                                {refreshing ? "Chargement..." : "Rafraîchir"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openEdit}
                                className="rounded-xl cursor-pointer gap-2"
                            >
                                <Pencil className="h-4 w-4" />
                                Modifier le profil
                            </Button>
                            <Link href="/vendeur/addVehicle">
                                <Button size="sm" className="rounded-xl cursor-pointer bg-zinc-900 hover:bg-zinc-700 text-white font-bold">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Publier un vehicule
                                </Button>
                            </Link>
                            {/* <Link href="/vendeur/messages">
                                <Button variant="outline" size="sm" className="rounded-xl cursor-pointer relative">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Messages
                                    {stats.messagesNonLus > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {stats.messagesNonLus}
                                        </span>
                                    )}
                                </Button>
                            </Link> */}
                        </div>
                    </div>
                </CardContent>
            </Card>
            </SlideIn>

            {/* ==================== STATS KPI CARDS ==================== */}
            <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <StaggerItem>
                <Card className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-left">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-zinc-900/10 rounded-xl flex items-center justify-center shrink-0">
                                <Wallet className="h-5 w-5 text-zinc-700" />
                            </div>
                            <Badge variant="outline" className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full text-[10px] font-bold gap-1">
                                <ArrowUp className="h-3 w-3" />
                                {stats?.stats?.total_revenus}
                            </Badge>
                        </div>
                        <p className="text-xl md:text-2xl font-black text-zinc-700">{formatMontant(Number(stats?.stats?.total_revenus ?? 0))}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Revenus FCFA</p>
                    </CardContent>
                </Card>
                </StaggerItem>

                <StaggerItem>
                <Card className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Car className="h-5 w-5 text-zinc-700" />
                            </div>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 rounded-full text-[10px] font-bold gap-1">
                                <ArrowUp className="h-3 w-3" />
                                +2
                            </Badge>
                        </div>
                        <p className="text-xl md:text-2xl font-black text-zinc-700">{stats?.stats?.total_vehicule}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Annonces actives</p>
                    </CardContent>
                </Card>
                </StaggerItem>

                <StaggerItem>
                <Card className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Eye className="h-5 w-5 text-purple-600" />
                            </div>
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 rounded-full text-[10px] font-bold gap-1">
                                <ArrowUp className="h-3 w-3" />
                                {stats?.stats?.total_vues}%
                            </Badge>
                        </div>
                        <p className="text-xl md:text-2xl font-black text-zinc-700">{Number(stats?.stats?.total_vues_mois ?? 0).toLocaleString()}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Vues ce mois</p>
                    </CardContent>
                </Card>
                </StaggerItem>

                <StaggerItem>
                <Card className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-right">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Star className="h-5 w-5 text-amber-600" />
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{avisData?.total ?? 0} avis</span>
                        </div>
                        <p className="text-xl md:text-2xl font-black text-zinc-700">{avisData?.note_moyenne?.toFixed(1) ?? "—"}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < Math.floor(avisData?.note_moyenne ?? 0)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground/20"
                                        }`}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
                </StaggerItem>
            </StaggerList>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                {/* Revenue Chart */}
                <Card className="md:col-span-2 rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden animate-in fade-in slide-in-from-left duration-500 delay-100 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-zinc-700" />
                            </div>
                            <div>
                                <CardTitle className="text-base md:text-lg font-bold">Activité mensuelle</CardTitle>
                                <p className="text-xs text-muted-foreground">Vues, ventes et locations sur 12 mois</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-2">
                        {!stats?.stats_mensuel?.length ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                                <BarChart3 className="h-8 w-8 opacity-20" />
                                <p className="text-sm">Aucune activité enregistrée</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <ComposedChart
                                    data={stats.stats_mensuel.map(d => ({
                                        mois: d.nom_mois.slice(0, 3),
                                        vues: d.vues,
                                        ventes: d.ventes,
                                        locations: d.locations,
                                    }))}
                                    margin={{ left: -10, right: 8, top: 8, bottom: 0 }}
                                >
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="vues" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={38} />
                                    <YAxis yAxisId="trans" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={30} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #e4e4e7" }}
                                        labelStyle={{ fontWeight: 600 }}
                                    />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                    {/* Vues en barres (axe gauche) */}
                                    <Bar yAxisId="vues" dataKey="vues" name="Vues" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={20} />
                                    {/* Ventes et locations en lignes (axe droit) */}
                                    <Line yAxisId="trans" type="monotone" dataKey="ventes" name="Ventes" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} />
                                    <Line yAxisId="trans" type="monotone" dataKey="locations" name="Locations" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Prochains RDV */}
                <Card className="rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden animate-in fade-in slide-in-from-right duration-500 delay-100 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <CalendarCheck className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base md:text-lg font-bold">Prochains RDV</CardTitle>
                                    <p className="text-xs text-muted-foreground">{stats?.rdv?.rdv_recents.length} a venir</p>
                                </div>
                            </div>
                            <Badge className="bg-blue-500 text-white font-bold rounded-full">{stats?.rdv?.total_rdv}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-4 space-y-3">
                        {(stats?.rdv?.rdv_recents ?? []).map((rdv) => (
                            <div
                                key={rdv.id}
                                className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:shadow-md transition-all duration-300 cursor-pointer group"
                            >
                                <div className={`w-10 h-10 rounded-xl ${getRdvTypeColor(rdv.type_finalisation)} flex items-center justify-center shrink-0`}>
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold text-sm truncate">{rdv.client?.fullname}</p>
                                        <Badge variant="outline" className={`${getRdvTypeColor(rdv.type_finalisation)} rounded-full text-[10px] font-bold shrink-0 border-0`}>
                                            {rdv.type_finalisation.charAt(0).toUpperCase() + rdv.type_finalisation.slice(1)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{rdv.vehicule?.description?.marque}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {/* {rdv.date} - {rdv.heure} */}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {/* {rdv.lieu} */}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Link href="/vendeur/rdv">
                            <Button variant="ghost" size="sm" className="w-full rounded-xl cursor-pointer text-muted-foreground hover:text-foreground mt-1">
                                Voir tous les rendez-vous
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-6 animate-in fade-in slide-in-from-bottom duration-500 delay-150">
                <Card className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900/10 rounded-xl flex items-center justify-center shrink-0">
                            <Tag className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                            <p className="text-lg md:text-xl font-black text-zinc-700">{stats?.stats?.total_vehicule_vente}</p>
                            <p className="text-[10px] md:text-xs font-semibold text-muted-foreground">En vente</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                            <KeyRound className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-lg md:text-xl font-black text-zinc-700">{stats?.stats?.total_vehicule_loue}</p>
                            <p className="text-[10px] md:text-xs font-semibold text-muted-foreground">En location</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl md:rounded-3xl shadow-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-lg md:text-xl font-black text-zinc-700">{stats?.stats?.total_vehicule_vendu}</p>
                            <p className="text-[10px] md:text-xs font-semibold text-muted-foreground">Vendus</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ==================== TRANSACTIONS + TOP VEHICULES ==================== */}
            <Card className="rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700 delay-200 bg-card/50 backdrop-blur-sm">
                <Tabs defaultValue="transactions" className="w-full">
                    <div className="p-4 border-b border-border/40">
                        <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex">
                            <TabsTrigger value="transactions" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
                                <CircleDollarSign className="h-4 w-4" />
                                <span className="hidden md:inline">Transactions récentes</span>
                                <span className="md:hidden">Transactions</span>
                            </TabsTrigger>
                            <TabsTrigger value="vehicules" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
                                <Car className="h-4 w-4" />
                                <span className="hidden md:inline">Mes récents véhicules</span>
                                <span className="md:hidden">Véhicules</span>
                            </TabsTrigger>
                            <TabsTrigger value="mesvehicules" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black">
                                <Car className="h-4 w-4" />
                                <span className="hidden md:inline">Mon top véhicules</span>
                                <span className="md:hidden">Top Véhicules</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Transactions Tab */}
                    <TabsContent value="transactions" className="p-4 md:p-6 m-0">
                        {(stats?.rdv?.rdv_recents ?? []).length > 0 ? (
                            <div className="space-y-3">
                                {(stats?.rdv?.rdv_recents ?? []).map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-muted/30 border border-border/40 hover:shadow-md transition-all duration-300 cursor-pointer group"
                                    >
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${tx.type_finalisation === "vente" ? "bg-zinc-900/10" : "bg-blue-500/10"} flex items-center justify-center shrink-0`}>
                                            {tx.type_finalisation === "vente" ? (
                                                <Tag className={`h-5 w-5 md:h-6 md:w-6 text-zinc-700`} />
                                            ) : (
                                                <KeyRound className={`h-5 w-5 md:h-6 md:w-6 text-blue-600`} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm truncate">{tx.vehicule?.description.marque}</p>
                                                <Badge variant="outline" className={`${tx.type_finalisation === "vente" ? "bg-zinc-900/10 text-zinc-700 border-zinc-900/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"} rounded-full text-[10px] font-bold shrink-0`}>
                                                    {tx.type_finalisation === "vente" ? "Vente" : "Location"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-muted-foreground">{tx.client?.fullname}</span>
                                                <span className="text-[10px] text-muted-foreground/50">-</span>
                                                {/* <span className="text-xs text-muted-foreground">{tx.date}</span> */}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-sm"> <span className="text-[10px] font-normal text-muted-foreground">FCFA</span></p>
                                            {/* <Badge variant="outline" className={`${getStatutColor(tx.statut)} rounded-full text-[10px] font-bold`}>
                                            {getStatutLabel(tx.statut)}
                                        </Badge> */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Aucun véhicule pour le moment
                            </p>
                        )

                        }
                    </TabsContent>

                    {/* Récents véhicules Tab */}
                    <TabsContent value="vehicules" className="p-4 md:p-6 m-0">
                        {(stats?.top_vehicule_vues?.my_recent_vehicle ?? []).length > 0 ? (
                            <div className="space-y-3">
                                {(stats?.top_vehicule_vues?.my_recent_vehicle ?? []).map((v, index) => (
                                    <div
                                        key={v.id}
                                        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-muted/30 border border-border/40 hover:shadow-md transition-all duration-300 cursor-pointer group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900/10 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-black text-zinc-700">#{index + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{v?.description?.marque}</p>
                                                <Badge variant="outline" className={`${v.post_type === "vente" ? "bg-zinc-900/10 text-zinc-700 border-zinc-900/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"} rounded-full text-[10px] font-bold`}>
                                                    {v.post_type === "vente" ? "Vente" : "Location"}
                                                </Badge>
                                            </div>
                                            <p className="font-bold text-sm">{v?.description?.modele}</p>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    {v?.views_count} vues
                                                </span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Star className="h-3 w-3" />
                                                    {/* {v.favoris} favoris */}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <MessageCircle className="h-3 w-3" />
                                                    {/* {v.messages} msg */}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-sm text-zinc-700">{v?.prix} <span className="text-[10px] font-normal text-muted-foreground">FCFA</span></p>
                                            <Badge variant="outline" className={`${getStatutColor(v?.statut ?? "")} rounded-full text-[10px] font-bold mt-1`}>
                                                {v?.statut?.charAt(0).toUpperCase() + v?.statut?.slice(1)}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Aucun véhicule pour le moment
                            </p>
                        )}
                    </TabsContent>

                    {/* Top Vehicules Tab */}
                    <TabsContent value="mesvehicules" className="p-4 md:p-6 m-0">
                        {(stats?.top_vehicule_vues?.my_top_vehicle_most_vues ?? []).length > 0 ? (

                            <div className="space-y-3">
                                {(stats?.top_vehicule_vues?.my_top_vehicle_most_vues ?? []).map((v, index) => (
                                    <div
                                        key={v.id}
                                        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-muted/30 border border-border/40 hover:shadow-md transition-all duration-300 cursor-pointer group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900/10 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-black text-zinc-700">#{index + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{v?.description?.marque}</p>
                                                <Badge variant="outline" className={`${v.post_type === "vente" ? "bg-zinc-900/10 text-zinc-700 border-zinc-900/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"} rounded-full text-[10px] font-bold`}>
                                                    {v.post_type === "vente" ? "vente" : "location"}
                                                </Badge>
                                            </div>
                                            <p className="font-bold text-sm">{v?.description?.modele}</p>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    {v?.views_count} vues
                                                </span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Star className="h-3 w-3" />
                                                    {/* {v.favoris} favoris */}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <MessageCircle className="h-3 w-3" />
                                                    {/* {v.messages} msg */}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-sm text-zinc-700">{v?.prix} <span className="text-[10px] font-normal text-muted-foreground">FCFA</span></p>
                                            <Badge variant="outline" className={`${getStatutColor(v?.statut ?? "")} rounded-full text-[10px] font-bold mt-1`}>
                                                {v?.statut?.charAt(0).toUpperCase() + v?.statut?.slice(1)}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Aucun véhicule pour le moment
                            </p>
                        )}
                    </TabsContent>
                </Tabs>
            </Card>

            <Card className="rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 delay-300 bg-card/50 backdrop-blur-sm">
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg font-bold">Actions rapides</CardTitle>
                            <p className="text-xs text-muted-foreground">Accedez rapidement a vos outils</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-4">
                    <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <StaggerItem>
                        <Link href="/vendeur/addVehicle" className="group">
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-zinc-900/5 border border-zinc-900/10 hover:bg-zinc-900/10 hover:border-zinc-900/20 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-zinc-900/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus className="h-6 w-6 text-zinc-700" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold">Publier</p>
                                    <p className="text-[10px] text-muted-foreground">Nouveau vehicule</p>
                                </div>
                            </div>
                        </Link>
                        </StaggerItem>
                        <StaggerItem>
                        <Link href="/vendeur/vehicles" className="group">
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/20 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Car className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold">Mes annonces</p>
                                    <p className="text-[10px] text-muted-foreground">{stats?.stats?.total_vehicule} actives</p>
                                </div>
                            </div>
                        </Link>
                        </StaggerItem>
                        <StaggerItem>
                        <Link href="/vendeur/messages" className="group">
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/20 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                                    <MessageCircle className="h-6 w-6 text-amber-600" />
                                    {/* {stats.messagesNonLus > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                            {stats.messagesNonLus}
                                        </span>
                                    )} */}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold">Messages</p>
                                    {/* <p className="text-[10px] text-muted-foreground">{stats.messagesNonLus} non lus</p> */}
                                </div>
                            </div>
                        </Link>
                        </StaggerItem>
                        <StaggerItem>
                        <Link href="/vendeur/notifications" className="group">
                            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10 hover:border-purple-500/20 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Bell className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold">Notifications</p>
                                    <p className="text-[10px] text-muted-foreground">Alertes et rappels</p>
                                </div>
                            </div>
                        </Link>
                        </StaggerItem>
                    </StaggerList>
                </CardContent>
            </Card>

        </FadeIn>

        {/* ── Dialog modification de profil ── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" /> Modifier mon profil
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-fullname">Nom complet</Label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="edit-fullname"
                                className="pl-9"
                                value={editForm.fullname}
                                onChange={e => setEditForm(p => ({ ...p, fullname: e.target.value }))}
                                placeholder="Votre nom complet"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-telephone">Téléphone</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="edit-telephone"
                                className="pl-9"
                                value={editForm.telephone}
                                onChange={e => setEditForm(p => ({ ...p, telephone: e.target.value }))}
                                placeholder="+225 07 00 00 00 00"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-adresse">Adresse</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="edit-adresse"
                                className="pl-9"
                                value={editForm.adresse}
                                onChange={e => setEditForm(p => ({ ...p, adresse: e.target.value }))}
                                placeholder="Abidjan, Cocody..."
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
                        Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !editForm.fullname.trim()}>
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}

export default VendeurDashboard
