"use client"

import { useCallback, useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Building2,
    Camera,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Edit,
    Shield,
    Lock,
    Smartphone,
    Monitor,
    LogOut,
    Eye,
    EyeOff,
    SlidersHorizontal,
    Bell,
    MessageSquare,
    Sun,
    Moon,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/src/lib/api"
import { User } from "@/src/types"

const Settings = () => {
    const [user, setUser]         = useState<User | null>(null)
    const [loading, setLoading]   = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving]     = useState(false)

    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword]         = useState(false)

    // Formulaire contrôlé — initialisé depuis les données utilisateur
    const [form, setForm] = useState({
        fullname:  "",
        email:     "",
        telephone: "",
        adresse:   "",
    })

    const [prefs, setPrefs] = useState({
        notifEmail:    true,
        notifSms:      false,
        notifPush:     true,
        notifRdv:      true,
        notifMessages: true,
        notifStats:    false,
    })

    // Chargement du profil utilisateur au montage
    const fetchUser = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get<User>("/me")
            if (res.data) {
                setUser(res.data)
                setForm({
                    fullname:  res.data.fullname  ?? "",
                    email:     res.data.email     ?? "",
                    telephone: res.data.telephone ?? "",
                    adresse:   res.data.adresse   ?? "",
                })
            }
        } catch {
            toast.error("Impossible de charger le profil")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchUser() }, [fetchUser])

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            // PUT /me/update accepte fullname, email, telephone, adresse
            await api.put("/me/update", form)
            toast.success("Informations mises à jour avec succès")
            setIsEditing(false)
            fetchUser()
        } catch {
            toast.error("Échec de la mise à jour")
        } finally {
            setSaving(false)
        }
    }

    const handleCancelEdit = () => {
        // Réinitialise le formulaire avec les données actuelles
        if (user) {
            setForm({
                fullname:  user.fullname  ?? "",
                email:     user.email     ?? "",
                telephone: user.telephone ?? "",
                adresse:   user.adresse   ?? "",
            })
        }
        setIsEditing(false)
    }

    const handleChangePassword = () => {
        // Route non encore disponible côté backend — toast informatif
        toast.info("Fonctionnalité à venir")
    }

    const togglePref = (key: keyof typeof prefs) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Initiales pour l'avatar
    const initiales = user?.fullname
        ?.split(" ")
        .map(n => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() ?? "?"

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-black">Paramètres</h1>
                <p className="text-sm text-black/60">
                    Gérez les informations de votre entreprise et vos préférences.
                </p>
            </div>

            <Tabs defaultValue="entreprise">
                <TabsList variant="line">
                    <TabsTrigger value="entreprise" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Entreprise
                    </TabsTrigger>
                    <TabsTrigger value="securite" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Sécurité
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Préférences
                    </TabsTrigger>
                </TabsList>

                {/* ==================== TAB ENTREPRISE ==================== */}
                <TabsContent value="entreprise" className="space-y-6 mt-6">
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold text-black">
                                    Identité de l&apos;entreprise
                                </CardTitle>
                                {!loading && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                                        disabled={saving}
                                        className="cursor-pointer text-xs gap-1.5"
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                        {saving ? "Enregistrement..." : isEditing ? "Enregistrer" : "Modifier"}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar + Nom */}
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="relative group">
                                    {loading ? (
                                        <Skeleton className="h-24 w-24 rounded-full" />
                                    ) : (
                                        <>
                                            <Avatar className="h-24 w-24 border-4 border-background shadow-lg ring-2 ring-black">
                                                <AvatarImage src="" alt={user?.fullname} />
                                                <AvatarFallback className="text-2xl bg-black text-white font-black">
                                                    {initiales}
                                                </AvatarFallback>
                                            </Avatar>
                                            {isEditing && (
                                                <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    <Camera className="h-5 w-5 text-white" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="flex-1 text-center sm:text-left space-y-1">
                                    {loading ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-48" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                    ) : isEditing ? (
                                        <div className="space-y-3">
                                            <div className="grid gap-2">
                                                <Label className="text-xs text-black/60">Nom complet / Entreprise</Label>
                                                <Input
                                                    value={form.fullname}
                                                    onChange={e => setForm(f => ({ ...f, fullname: e.target.value }))}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                                <h2 className="text-xl font-black text-black">{user?.fullname}</h2>
                                                <Badge className="bg-black text-[10px]">Partenaire</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-black/40 mt-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Membre depuis {user?.email_verified_at
                                                    ? new Date(user.email_verified_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
                                                    : "—"
                                                }
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Coordonnées */}
                            <div>
                                <h3 className="text-sm font-semibold text-black mb-4">Coordonnées</h3>
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                                    </div>
                                ) : isEditing ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs text-black/60">Email professionnel</Label>
                                            <Input
                                                type="email"
                                                value={form.email}
                                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs text-black/60">Téléphone</Label>
                                            <Input
                                                value={form.telephone}
                                                onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <Label className="text-xs text-black/60">Adresse</Label>
                                            <Input
                                                value={form.adresse}
                                                onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <Mail className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] uppercase font-bold text-black/40 tracking-wider">Email</p>
                                                <p className="font-semibold text-sm text-black truncate">{user?.email ?? "—"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                                            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                                <Phone className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] uppercase font-bold text-black/40 tracking-wider">Téléphone</p>
                                                <p className="font-semibold text-sm text-black truncate">{user?.telephone ?? "—"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 md:col-span-2">
                                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                                <MapPin className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] uppercase font-bold text-black/40 tracking-wider">Adresse</p>
                                                <p className="font-semibold text-sm text-black truncate">{user?.adresse ?? "—"}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <>
                                    <Separator />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={handleCancelEdit} className="cursor-pointer">
                                            Annuler
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="bg-black text-white hover:bg-zinc-800 cursor-pointer"
                                        >
                                            {saving ? "Enregistrement..." : "Enregistrer"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== TAB SÉCURITÉ ==================== */}
                <TabsContent value="securite" className="space-y-6 mt-6">
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
                                <Lock className="h-5 w-5 text-black/60" />
                                Modifier le mot de passe
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-xs text-black/60">Mot de passe actuel</Label>
                                <div className="relative">
                                    <Input type={showCurrentPassword ? "text" : "password"} placeholder="••••••••" className="h-9 text-sm pr-10" />
                                    <button
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors cursor-pointer"
                                    >
                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-xs text-black/60">Nouveau mot de passe</Label>
                                    <div className="relative">
                                        <Input type={showNewPassword ? "text" : "password"} placeholder="••••••••" className="h-9 text-sm pr-10" />
                                        <button
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors cursor-pointer"
                                        >
                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs text-black/60">Confirmer le mot de passe</Label>
                                    <Input type="password" placeholder="••••••••" className="h-9 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleChangePassword} className="bg-black text-white hover:bg-zinc-800 cursor-pointer">
                                    Mettre à jour
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-black/60" />
                                Double authentification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { icon: Shield, bg: "bg-emerald-500/10", color: "text-emerald-600", title: "Authentification par SMS", desc: "Recevez un code par SMS à chaque connexion" },
                                { icon: Mail,   bg: "bg-blue-500/10",    color: "text-blue-600",    title: "Authentification par email", desc: "Recevez un code par email à chaque connexion" },
                            ].map(({ icon: Icon, bg, color, title, desc }) => (
                                <div key={title} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                                            <Icon className={`h-5 w-5 ${color}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-black">{title}</p>
                                            <p className="text-xs text-black/50">{desc}</p>
                                        </div>
                                    </div>
                                    <Switch />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
                                <Monitor className="h-5 w-5 text-black/60" />
                                Sessions actives
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <Monitor className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm text-black">Chrome - Windows</p>
                                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]" variant="outline">Actuelle</Badge>
                                        </div>
                                        <p className="text-xs text-black/50">Abidjan, CI · Dernière activité : maintenant</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-200 flex items-center justify-center">
                                        <Smartphone className="h-5 w-5 text-zinc-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-black">Safari - iPhone 15</p>
                                        <p className="text-xs text-black/50">Abidjan, CI · Dernière activité : il y a 2h</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer text-xs gap-1">
                                    <LogOut className="h-3.5 w-3.5" />
                                    Déconnecter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== TAB PRÉFÉRENCES ==================== */}
                <TabsContent value="preferences" className="space-y-6 mt-6">
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
                                <Bell className="h-5 w-5 text-black/60" />
                                Canaux de notification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { key: "notifEmail" as const, icon: Mail,       bg: "bg-blue-500/10",    color: "text-blue-600",    title: "Notifications par email",  desc: "Recevez les alertes sur votre boîte mail" },
                                { key: "notifSms"   as const, icon: Smartphone, bg: "bg-violet-500/10",  color: "text-violet-600",  title: "Notifications par SMS",    desc: "Recevez les alertes par message texte" },
                                { key: "notifPush"  as const, icon: Bell,       bg: "bg-emerald-500/10", color: "text-emerald-600", title: "Notifications push",       desc: "Notifications en temps réel dans le navigateur" },
                            ].map(({ key, icon: Icon, bg, color, title, desc }) => (
                                <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                                            <Icon className={`h-5 w-5 ${color}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-black">{title}</p>
                                            <p className="text-xs text-black/50">{desc}</p>
                                        </div>
                                    </div>
                                    <Switch checked={prefs[key]} onCheckedChange={() => togglePref(key)} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5 text-black/60" />
                                Types de notifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { key: "notifRdv"      as const, icon: Calendar,     bg: "bg-green-500/10",  color: "text-green-600",  title: "Rendez-vous",         desc: "Nouveaux RDV, annulations, rappels" },
                                { key: "notifMessages" as const, icon: MessageSquare, bg: "bg-amber-500/10", color: "text-amber-600", title: "Messages",            desc: "Nouveaux messages de clients" },
                                { key: "notifStats"    as const, icon: Building2,     bg: "bg-teal-500/10",   color: "text-teal-600",   title: "Rapports hebdomadaires", desc: "Résumé des stats chaque lundi" },
                            ].map(({ key, icon: Icon, bg, color, title, desc }) => (
                                <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                                            <Icon className={`h-5 w-5 ${color}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-black">{title}</p>
                                            <p className="text-xs text-black/50">{desc}</p>
                                        </div>
                                    </div>
                                    <Switch checked={prefs[key]} onCheckedChange={() => togglePref(key)} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
                                <Sun className="h-5 w-5 text-black/60" />
                                Apparence
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-black bg-white cursor-pointer transition-all hover:shadow-md">
                                    <Sun className="h-6 w-6 text-amber-500" />
                                    <span className="text-sm font-semibold text-black">Clair</span>
                                </button>
                                <button className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/40 bg-muted/30 cursor-pointer transition-all hover:shadow-md hover:border-black/20">
                                    <Moon className="h-6 w-6 text-black/40" />
                                    <span className="text-sm font-semibold text-black/60">Sombre</span>
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default Settings
