"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Calendar, Mail, Phone, MapPin, Star, Edit, Car,
    ShoppingBag, CheckCircle2, Clock, XCircle, User,
} from "lucide-react"
import { useEffect, useState } from "react"
import { EditProfil } from "@/app/components/EditProfil"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/src/lib/api"
import { getMesDemandes } from "@/src/actions/transactions.actions"
import { ClientRdvItem, Avis, TransactionConclue } from "@/src/types"
import { useUser } from "@/src/context/UserContext"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"

function ProfileLoading() {
    return (
        <div className="space-y-4 md:space-y-6">
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden bg-white">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">
                        <Skeleton className="h-20 w-20 md:h-28 md:w-28 rounded-full shrink-0" />
                        <div className="flex-1 w-full space-y-4 md:space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                                <div className="space-y-2 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3">
                                        <Skeleton className="h-7 md:h-8 w-36 md:w-40" />
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-48 mx-auto md:mx-0" />
                                </div>
                                <Skeleton className="h-9 w-40 rounded-xl mx-auto md:mx-0" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 pt-4 border-t border-zinc-200">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                                        <div className="space-y-1.5 flex-1">
                                            <Skeleton className="h-3 w-12" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-10" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden bg-white">
                <div className="p-4 border-b border-zinc-200">
                    <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-10 rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="p-4 md:p-6">
                    <div className="flex flex-col items-center justify-center py-8 md:py-12">
                        <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-full mb-4" />
                        <Skeleton className="h-5 w-40 md:w-48" />
                    </div>
                </div>
            </Card>
        </div>
    )
}

export function ProfileContent() {
    const {user} = useUser()
    const [rdvList, setRdvList] = useState<ClientRdvItem[]>([])
    const [transactions, setTransactions] = useState<TransactionConclue[]>([])
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    // Avis reçus — chargé uniquement si l'utilisateur est un vendeur
    const [avisData, setAvisData] = useState<{ avis: Avis[]; note_moyenne: number; total: number } | null>(null)

    useEffect(() => {
        if (!user) return
        const fetchData = async () => {
            try {
                setIsLoading(true)
                const [rdvRes, txRes] = await Promise.all([
                    api.get<ClientRdvItem[]>("/rdv/mes-rdv"),
                    getMesDemandes(),
                ])
                setRdvList(rdvRes.data ?? [])
                setTransactions(txRes.data ?? [])

                // Avis reçus — uniquement pour un vendeur
                if (user.role === "vendeur") {
                    const avisRes = await api.get<{ avis: Avis[]; note_moyenne: number; total: number }>(`/avis/vendeur/${user.id}`)
                    setAvisData(avisRes.data ?? null)
                }
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Erreur serveur")
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [user?.id])

    const handleSubmit = () => {
        toast.success("Profil modifié avec succès")
    }

    const mesRdv = rdvList
    // Transactions conclues (statut confirmé)
    const mesVoituresLouees = transactions.filter(t => t.statut === "confirmé" && t.type === "location")
    const mesVoituresAchetees = transactions.filter(t => t.statut === "confirmé" && t.type === "vente")
    // Avis laissés par le client (RDV terminés pour lesquels un avis a été soumis)
    const nbAvisLaisses = rdvList.filter(r => r.statut === "terminé" && r.has_avis).length

    if (isLoading) {
        return <ProfileLoading />
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Profile Card */}
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 bg-white">
                <CardContent className="p-4 md:p-6 relative">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">
                        <Avatar
                            className={`h-20 w-20 md:h-28 md:w-28 border-4 border-background shadow-2xl ring-4 shrink-0 ${
                                user?.role === "client" ? "ring-orange-500" : "ring-accent"
                            }`}
                        >
                            <AvatarImage src="" alt={user?.fullname} />
                            <AvatarFallback className="text-2xl md:text-4xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground font-black">
                                {user?.fullname?.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 w-full space-y-4 md:space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                                <div className="space-y-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3">
                                        <h1 className="text-xl md:text-3xl font-black tracking-tight">{user?.fullname ?? ""}</h1>
                                        <Badge
                                            className={`font-bold rounded-full ${
                                                user?.role === "client" ? "bg-orange-500 text-primary-foreground"
                                                : user?.role === "vendeur" ? "bg-accent text-accent-foreground"
                                                : user?.role === "admin" ? "bg-red-600 text-white"
                                                : "bg-blue-600 text-white"
                                            }`}
                                        >
                                            {user?.role === "vendeur" ? "Vendeur"
                                                : user?.role === "admin" ? "Admin"
                                                : user?.role === "concessionnaire" ? "Concessionnaire"
                                                : user?.role === "auto_ecole" ? "Auto-École"
                                                : "Client"}
                                        </Badge>
                                    </div>
                                    {user?.email_verified_at && (
                                        <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground text-sm">
                                            <Calendar className="h-4 w-4" />
                                            <p className="font-semibold text-xs">Membre depuis {new Date(user.email_verified_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3 shrink-0 justify-center md:justify-start">
                                    <Button
                                        onClick={() => setOpen(true)}
                                        size="sm"
                                        className="bg-black text-white hover:bg-black/50 hover:scale-105 transition cursor-pointer"
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Modifier le profil
                                    </Button>
                                    {user && <EditProfil open={open} onOpenChange={setOpen} onSubmit={handleSubmit} user={user} />}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 pt-2 border-t border-zinc-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Mail className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email</p>
                                        <p className="font-semibold text-xs truncate">{user?.email ?? ""}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Phone className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Téléphone</p>
                                        <p className="font-semibold text-xs truncate">{user?.telephone ?? "Non défini"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <MapPin className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Adresse</p>
                                        <p className="font-semibold text-xs truncate">{user?.adresse ?? "Non défini"}</p>
                                    </div>
                                </div>
                                {/* Champs spécifiques partenaires */}
                                {(user?.role === "concessionnaire" || user?.role === "auto_ecole") && (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <User className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Raison sociale</p>
                                                <p className="font-semibold text-xs truncate">{user?.raison_sociale ?? "Non défini"}</p>
                                            </div>
                                        </div>
                                        {user?.role === "concessionnaire" && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                    <User className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">RCCM</p>
                                                    <p className="font-semibold text-xs truncate">{user?.rccm ?? "Non défini"}</p>
                                                </div>
                                            </div>
                                        )}
                                        {user?.role === "auto_ecole" && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                    <User className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">N° Agrément</p>
                                                    <p className="font-semibold text-xs truncate">{user?.numero_agrement ?? "Non défini"}</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-left cursor-pointer">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Calendar className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{mesRdv.length}</p>
                                <p className="text-xs font-semibold text-muted-foreground">RDV</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-left">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                <Car className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{mesVoituresLouees.length}</p>
                                <p className="text-xs font-semibold text-muted-foreground">Loués</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-right">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <ShoppingBag className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{mesVoituresAchetees.length}</p>
                                <p className="text-xs font-semibold text-muted-foreground">Achetés</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-right">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Star className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">
                                    {user?.role === "vendeur" ? (avisData?.total ?? 0) : nbAvisLaisses}
                                </p>
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {user?.role === "vendeur" ? "Avis reçus" : "Avis laissés"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700 bg-white">
                <Tabs className="w-full" defaultValue="mes_rdv">
                    <div className="p-4 border-b border-zinc-200">
                        <TabsList className={`w-full grid ${user?.role === "vendeur" ? "grid-cols-4" : "grid-cols-3"}`}>
                            <TabsTrigger value="mes_rdv" className="rounded-xl gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                <Calendar className="h-4 w-4" />
                                <span className="hidden md:inline">Rendez-vous</span>
                            </TabsTrigger>
                            <TabsTrigger value="voiture_louee" className="rounded-xl gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                <Car className="h-4 w-4" />
                                <span className="hidden md:inline">Louée</span>
                            </TabsTrigger>
                            <TabsTrigger value="voiture_achete" className="rounded-xl gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                <ShoppingBag className="h-4 w-4" />
                                <span className="hidden md:inline">Achetée</span>
                            </TabsTrigger>
                            {user?.role === "vendeur" && (
                                <TabsTrigger value="mieux_note" className="rounded-xl gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                    <Star className="h-4 w-4" />
                                    <span className="hidden md:inline">Noté</span>
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {/* ── Rendez-vous ─────────────────────────────── */}
                    <TabsContent value="mes_rdv" className="p-4 md:p-6">
                        {mesRdv.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Calendar className="h-12 w-12 text-muted-foreground/20 mb-4" />
                                <p className="text-muted-foreground font-medium">Aucun rendez-vous prévu</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {mesRdv.map(rdv => {
                                    const statutConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
                                        "en_attente": { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
                                        "confirmé":   { label: "Confirmé",   className: "bg-green-50 text-green-700 border-green-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
                                        "terminé":    { label: "Terminé",    className: "bg-zinc-50 text-zinc-600 border-zinc-200",      icon: <CheckCircle2 className="h-3 w-3" /> },
                                        "annulé":     { label: "Annulé",     className: "bg-red-50 text-red-600 border-red-200",         icon: <XCircle className="h-3 w-3" /> },
                                        "refusé":     { label: "Refusé",     className: "bg-red-50 text-red-600 border-red-200",         icon: <XCircle className="h-3 w-3" /> },
                                    }
                                    const cfg = statutConfig[rdv.statut] ?? statutConfig["en_attente"]
                                    return (
                                        <div key={rdv.id} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-white hover:shadow-sm transition-all duration-200">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-sm">
                                                <Car className="h-6 w-6 text-zinc-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-zinc-900 truncate">
                                                    {rdv.vehicule?.description?.marque} {rdv.vehicule?.description?.modele}
                                                    {rdv.vehicule?.description?.annee && <span className="text-zinc-400 font-normal"> · {rdv.vehicule.description.annee}</span>}
                                                </p>
                                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                                    <User className="h-3 w-3" />
                                                    {rdv.vendeur?.fullname ?? "Vendeur inconnu"}
                                                </p>
                                                {rdv.date_heure && (
                                                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(rdv.date_heure), "d MMM yyyy · HH:mm", { locale: fr })}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge className={`text-xs font-semibold border flex items-center gap-1 shrink-0 ${cfg.className}`}>
                                                {cfg.icon}{cfg.label}
                                            </Badge>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Voitures louées ──────────────────────────── */}
                    <TabsContent value="voiture_louee" className="p-4 md:p-6">
                        {mesVoituresLouees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Car className="h-12 w-12 text-muted-foreground/20 mb-4" />
                                <p className="text-muted-foreground font-medium">Aucune voiture louée pour le moment</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {mesVoituresLouees.map(t => {
                                    const photo = t.vehicule?.photos?.[0]?.path ? (t.vehicule.photos[0].path.startsWith('http') ? t.vehicule.photos[0].path : `${BACKEND_URL}/storage/${t.vehicule.photos[0].path}`) : null
                                    return (
                                        <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-white hover:shadow-sm transition-all duration-200">
                                            <div className="w-16 h-12 rounded-xl overflow-hidden bg-zinc-200 shrink-0">
                                                {photo
                                                    ? <img src={photo} alt="véhicule" className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center"><Car className="h-5 w-5 text-zinc-400" /></div>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-zinc-900 truncate">
                                                    {t.vehicule?.description?.marque} {t.vehicule?.description?.modele}
                                                    {t.vehicule?.description?.annee && <span className="text-zinc-400 font-normal"> · {t.vehicule.description.annee}</span>}
                                                </p>
                                                {t.date_debut_location && t.date_fin_location && (
                                                    <p className="text-xs text-zinc-500 mt-0.5">
                                                        {format(new Date(t.date_debut_location), "d MMM", { locale: fr })} → {format(new Date(t.date_fin_location), "d MMM yyyy", { locale: fr })}
                                                    </p>
                                                )}
                                                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                                                    <User className="h-3 w-3" />
                                                    {t.vendeur?.fullname}
                                                </p>
                                            </div>
                                            {t.prix_final && (
                                                <div className="text-right shrink-0">
                                                    <p className="font-black text-sm text-zinc-900">{Number(t.prix_final).toLocaleString("fr-FR")} FCFA</p>
                                                    <Badge className="text-xs bg-primary/10 text-primary border-0 mt-1">Location</Badge>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Voitures achetées ────────────────────────── */}
                    <TabsContent value="voiture_achete" className="p-4 md:p-6">
                        {mesVoituresAchetees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mb-4" />
                                <p className="text-muted-foreground font-medium">Aucun véhicule acheté pour le moment</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {mesVoituresAchetees.map(t => {
                                    const photo = t.vehicule?.photos?.[0]?.path ? (t.vehicule.photos[0].path.startsWith('http') ? t.vehicule.photos[0].path : `${BACKEND_URL}/storage/${t.vehicule.photos[0].path}`) : null
                                    return (
                                        <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-white hover:shadow-sm transition-all duration-200">
                                            <div className="w-16 h-12 rounded-xl overflow-hidden bg-zinc-200 shrink-0">
                                                {photo
                                                    ? <img src={photo} alt="véhicule" className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center"><Car className="h-5 w-5 text-zinc-400" /></div>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-zinc-900 truncate">
                                                    {t.vehicule?.description?.marque} {t.vehicule?.description?.modele}
                                                    {t.vehicule?.description?.annee && <span className="text-zinc-400 font-normal"> · {t.vehicule.description.annee}</span>}
                                                </p>
                                                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                                                    <User className="h-3 w-3" />
                                                    {t.vendeur?.fullname}
                                                </p>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    {format(new Date(t.created_at), "d MMM yyyy", { locale: fr })}
                                                </p>
                                            </div>
                                            {t.prix_final && (
                                                <div className="text-right shrink-0">
                                                    <p className="font-black text-sm text-zinc-900">{Number(t.prix_final).toLocaleString("fr-FR")} FCFA</p>
                                                    <Badge className="text-xs bg-purple-500/10 text-purple-700 border-0 mt-1">Achat</Badge>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="mieux_note" className="p-4 md:p-6">
                        {!avisData || avisData.avis.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                                <Star className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/20 mb-4" />
                                <p className="text-sm md:text-base text-muted-foreground font-medium">Aucun avis reçu pour le moment</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Résumé note moyenne */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <Star key={n} className={`h-5 w-5 ${n <= Math.round(avisData.note_moyenne) ? "text-amber-400 fill-amber-400" : "text-zinc-300"}`} />
                                        ))}
                                    </div>
                                    <span className="font-black text-2xl text-zinc-900">{avisData.note_moyenne}</span>
                                    <span className="text-sm text-zinc-500">sur {avisData.total} avis</span>
                                </div>
                                {/* Liste des avis */}
                                {avisData.avis.map(a => (
                                    <div key={a.id} className="p-3 rounded-xl border border-zinc-200 bg-white">
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                                                    {a.client?.fullname?.[0]?.toUpperCase() ?? "?"}
                                                </div>
                                                <span className="font-semibold text-sm text-zinc-800">{a.client?.fullname}</span>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <Star key={n} className={`h-3.5 w-3.5 ${n <= a.note ? "text-amber-400 fill-amber-400" : "text-zinc-300"}`} />
                                                ))}
                                            </div>
                                        </div>
                                        {a.commentaire && (
                                            <p className="text-sm text-zinc-600 italic">"{a.commentaire}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    )
}
