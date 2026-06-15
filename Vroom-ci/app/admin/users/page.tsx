"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Search,
    UserX,
    UserCheck,
    ShieldOff,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Users,
    Clock,
    Building2,
    GraduationCap,
    Mail,
    Phone,
    MapPin,
    RefreshCw,
    Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { suspendreUser, bannirUser, restaurerUser, validerUser, getUsersPaginated } from "@/src/actions/admin.actions"

interface AdminUser {
    id: number
    fullname: string
    email: string
    role: string
    statut: "actif" | "suspendu" | "banni" | "en_attente"
    partenaire_type?: string
    raison_sociale?: string
    rccm?: string
    numero_agrement?: string
    created_at: string
}

// Badge statut avec couleurs adaptées au fond blanc
function StatutBadge({ statut }: { statut: AdminUser["statut"] }) {
    const map = {
        actif:      "bg-green-100 text-green-700 border-green-200",
        suspendu:   "bg-amber-100 text-amber-700 border-amber-200",
        banni:      "bg-red-100 text-red-700 border-red-200",
        en_attente: "bg-yellow-100 text-yellow-700 border-yellow-200",
    }
    const labels = {
        actif: "Actif", suspendu: "Suspendu", banni: "Banni", en_attente: "En attente"
    }
    return (
        <Badge className={`text-xs ${map[statut] ?? "bg-secondary text-secondary-foreground"}`}>
            {labels[statut] ?? statut}
        </Badge>
    )
}

// Badge rôle avec couleurs distinctives sur fond blanc
function RoleBadge({ role, partenaireType }: { role: string; partenaireType?: string }) {
    const map: Record<string, string> = {
        client:          "bg-blue-100 text-blue-700 border-blue-200",
        vendeur:         "bg-primary/15 text-primary border-primary/25",
        concessionnaire: "bg-purple-100 text-purple-700 border-purple-200",
        auto_ecole:      "bg-cyan-100 text-cyan-700 border-cyan-200",
        admin:           "bg-red-100 text-red-700 border-red-200",
    }
    const label = partenaireType ?? role
    return (
        <Badge className={`text-xs ${map[role] ?? "bg-secondary text-secondary-foreground"}`}>
            {label}
        </Badge>
    )
}

type ActionType = "suspendre" | "bannir" | "restaurer" | "valider"

interface PendingAction {
    userId: number
    userName: string
    type: ActionType
}

const ACTION_CONFIG: Record<ActionType, { label: string; description: string; destructive: boolean }> = {
    suspendre: { label: "Suspendre",  description: "Cet utilisateur ne pourra plus se connecter temporairement.",             destructive: true },
    bannir:    { label: "Bannir",     description: "Cet utilisateur sera définitivement banni de la plateforme.",             destructive: true },
    restaurer: { label: "Restaurer",  description: "Le compte sera remis en état actif.",                                    destructive: false },
    valider:   { label: "Valider",    description: "Le compte partenaire sera activé et l'utilisateur pourra se connecter.", destructive: false },
}

export default function AdminUsersPage() {
    const searchParams = useSearchParams()
    const openId = searchParams.get("open")
    const [users, setUsers]               = useState<AdminUser[]>([])
    const [loading, setLoading]           = useState(true)
    const [refreshing, setRefreshing]     = useState(false)
    const [page, setPage]                 = useState(1)
    const [totalPages, setTotalPages]     = useState(1)
    const [total, setTotal]               = useState(0)
    const [search, setSearch]             = useState("")
    const [filterRole, setFilterRole]     = useState("all")
    const [filterStatut, setFilterStatut] = useState(() => searchParams.get("statut") ?? "all")
    const [activeTab, setActiveTab]       = useState(() => searchParams.get("statut") === "en_attente" ? "demandes" : "tous")
    const [pending, setPending]           = useState<PendingAction | null>(null)
    const [acting, setActing]             = useState(false)
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = { page: String(page) }
            if (filterRole   !== "all") params.role   = filterRole
            if (filterStatut !== "all") params.statut = filterStatut

            const res = await getUsersPaginated(params)
            if (res.data) {
                setUsers(res.data.data as unknown as AdminUser[])
                setTotalPages(res.data.last_page)
                setTotal(res.data.total)
            }
        } catch {
            toast.error("Impossible de charger les utilisateurs")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [page, filterRole, filterStatut])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    const handleRefresh = () => { setRefreshing(true); fetchUsers() }

    // Ouvre le Sheet de détail si ?open={id} est dans l'URL (depuis les logs)
    useEffect(() => {
        if (openId && users.length > 0) {
            const found = users.find(u => String(u.id) === String(openId))
            if (found) setSelectedUser(found)
        }
    }, [users, openId])

    const executeAction = async () => {
        if (!pending) return
        setActing(true)
        try {
            // Appel de l'action admin correspondante selon le type d'action
            if (pending.type === "suspendre") await suspendreUser(pending.userId)
            else if (pending.type === "bannir")    await bannirUser(pending.userId)
            else if (pending.type === "restaurer") await restaurerUser(pending.userId)
            else if (pending.type === "valider")   await validerUser(pending.userId)
            toast.success(`${ACTION_CONFIG[pending.type].label} effectué pour ${pending.userName}`)
            setPending(null)
            fetchUsers()
        } catch {
            toast.error("Échec de l'action, réessayez")
        } finally {
            setActing(false)
        }
    }

    // Filtre instantané côté client sur nom/email (complète le filtre serveur)
    const filtered = search.trim()
        ? users.filter(u =>
            u.fullname.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
          )
        : users

    const switchTab = (tab: string) => {
        setActiveTab(tab)
        setFilterStatut(tab === "demandes" ? "en_attente" : "all")
        setFilterRole("all")
        setPage(1)
    }

    const isDemandesTab = activeTab === "demandes"

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {total} compte(s) au total
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
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                </div>
            </div>

            {/* Onglets */}
            <Tabs value={activeTab} onValueChange={switchTab}>
                <TabsList>
                    <TabsTrigger value="tous" className="gap-2">
                        <Users className="h-3.5 w-3.5" /> Tous les comptes
                    </TabsTrigger>
                    <TabsTrigger value="demandes" className="gap-2">
                        <Clock className="h-3.5 w-3.5" /> Demandes partenaires
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Barre de filtres — masquée sur l'onglet demandes */}
            {!isDemandesTab && (
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom ou email..."
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={filterRole} onValueChange={v => { setFilterRole(v); setPage(1) }}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Rôle" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les rôles</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="vendeur">Vendeur</SelectItem>
                        <SelectItem value="concessionnaire">Concessionnaire</SelectItem>
                        <SelectItem value="auto_ecole">Auto-école</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterStatut} onValueChange={v => { setFilterStatut(v); setPage(1) }}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="suspendu">Suspendu</SelectItem>
                        <SelectItem value="banni">Banni</SelectItem>
                        <SelectItem value="en_attente">En attente</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            )}

            {/* Tableau */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Utilisateur</TableHead>
                                {isDemandesTab
                                    ? <TableHead>Infos métier</TableHead>
                                    : <><TableHead>Rôle</TableHead><TableHead>Statut</TableHead></>
                                }
                                <TableHead>Inscrit le</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(8)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        {isDemandesTab ? "Aucune demande en attente" : "Aucun utilisateur trouvé"}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className={`hover:bg-muted/40 cursor-pointer ${isDemandesTab ? "bg-yellow-50/30" : ""}`}
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-sm">{user.fullname}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </TableCell>
                                    {isDemandesTab ? (
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    {user.role === "concessionnaire"
                                                        ? <Building2 className="h-3.5 w-3.5 text-purple-500" />
                                                        : <GraduationCap className="h-3.5 w-3.5 text-cyan-500" />
                                                    }
                                                    {/* role = "concessionnaire" | "auto_ecole" directement en base */}
                                                    <span className="text-sm font-medium">{user.raison_sociale ?? "—"}</span>
                                                </div>
                                                {user.rccm && <p className="text-xs text-muted-foreground">RCCM : {user.rccm}</p>}
                                                {user.numero_agrement && <p className="text-xs text-muted-foreground">Agrément : {user.numero_agrement}</p>}
                                                <RoleBadge role={user.role} partenaireType={user.partenaire_type} />
                                            </div>
                                        </TableCell>
                                    ) : (
                                        <>
                                    <TableCell>
                                        <RoleBadge role={user.role} partenaireType={user.partenaire_type} />
                                    </TableCell>
                                    <TableCell>
                                        <StatutBadge statut={user.statut} />
                                    </TableCell>
                                        </>
                                    )}
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(user.created_at).toLocaleDateString("fr-FR")}
                                    </TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        {/* Les boutons disponibles changent selon le statut actuel */}
                                        <div className="flex items-center justify-end gap-1">
                                            {user.statut === "en_attente" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                                    onClick={() => setPending({ userId: user.id, userName: user.fullname, type: "valider" })}
                                                >
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Valider
                                                </Button>
                                            )}
                                            {user.statut === "actif" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                                    onClick={() => setPending({ userId: user.id, userName: user.fullname, type: "suspendre" })}
                                                >
                                                    <ShieldOff className="h-3 w-3 mr-1" />
                                                    Suspendre
                                                </Button>
                                            )}
                                            {(user.statut === "actif" || user.statut === "suspendu") && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                                    onClick={() => setPending({ userId: user.id, userName: user.fullname, type: "bannir" })}
                                                >
                                                    <UserX className="h-3 w-3 mr-1" />
                                                    Bannir
                                                </Button>
                                            )}
                                            {(user.statut === "suspendu" || user.statut === "banni") && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                                    onClick={() => setPending({ userId: user.id, userName: user.fullname, type: "restaurer" })}
                                                >
                                                    <UserCheck className="h-3 w-3 mr-1" />
                                                    Restaurer
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Page {page} sur {totalPages}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1}      onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Sheet détail utilisateur — ouvert via clic ligne ou ?open= dans l'URL */}
            <Sheet open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)}>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                    {selectedUser && (
                        <>
                            <SheetHeader className="mb-4">
                                <SheetTitle>{selectedUser.fullname}</SheetTitle>
                                <SheetDescription>#{selectedUser.id}</SheetDescription>
                            </SheetHeader>

                            <div className="space-y-5 text-sm">
                                {/* Badges rôle + statut */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <RoleBadge role={selectedUser.role} partenaireType={selectedUser.partenaire_type} />
                                    <StatutBadge statut={selectedUser.statut} />
                                </div>

                                <Separator />

                                {/* Coordonnées */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coordonnées</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-3.5 w-3.5 shrink-0" />
                                            <span>{selectedUser.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                                            <span>Inscrit le {new Date(selectedUser.created_at).toLocaleDateString("fr-FR", {
                                                day: "numeric", month: "long", year: "numeric"
                                            })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Infos métier partenaire */}
                                {(selectedUser.raison_sociale || selectedUser.rccm || selectedUser.numero_agrement) && (
                                    <>
                                        <Separator />
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informations métier</h3>
                                            <div className="space-y-2">
                                                {selectedUser.raison_sociale && (
                                                    <div className="flex items-center gap-2">
                                                        {selectedUser.role === "concessionnaire"
                                                            ? <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                                            : <GraduationCap className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                                                        }
                                                        <span className="font-medium">{selectedUser.raison_sociale}</span>
                                                    </div>
                                                )}
                                                {selectedUser.rccm && (
                                                    <p className="text-xs text-muted-foreground">RCCM : {selectedUser.rccm}</p>
                                                )}
                                                {selectedUser.numero_agrement && (
                                                    <p className="text-xs text-muted-foreground">Agrément : {selectedUser.numero_agrement}</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Separator />

                                {/* Actions rapides */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUser.statut === "en_attente" && (
                                            <Button size="sm" variant="outline"
                                                className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                                                onClick={() => { setPending({ userId: selectedUser.id, userName: selectedUser.fullname, type: "valider" }); setSelectedUser(null) }}>
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Valider
                                            </Button>
                                        )}
                                        {selectedUser.statut === "actif" && (
                                            <Button size="sm" variant="outline"
                                                className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                                                onClick={() => { setPending({ userId: selectedUser.id, userName: selectedUser.fullname, type: "suspendre" }); setSelectedUser(null) }}>
                                                <ShieldOff className="h-3 w-3 mr-1" /> Suspendre
                                            </Button>
                                        )}
                                        {(selectedUser.statut === "actif" || selectedUser.statut === "suspendu") && (
                                            <Button size="sm" variant="outline"
                                                className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                                                onClick={() => { setPending({ userId: selectedUser.id, userName: selectedUser.fullname, type: "bannir" }); setSelectedUser(null) }}>
                                                <UserX className="h-3 w-3 mr-1" /> Bannir
                                            </Button>
                                        )}
                                        {(selectedUser.statut === "suspendu" || selectedUser.statut === "banni") && (
                                            <Button size="sm" variant="outline"
                                                className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                                onClick={() => { setPending({ userId: selectedUser.id, userName: selectedUser.fullname, type: "restaurer" }); setSelectedUser(null) }}>
                                                <UserCheck className="h-3 w-3 mr-1" /> Restaurer
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Dialog de confirmation avant action de modération */}
            <AlertDialog open={!!pending} onOpenChange={open => !open && setPending(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending && ACTION_CONFIG[pending.type].label} — {pending?.userName}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending && ACTION_CONFIG[pending.type].description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeAction}
                            disabled={acting}
                            className={
                                pending && ACTION_CONFIG[pending.type].destructive
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }
                        >
                            {acting ? "En cours..." : "Confirmer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
