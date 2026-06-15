"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
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
    ShieldAlert,
    Car,
    Users,
    Sun,
} from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/UserContext"
import { api } from "@/src/lib/api"
import { useRouter } from "next/navigation"

export default function AdminSettings() {
    const { user } = useUser()
    const router = useRouter()

    const [isEditing, setIsEditing]                 = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword]     = useState(false)
    const [saving, setSaving]                       = useState(false)

    // Champs du profil — initialisés vides, remplis quand user arrive du contexte
    const [form, setForm] = useState({
        fullname:  "",
        email:     "",
        telephone: "",
        adresse:   "",
    })

    useEffect(() => {
        if (!user) return
        setForm({
            fullname:  user.fullname  ?? "",
            email:     user.email     ?? "",
            telephone: user.telephone ?? "",
            adresse:   user.adresse   ?? "",
        })
    }, [user])

    // Préférences de notification (état local — pas encore d'endpoint dédié)
    const [prefs, setPrefs] = useState({
        notifEmail:        true,
        notifPush:         true,
        alertesVehicules:  true,
        alertesSignalem:   true,
        rapportHebdo:      false,
    })

    const togglePref = (key: keyof typeof prefs) =>
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }))

    // Sauvegarde des infos de profil via les endpoints existants
    const handleSaveProfil = async () => {
        setSaving(true)
        try {
            // Mise à jour nom + email
            await api.put("/me/update", {
                fullname: form.fullname,
                email:    form.email,
            })
            // Mise à jour téléphone + adresse
            await api.put("/me/contact", {
                telephone: form.telephone,
                adresse:   form.adresse,
            })
            toast.success("Profil mis à jour avec succès")
            setIsEditing(false)
        } catch {
            toast.error("Échec de la mise à jour")
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = async () => {
        await api.logout()
        router.push("/auth")
    }

    // Initiales pour l'avatar
    const initiales = form.fullname
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Gérez votre compte et vos préférences d&apos;administration.
                </p>
            </div>

            <Tabs defaultValue="compte">
                <TabsList variant="line">
                    <TabsTrigger value="compte" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Mon compte
                    </TabsTrigger>
                    <TabsTrigger value="securite" className="gap-2">
                        <Lock className="h-4 w-4" />
                        Sécurité
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Préférences
                    </TabsTrigger>
                </TabsList>

                {/* ==================== ONGLET COMPTE ==================== */}
                <TabsContent value="compte" className="space-y-6 mt-6">
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold">
                                    Informations personnelles
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs gap-1.5 cursor-pointer"
                                    onClick={() => isEditing ? handleSaveProfil() : setIsEditing(true)}
                                    disabled={saving}
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                    {saving ? "Enregistrement..." : isEditing ? "Enregistrer" : "Modifier"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar + identité */}
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="relative group">
                                    <Avatar className="h-24 w-24 border-4 border-background shadow-lg ring-2 ring-primary">
                                        <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-black">
                                            {initiales || "AD"}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isEditing && (
                                        <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Camera className="h-5 w-5 text-white" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 text-center sm:text-left space-y-1">
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <div className="grid gap-2">
                                                <Label className="text-xs text-muted-foreground">Nom complet</Label>
                                                <Input
                                                    value={form.fullname}
                                                    onChange={e => setForm(f => ({ ...f, fullname: e.target.value }))}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-xs text-muted-foreground">Adresse email</Label>
                                                <Input
                                                    type="email"
                                                    value={form.email}
                                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                                <h2 className="text-xl font-black">{form.fullname || "Administrateur"}</h2>
                                                <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px]">
                                                    admin
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{form.email}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Compte administrateur Move CI
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Coordonnées */}
                            <div>
                                <h3 className="text-sm font-semibold mb-4">Coordonnées</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {isEditing ? (
                                        <>
                                            <div className="grid gap-2">
                                                <Label className="text-xs text-muted-foreground">Téléphone</Label>
                                                <Input
                                                    value={form.telephone}
                                                    onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                                                    className="h-9 text-sm"
                                                    placeholder="+225 07 00 00 00 00"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-xs text-muted-foreground">Adresse</Label>
                                                <Input
                                                    value={form.adresse}
                                                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                                                    className="h-9 text-sm"
                                                    placeholder="Abidjan, Côte d'Ivoire"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Mail className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email</p>
                                                    <p className="font-semibold text-sm truncate">{form.email || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                                                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                    <Phone className="h-4 w-4 text-green-600" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Téléphone</p>
                                                    <p className="font-semibold text-sm truncate">{form.telephone || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 md:col-span-2">
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Adresse</p>
                                                    <p className="font-semibold text-sm truncate">{form.adresse || "—"}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <>
                                    <Separator />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditing(false)}
                                            disabled={saving}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveProfil}
                                            disabled={saving}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                                        >
                                            {saving ? "Enregistrement..." : "Enregistrer"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== ONGLET SÉCURITÉ ==================== */}
                <TabsContent value="securite" className="space-y-6 mt-6">

                    {/* Changement de mot de passe */}
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Lock className="h-5 w-5 text-muted-foreground" />
                                Modifier le mot de passe
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-xs text-muted-foreground">Mot de passe actuel</Label>
                                <div className="relative">
                                    <Input
                                        type={showCurrentPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="h-9 text-sm pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-xs text-muted-foreground">Nouveau mot de passe</Label>
                                    <div className="relative">
                                        <Input
                                            type={showNewPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-9 text-sm pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                        >
                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs text-muted-foreground">Confirmer le nouveau mot de passe</Label>
                                    <Input type="password" placeholder="••••••••" className="h-9 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => toast.success("Mot de passe modifié avec succès")}
                                >
                                    Mettre à jour
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Double authentification */}
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-muted-foreground" />
                                Double authentification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Authentification par SMS</p>
                                        <p className="text-xs text-muted-foreground">Recevez un code à chaque connexion</p>
                                    </div>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Authentification par email</p>
                                        <p className="text-xs text-muted-foreground">Un code de vérification envoyé par email</p>
                                    </div>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sessions actives */}
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Monitor className="h-5 w-5 text-muted-foreground" />
                                Sessions actives
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                        <Monitor className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">Chrome — Windows</p>
                                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                                                Actuelle
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Abidjan, CI · maintenant</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Safari — iPhone</p>
                                        <p className="text-xs text-muted-foreground">Abidjan, CI · il y a 3h</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs gap-1 cursor-pointer"
                                    onClick={() => toast.success("Session déconnectée")}
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                    Déconnecter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Zone de danger */}
                    <Card className="rounded-2xl border border-red-200 bg-red-50/30">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                Zone de danger
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-red-200">
                                <div>
                                    <p className="font-semibold text-sm">Se déconnecter de tous les appareils</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Invalide tous les tokens Sanctum — une reconnexion sera nécessaire.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 shrink-0 cursor-pointer"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-1" />
                                    Déconnecter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== ONGLET PRÉFÉRENCES ==================== */}
                <TabsContent value="preferences" className="space-y-6 mt-6">

                    {/* Notifications admin */}
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                Notifications admin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Notifications par email</p>
                                        <p className="text-xs text-muted-foreground">Alertes envoyées sur votre boîte mail</p>
                                    </div>
                                </div>
                                <Switch checked={prefs.notifEmail} onCheckedChange={() => togglePref("notifEmail")} />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                        <Bell className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Notifications push</p>
                                        <p className="text-xs text-muted-foreground">Alertes en temps réel dans le navigateur</p>
                                    </div>
                                </div>
                                <Switch checked={prefs.notifPush} onCheckedChange={() => togglePref("notifPush")} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Types d'alertes */}
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                                Types d&apos;alertes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Car className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Nouveaux véhicules en attente</p>
                                        <p className="text-xs text-muted-foreground">Annonces soumises à valider</p>
                                    </div>
                                </div>
                                <Switch checked={prefs.alertesVehicules} onCheckedChange={() => togglePref("alertesVehicules")} />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <ShieldAlert className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Nouveaux signalements</p>
                                        <p className="text-xs text-muted-foreground">Signalements ouverts à traiter</p>
                                    </div>
                                </div>
                                <Switch checked={prefs.alertesSignalem} onCheckedChange={() => togglePref("alertesSignalem")} />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Rapport hebdomadaire</p>
                                        <p className="text-xs text-muted-foreground">Résumé des activités chaque lundi</p>
                                    </div>
                                </div>
                                <Switch checked={prefs.rapportHebdo} onCheckedChange={() => togglePref("rapportHebdo")} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Apparence */}
                    <Card className="rounded-2xl shadow-sm border border-border/40">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Sun className="h-5 w-5 text-muted-foreground" />
                                Apparence
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-primary bg-white cursor-pointer transition-all hover:shadow-md">
                                    <Sun className="h-6 w-6 text-primary" />
                                    <span className="text-sm font-semibold">Clair</span>
                                </button>
                                <button className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/40 bg-muted/30 cursor-pointer transition-all hover:shadow-md hover:border-border">
                                    <Shield className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-sm font-semibold text-muted-foreground">Sombre</span>
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
