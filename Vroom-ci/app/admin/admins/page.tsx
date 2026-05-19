"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Shield,
    Plus,
    Eye,
    EyeOff,
    Calendar,
    Phone,
    MapPin,
    ShieldCheck,
    RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/src/lib/api"
import { useUser } from "@/src/context/UserContext"

interface AdminUser {
    id: string
    fullname: string
    email: string
    telephone?: string
    adresse?: string
    niveau_acces?: string
    statut: "actif" | "suspendu" | "banni"
    created_at: string
}

// Valeurs initiales du formulaire de création
const FORM_INIT = {
    fullname:     "",
    email:        "",
    password:     "",
    telephone:    "",
    adresse:      "",
    niveau_acces: "",
}

export default function AdminAdminsPage() {
    const { user: currentAdmin } = useUser()

    const [admins, setAdmins]       = useState<AdminUser[]>([])
    const [loading, setLoading]     = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [openDialog, setOpenDialog] = useState(false)
    const [form, setForm]           = useState(FORM_INIT)
    const [showPassword, setShowPassword] = useState(false)
    const [creating, setCreating]   = useState(false)

    const fetchAdmins = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get<AdminUser[]>("/admin/admins")
            if (res.data) setAdmins(res.data)
        } catch {
            toast.error("Impossible de charger la liste des administrateurs")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAdmins() }, [fetchAdmins])

    const handleRefresh = () => { setRefreshing(true); fetchAdmins() }

    const handleCreate = async () => {
        // Validation basique côté client avant d'envoyer
        if (!form.fullname.trim() || !form.email.trim() || form.password.length < 8) {
            toast.error("Nom, email et mot de passe (8 car. min) sont obligatoires")
            return
        }

        setCreating(true)
        try {
            await api.post("/admin/admins", {
                fullname:     form.fullname.trim(),
                email:        form.email.trim(),
                password:     form.password,
                telephone:    form.telephone.trim() || undefined,
                adresse:      form.adresse.trim()   || undefined,
                niveau_acces: form.niveau_acces.trim() || undefined,
            })
            toast.success(`Administrateur "${form.fullname}" créé avec succès`)
            setForm(FORM_INIT)
            setOpenDialog(false)
            fetchAdmins()
        } catch {
            toast.error("Échec de la création — vérifiez que l'email n'est pas déjà utilisé")
        } finally {
            setCreating(false)
        }
    }

    const handleField = (key: keyof typeof FORM_INIT) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm(f => ({ ...f, [key]: e.target.value }))

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Administrateurs</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {admins.length} compte{admins.length > 1 ? "s" : ""} administrateur{admins.length > 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50 shrink-0"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                        className="bg-black text-white hover:bg-zinc-800 gap-2"
                        onClick={() => { setForm(FORM_INIT); setOpenDialog(true) }}
                    >
                        <Plus className="h-4 w-4" />
                        Nouvel administrateur
                    </Button>
                </div>
            </div>

            {/* Cards des admins */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-44" />
                                    </div>
                                </div>
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : admins.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Shield className="h-10 w-10 mb-3 text-primary opacity-40" />
                        <p className="font-medium">Aucun administrateur trouvé</p>
                        <p className="text-sm mt-1">Créez le premier compte admin en cliquant sur le bouton ci-dessus.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {admins.map((admin) => {
                        const isMe = admin.id === (currentAdmin as unknown as AdminUser)?.id
                        return (
                            <Card
                                key={admin.id}
                                className={`hover:shadow-sm transition-shadow ${isMe ? "ring-1 ring-primary/40" : ""}`}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-3 mb-4">
                                        {/* Avatar avec initiales */}
                                        <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-primary">
                                                {admin.fullname.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-sm truncate">{admin.fullname}</p>
                                                {isMe && (
                                                    <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px]">
                                                        Vous
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                                        </div>
                                    </div>

                                    {/* Infos détail */}
                                    <div className="space-y-1.5 text-xs text-muted-foreground">
                                        {admin.telephone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 shrink-0" />
                                                {admin.telephone}
                                            </div>
                                        )}
                                        {admin.adresse && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{admin.adresse}</span>
                                            </div>
                                        )}
                                        {admin.niveau_acces && (
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />
                                                <span className="text-primary font-medium">{admin.niveau_acces}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            Depuis le {new Date(admin.created_at).toLocaleDateString("fr-FR", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Tableau récapitulatif en dessous des cards */}
            {admins.length > 0 && (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Administrateur</TableHead>
                                    <TableHead>Niveau d&apos;accès</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Créé le</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map((admin) => (
                                    <TableRow key={admin.id} className="hover:bg-muted/40">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-sm">{admin.fullname}</p>
                                                <p className="text-xs text-muted-foreground">{admin.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {admin.niveau_acces ? (
                                                <Badge className="bg-primary/15 text-primary border-primary/25 text-xs">
                                                    {admin.niveau_acces}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                                {admin.statut}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(admin.created_at).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Dialog — Créer un admin */}
            <Dialog open={openDialog} onOpenChange={open => { if (!creating) setOpenDialog(open) }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <Shield className="h-4 w-4 text-primary" />
                            </div>
                            Nouvel administrateur
                        </DialogTitle>
                        <DialogDescription>
                            Ce compte aura un accès complet à l&apos;espace administration. Choisissez les identifiants avec soin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Nom complet */}
                        <div className="grid gap-1.5">
                            <Label htmlFor="fullname">
                                Nom complet <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="fullname"
                                placeholder="Jean Dupont"
                                value={form.fullname}
                                onChange={handleField("fullname")}
                                disabled={creating}
                            />
                        </div>

                        {/* Email */}
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">
                                Adresse email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@vroom.ci"
                                value={form.email}
                                onChange={handleField("email")}
                                disabled={creating}
                            />
                        </div>

                        {/* Mot de passe */}
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">
                                Mot de passe <span className="text-destructive">*</span>
                                <span className="text-muted-foreground font-normal ml-1">(8 caractères min)</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={handleField("password")}
                                    disabled={creating}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Téléphone + Adresse */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="telephone">Téléphone</Label>
                                <Input
                                    id="telephone"
                                    placeholder="+225 07 00 00 00 00"
                                    value={form.telephone}
                                    onChange={handleField("telephone")}
                                    disabled={creating}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="niveau_acces">Niveau d&apos;accès</Label>
                                <Input
                                    id="niveau_acces"
                                    placeholder="Ex: super-admin, modérateur"
                                    value={form.niveau_acces}
                                    onChange={handleField("niveau_acces")}
                                    disabled={creating}
                                />
                            </div>
                        </div>

                        {/* Adresse */}
                        <div className="grid gap-1.5">
                            <Label htmlFor="adresse">Adresse</Label>
                            <Input
                                id="adresse"
                                placeholder="Abidjan, Côte d'Ivoire"
                                value={form.adresse}
                                onChange={handleField("adresse")}
                                disabled={creating}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpenDialog(false)}
                            disabled={creating}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || !form.fullname || !form.email || form.password.length < 8}
                            className="bg-black text-white hover:bg-zinc-800 gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            {creating ? "Création en cours..." : "Créer l'administrateur"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
