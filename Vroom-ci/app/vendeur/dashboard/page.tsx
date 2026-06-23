"use client"

import { cn } from "@/src/lib/utils"
import { getErrorMessage } from "@/src/lib/handleError"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
    BarChart3, Calendar, Car, CheckCircle2,
    Eye, KeyRound, Lock, MapPin,
    Pencil, Phone, Plus, RefreshCw,
    ShieldCheck, Star, Tag, TrendingUp, Wallet,
} from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { toast } from "sonner"
import Link from "next/link"
import {
    Bar, ComposedChart, CartesianGrid, Line,
    XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { VendeurStats, Avis } from "@/src/types"
import { getMesStats } from "@/src/actions/stats.actions"
import { getAvisVendeur } from "@/src/actions/avis.actions"
import { updateProfile, updateContact } from "@/src/actions/auth.actions"
import { useUser } from "@/src/context/UserContext"
import { ChangerMotDePasse } from "@/app/components/ChangerMotDePasse"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formate un montant : 1 500 000 → "1.5M", 75 000 → "75K" */
const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
    return n.toLocaleString("fr-FR")
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
    return (
        <div className="pt-20 px-4 md:px-8 max-w-6xl mx-auto pb-16 space-y-6">
            {/* Header */}
            <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                        <Skeleton className="h-20 w-20 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-7 w-52" />
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-32 rounded-xl" />
                            <Skeleton className="h-9 w-36 rounded-xl" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-3xl" />)}
            </div>
            {/* Chart + RDV */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="md:col-span-2 h-64 rounded-3xl" />
                <Skeleton className="h-64 rounded-3xl" />
            </div>
            {/* Bilan */}
            <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-3xl" />)}
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendeurDashboard() {
    const { user, setUser } = useUser()
    const [isLoading, setIsLoading]   = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats]           = useState<VendeurStats | null>(null)
    const [avisData, setAvisData]     = useState<{ avis: Avis[]; note_moyenne: number; total: number } | null>(null)

    // Dialogs
    const [editOpen, setEditOpen]               = useState(false)
    const [changePasswordOpen, setChangePasswordOpen] = useState(false)
    const [saving, setSaving]     = useState(false)
    const [editForm, setEditForm] = useState({ fullname: "", telephone: "", adresse: "" })

    // ── Fetches ──────────────────────────────────────────────

    const fetchAvis = useCallback(() => {
        if (!user?.id) return
        getAvisVendeur(user.id).then(res => setAvisData(res.data ?? null)).catch(() => {})
    }, [user?.id])

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await getMesStats()
            setStats(res?.data ?? null)
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { fetchAvis() }, [fetchAvis])
    useRevalidateOnFocus(fetchData)
    useDataRefresh("rdv",      fetchData)
    useDataRefresh("vehicule", fetchData)
    useDataRefresh("avis",     fetchAvis)

    // ── Handlers ─────────────────────────────────────────────

    const openEdit = () => {
        setEditForm({ fullname: user?.fullname ?? "", telephone: user?.telephone ?? "", adresse: user?.adresse ?? "" })
        setEditOpen(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await Promise.all([
                updateProfile({ fullname: editForm.fullname }),
                updateContact({ telephone: editForm.telephone, adresse: editForm.adresse }),
            ])
            if (user) setUser({ ...user, ...editForm })
            toast.success("Profil mis à jour")
            setEditOpen(false)
        } catch {
            toast.error("Erreur lors de la mise à jour")
        } finally {
            setSaving(false)
        }
    }

    // ── Derived values ────────────────────────────────────────

    const initiales    = user?.fullname?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"
    const noteMoyenne  = avisData?.note_moyenne ?? 0
    const g            = stats?.stats
    const topVehicules = stats?.top_vehicule_vues?.my_top_vehicle_most_vues ?? []
    const rdvRecents   = stats?.rdv?.rdv_recents ?? []
    const chartData    = (stats?.stats_mensuel ?? []).map(d => ({
        mois:      d.nom_mois.slice(0, 3),
        vues:      d.vues,
        ventes:    d.ventes,
        locations: d.locations,
    }))

    // Taux de conversion : véhicules vendus / total véhicules publiés (≥1)
    const totalPublies  = Number(g?.total_vehicule ?? 0) + Number(g?.total_vehicule_vendu ?? 0)
    const tauxConversion = totalPublies > 0 ? Math.round((Number(g?.total_vehicule_vendu ?? 0) / totalPublies) * 100) : 0

    if (isLoading) return <DashboardSkeleton />

    return (
        <>
        <div className="pt-20 px-4 md:px-8 max-w-6xl mx-auto pb-16 space-y-6">

            {/* ══════════════════════════════════════════════════
                BLOC 1 — PROFIL
            ══════════════════════════════════════════════════ */}
            <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                        {/* Avatar + identité */}
                        <div className="flex items-center gap-5">
                            <Avatar className="h-20 w-20 border-4 border-white shadow-lg ring-2 ring-green-500 shrink-0">
                                <AvatarImage src="" alt={user?.fullname} />
                                <AvatarFallback className="text-2xl font-black bg-zinc-900 text-white">
                                    {initiales}
                                </AvatarFallback>
                            </Avatar>

                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                                        {user?.fullname}
                                    </h1>
                                    <Badge className="bg-green-500 text-white font-bold rounded-full text-xs px-2.5">
                                        Vendeur
                                    </Badge>
                                    {user?.email_verified_at && (
                                        <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 font-semibold text-xs gap-1">
                                            <ShieldCheck className="h-3 w-3 text-green-500" />
                                            Profil vérifié
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500">
                                    {user?.adresse && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />{user.adresse}
                                        </span>
                                    )}
                                    {(user?.created_at || user?.email_verified_at) && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Membre depuis {new Date(user.created_at ?? user.email_verified_at!).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setRefreshing(true); fetchData() }}
                                disabled={refreshing}
                                className="rounded-xl gap-2 cursor-pointer border-zinc-200"
                            >
                                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                                {refreshing ? "..." : "Actualiser"}
                            </Button>
                            <Link href="/vendeur/addVehicle">
                                <Button size="sm" className="rounded-xl gap-2 cursor-pointer bg-zinc-900 hover:bg-zinc-700 text-white font-bold">
                                    <Plus className="h-4 w-4" />
                                    Publier un véhicule
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════════════════
                BLOC 2 — STATS KPI
            ══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                {/* Revenus */}
                {/* <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5">
                        <div className="w-11 h-11 rounded-2xl bg-move-gold/10 flex items-center justify-center mb-3">
                            <Wallet className="h-5 w-5 text-move-gold" />
                        </div>
                        <p className="text-2xl font-black text-zinc-900">{fmt(Number(g?.total_revenus ?? 0))}</p>
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-0.5">Revenus FCFA</p>
                    </CardContent>
                </Card> */}

                {/* Annonces */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                            <Car className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-black text-zinc-900">{g?.total_vehicule ?? 0}</p>
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-0.5">Annonces actives</p>
                    </CardContent>
                </Card>

                {/* Vues */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5">
                        <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center mb-3">
                            <Eye className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-2xl font-black text-zinc-900">{fmt(Number(g?.total_vues_mois ?? 0))}</p>
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-0.5">Vues ce mois</p>
                    </CardContent>
                </Card>

                {/* Note */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5">
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
                            <Star className="h-5 w-5 text-move-gold" />
                        </div>
                        <p className="text-2xl font-black text-zinc-900">{noteMoyenne ? noteMoyenne.toFixed(1) : "—"}</p>
                        <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn("h-3 w-3", i < Math.floor(noteMoyenne) ? "fill-move-gold text-move-gold" : "text-zinc-200")} />
                            ))}
                            <span className="text-xs text-zinc-400 ml-1">({avisData?.total ?? 0})</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ══════════════════════════════════════════════════
                BLOC 3 — INFOS PERSONNELLES + SÉCURITÉ
            ══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Informations Personnelles */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-zinc-900">Informations Personnelles</h2>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={openEdit}
                                className="text-move-gold hover:text-move-gold hover:bg-move-gold/10 font-semibold cursor-pointer"
                            >
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Modifier
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: "Nom Complet",   value: user?.fullname },
                                { label: "Adresse Email", value: user?.email },
                                { label: "Téléphone",     value: user?.telephone },
                                { label: "Adresse",       value: user?.adresse },
                            ].map(row => (
                                <div key={row.label} className="space-y-1">
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{row.label}</p>
                                    <div className="h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center">
                                        <p className="text-sm font-semibold text-zinc-700">{row.value ?? "Non défini"}</p>
                                    </div>
                                </div>
                            ))}
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
                                <span className="text-xs font-semibold text-zinc-400 bg-zinc-200 px-2 py-1 rounded-full shrink-0">
                                    Bientôt
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ══════════════════════════════════════════════════
                BLOC 4 — BILAN
            ══════════════════════════════════════════════════ */}

            {/* Sous-stats : En vente / En location / Vendus */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                            <Tag className="h-5 w-5 text-zinc-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-zinc-900">{g?.total_vehicule_vente ?? 0}</p>
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">En vente</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                            <KeyRound className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-zinc-900">{g?.total_vehicule_loue ?? 0}</p>
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">En location</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-zinc-900">{g?.total_vehicule_vendu ?? 0}</p>
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Vendus</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chart activité + Prochains RDV */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Graphique activité mensuelle */}
                <Card className="md:col-span-2 rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-11 h-11 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                                <BarChart3 className="h-5 w-5 text-zinc-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-zinc-900">Activité mensuelle</h2>
                                <p className="text-xs text-zinc-400">Vues, ventes et locations sur 12 mois</p>
                            </div>
                        </div>

                        {chartData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-zinc-300 gap-2">
                                <BarChart3 className="h-10 w-10" />
                                <p className="text-sm text-zinc-400">Aucune activité enregistrée</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={210}>
                                <ComposedChart data={chartData} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f4f4f5" />
                                    <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
                                    <YAxis yAxisId="v"  tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} width={34} />
                                    <YAxis yAxisId="t"  orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} width={28} />
                                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e4e4e7" }} labelStyle={{ fontWeight: 700 }} />
                                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "#71717a" }} />
                                    <Bar    yAxisId="v" dataKey="vues"      name="Vues"      fill="#e4e4e7" radius={[4,4,0,0]} barSize={16} />
                                    <Line   yAxisId="t" dataKey="ventes"    name="Ventes"    type="monotone" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} />
                                    <Line   yAxisId="t" dataKey="locations" name="Locations" type="monotone" stroke="oklch(0.80 0.175 83)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.80 0.175 83)", strokeWidth: 0 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Prochains RDV */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-black text-zinc-900">Prochains RDV</h2>
                                <p className="text-xs text-zinc-400">{stats?.rdv?.total_rdv ?? 0} au total</p>
                            </div>
                            <Link href="/vendeur/rdv">
                                <Button variant="ghost" size="sm" className="text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer rounded-xl">
                                    Voir tout →
                                </Button>
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {rdvRecents.length === 0 ? (
                                <div className="flex flex-col items-center py-8 text-center">
                                    <Calendar className="h-8 w-8 text-zinc-200 mb-2" />
                                    <p className="text-sm text-zinc-400">Aucun RDV à venir</p>
                                </div>
                            ) : rdvRecents.map(rdv => (
                                <div key={rdv.id} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-zinc-900 truncate">{rdv.client?.fullname ?? "Client"}</p>
                                        <p className="text-xs text-zinc-400 truncate">{rdv.vehicule?.description?.marque} {rdv.vehicule?.description?.modele}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                                        {rdv.type_finalisation}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bilan global : taux de conversion + top véhicules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Taux de conversion */}
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-move-gold/10 flex items-center justify-center shrink-0">
                                <TrendingUp className="h-5 w-5 text-move-gold" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-zinc-900">Bilan</h2>
                                <p className="text-xs text-zinc-400">Taux de conversion</p>
                            </div>
                        </div>

                        <div className="text-center py-2">
                            <p className="text-5xl font-black text-zinc-900">{tauxConversion}<span className="text-2xl text-zinc-400">%</span></p>
                            <p className="text-xs text-zinc-400 mt-1">de vos annonces se sont conclues</p>
                        </div>

                        {/* Barre de progression */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span>Vendus</span>
                                <span className="font-bold">{g?.total_vehicule_vendu ?? 0} / {totalPublies}</span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-move-gold rounded-full transition-all duration-700"
                                    style={{ width: `${tauxConversion}%` }}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Vues totales */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500">Vues totales</span>
                            <span className="font-black text-zinc-900">{fmt(Number(g?.total_vues ?? 0))}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Top véhicules les plus vus */}
                <Card className="md:col-span-2 rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-black text-zinc-900">Top véhicules</h2>
                                <p className="text-xs text-zinc-400">Vos annonces les plus consultées</p>
                            </div>
                            <Link href="/vendeur/vehicles">
                                <Button variant="ghost" size="sm" className="text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer rounded-xl">
                                    Mes annonces →
                                </Button>
                            </Link>
                        </div>

                        {topVehicules.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-center">
                                <Car className="h-8 w-8 text-zinc-200 mb-2" />
                                <p className="text-sm text-zinc-400">Aucune annonce pour le moment</p>
                                <Link href="/vendeur/addVehicle" className="mt-3">
                                    <Button size="sm" className="rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white gap-2 cursor-pointer text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Publier un véhicule
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topVehicules.map((v, i) => (
                                    <div key={v.id} className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                                        {/* Rang */}
                                        <div className={cn(
                                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black",
                                            i === 0 ? "bg-move-gold/20 text-move-gold" :
                                            i === 1 ? "bg-zinc-200 text-zinc-600" :
                                                      "bg-amber-50 text-amber-700"
                                        )}>
                                            #{i + 1}
                                        </div>

                                        {/* Infos */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-zinc-900 truncate">
                                                {v.description?.marque} {v.description?.modele}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {v.description?.annee} · {v.description?.carburant}
                                            </p>
                                        </div>

                                        {/* Vues */}
                                        <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                                            <Eye className="h-3.5 w-3.5" />
                                            {v.views_count} vues
                                        </div>

                                        {/* Prix */}
                                        <p className="font-black text-sm text-zinc-900 shrink-0">
                                            {fmt(Number(v.prix ?? 0))}
                                            <span className="text-[10px] font-normal text-zinc-400 ml-0.5">FCFA</span>
                                        </p>

                                        {/* Badge type */}
                                        <Badge variant="outline" className={cn(
                                            "rounded-full text-[10px] font-bold shrink-0",
                                            v.post_type === "vente"
                                                ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                                                : "bg-blue-50 text-blue-600 border-blue-200"
                                        )}>
                                            {v.post_type === "vente" ? "Vente" : "Location"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>

        {/* ── Dialog modifier le profil ── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="font-black text-zinc-900 flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Modifier mon profil
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {([
                        { id: "fullname",  label: "Nom complet",   placeholder: "Votre nom complet",   field: "fullname"  as const },
                        { id: "telephone", label: "Téléphone",     placeholder: "+225 07 00 00 00 00", field: "telephone" as const },
                        { id: "adresse",   label: "Adresse",       placeholder: "Abidjan, Cocody…",   field: "adresse"   as const },
                    ] as const).map(f => (
                        <div key={f.id} className="space-y-1.5">
                            <Label htmlFor={f.id} className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                                {f.label}
                            </Label>
                            <Input
                                id={f.id}
                                className="rounded-xl h-11 border-zinc-200"
                                value={editForm[f.field]}
                                onChange={e => setEditForm(p => ({ ...p, [f.field]: e.target.value }))}
                                placeholder={f.placeholder}
                            />
                        </div>
                    ))}
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving} className="rounded-xl cursor-pointer">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !editForm.fullname.trim()}
                        className="rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white cursor-pointer"
                    >
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <ChangerMotDePasse open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
        </>
    )
}
