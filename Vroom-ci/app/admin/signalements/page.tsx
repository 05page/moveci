"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
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
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Car,
    User,
    ChevronLeft,
    ChevronRight,
    FileText,
    AlertTriangle,
    RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { traiterSignalement, getSignalementsPaginated } from "@/src/actions/admin.actions"


interface SignalementAdmin {
    id: string
    /** Motif du signalement : "comportement abusif", "arnaque", etc. */
    motif: string
    /** Description libre saisie par le reporteur */
    description?: string
    statut: "en_attente" | "traité" | "rejeté"
    action_cible?: string | null
    note_admin?: string | null
    date_signalement: string
    client?: { id: string; fullname: string }
    cible_user?: { id: string; fullname: string } | null
    cible_vehicule?: {
        id: string
        description?: { marque: string; modele: string; annee: number }
        creator?: { id: string; fullname: string }
        photos?: { path: string; is_primary: boolean }[]
    } | null
}


/** Badge coloré selon le statut du signalement */
function StatutBadge({ statut }: { statut: SignalementAdmin["statut"] }) {
    const map = {
        en_attente: "bg-yellow-100 text-yellow-700 border-yellow-200",
        traité:     "bg-green-100 text-green-700 border-green-200",
        rejeté:     "bg-red-100 text-red-700 border-red-200",
    }
    const labels = { en_attente: "En attente", traité: "Traité", rejeté: "Rejeté" }
    return (
        <Badge className={`text-xs ${map[statut] ?? "bg-secondary text-secondary-foreground"}`}>
            {labels[statut] ?? statut}
        </Badge>
    )
}


export default function AdminSignalementsPage() {
    const searchParams   = useSearchParams()
    const openId         = searchParams.get("open")

    // ── State liste ──────────────────────────────────────────────────────────
    const [signalements, setSignalements] = useState<SignalementAdmin[]>([])
    const [loading, setLoading]           = useState(true)
    const [refreshing, setRefreshing]     = useState(false)
    const [page, setPage]                 = useState(1)
    const [totalPages, setTotalPages]     = useState(1)
    const [total, setTotal]               = useState(0)
    const [filterStatut, setFilterStatut] = useState("all")

    // ── State drawer de détail (lecture seule) ──────────────────────────────
    const [detail, setDetail]           = useState<SignalementAdmin | null>(null)

    // ── State modale de traitement ───────────────────────────────────────────
    /** Signalement actuellement ouvert dans la modale */
    const [selected, setSelected]       = useState<SignalementAdmin | null>(null)
    /** Action choisie dans la modale */
    const [modalAction, setModalAction] = useState<"traiter" | "rejeter">("traiter")

    const [actionCible, setActionCible] = useState<string>("aucune")
    /** Note optionnelle de l'admin, visible par la personne concernée */
    const [noteAdmin, setNoteAdmin]     = useState("")
    const [acting, setActing]           = useState(false)

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchSignalements = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = { page: String(page) }
            if (filterStatut !== "all") params.statut = filterStatut

            const res = await getSignalementsPaginated(params)
            if (res.data) {
                setSignalements(res.data.data as unknown as SignalementAdmin[])
                setTotalPages(res.data.last_page)
                setTotal(res.data.total)
            }
        } catch {
            toast.error("Impossible de charger les signalements")
        } finally {
            setLoading(false)
        }
    }, [page, filterStatut])

    useEffect(() => { fetchSignalements() }, [fetchSignalements])

    const handleRefresh = () => { setRefreshing(true); fetchSignalements() }

    // Ouvre le drawer de détail si ?open={id} est dans l'URL (depuis les logs)
    useEffect(() => {
        if (openId && signalements.length > 0) {
            const found = signalements.find(s => s.id === openId)
            if (found) setDetail(found)
        }
    }, [signalements, openId])

    /**
     * Ouvre la modale pour un signalement donné et remet le state modal
     * à ses valeurs par défaut (traiter / aucune action / note vide).
     */
    const openModal = (s: SignalementAdmin) => {
        setSelected(s)
        setModalAction("traiter")
        setActionCible("aucune")
        setNoteAdmin("")
    }

    /**
     * Envoie la décision de traitement au backend.
     * Corps : { action, action_cible?, note_admin? }
     * action_cible n'est envoyé que si l'action est "traiter".
     */
    const executeAction = async () => {
        if (!selected) return
        setActing(true)
        try {
            await traiterSignalement(selected.id, {
                statut: modalAction === "traiter" ? "traité" : "rejeté",
                action_cible: modalAction === "traiter" ? actionCible : undefined,
                note_admin: noteAdmin.trim() || undefined,
            })
            toast.success(`Signalement ${modalAction === "traiter" ? "traité" : "rejeté"}`)
            setSelected(null)
            fetchSignalements()
        } catch {
            toast.error("Échec de l'action")
        } finally {
            setActing(false)
        }
    }

    /**
     * Affiche la cible du signalement : utilisateur ou véhicule.
     * Retourne une icône + label ou un tiret si aucune cible.
     */
    const renderCible = (s: SignalementAdmin) => {
        if (s.cible_user) {
            return (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {s.cible_user.fullname}
                </span>
            )
        }
        if (s.cible_vehicule?.description) {
            const d = s.cible_vehicule.description
            return (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Car className="h-3 w-3" />
                    {d.marque} {d.modele} ({d.annee})
                    {s.cible_vehicule.creator && (
                        <span className="opacity-60">— {s.cible_vehicule.creator.fullname}</span>
                    )}
                </span>
            )
        }
        return <span className="text-xs text-muted-foreground">—</span>
    }

    // ── Options du Select "Action sur la cible" selon le type de cible ───────

    /**
     * Retourne les options disponibles pour l'action sur la cible.
     * Les options diffèrent selon que la cible est un utilisateur ou un véhicule.
     */
    const getActionCibleOptions = () => {
        if (selected?.cible_user) {
            return [
                { value: "aucune",        label: "Aucune action" },
                { value: "avertissement", label: "Avertissement" },
                { value: "suspendre",     label: "Suspendre le compte" },
                { value: "bannir",        label: "Bannir le compte" },
            ]
        }
        if (selected?.cible_vehicule) {
            return [
                { value: "aucune",    label: "Aucune action" },
                { value: "suspendre", label: "Suspendre l'annonce" },
                { value: "bannir",    label: "Bannir l'annonce" },
            ]
        }
        return [{ value: "aucune", label: "Aucune action" }]
    }

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Signalements</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {total} signalement(s) — filtre :{" "}
                        <span className="text-foreground font-medium">
                            {filterStatut === "all" ? "tous" : filterStatut.replace("_", " ")}
                        </span>
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
                    <div className="p-2 rounded-lg bg-orange-50">
                        <ShieldAlert className="h-4 w-4 text-orange-600" />
                    </div>
                </div>
            </div>

            {/* Filtre statut */}
            <div>
                <Select value={filterStatut} onValueChange={v => { setFilterStatut(v); setPage(1) }}>
                    <SelectTrigger className="w-45">
                        <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="traité">Traités</SelectItem>
                        <SelectItem value="rejeté">Rejetés</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tableau */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Signalé par</TableHead>
                                <TableHead>Cible</TableHead>
                                <TableHead>Motif</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : signalements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                                            <p>Aucun signalement dans cette catégorie</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : signalements.map((s) => (
                                <TableRow key={s.id} className="hover:bg-muted/40">
                                    <TableCell className="text-sm font-medium">
                                        {s.client?.fullname ?? "Inconnu"}
                                    </TableCell>
                                    <TableCell>{renderCible(s)}</TableCell>
                                    <TableCell>
                                        <Badge className="bg-secondary text-secondary-foreground text-xs">
                                            {s.motif}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <StatutBadge statut={s.statut} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(s.date_signalement).toLocaleDateString("fr-FR")}
                                    </TableCell>
                                    <TableCell>
                                        {/* Bouton unique d'ouverture de la modale — uniquement sur les signalements ouverts */}
                                        {s.statut === "en_attente" ? (
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => openModal(s)}
                                                >
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    Voir & traiter
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => setDetail(s)}
                                                >
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    Voir détail
                                                </Button>
                                            </div>
                                        )}
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
                        <Button variant="outline" size="sm" disabled={page <= 1}         onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Drawer détail (lecture seule) ──────────────────────────────── */}
            <Sheet open={!!detail} onOpenChange={open => !open && setDetail(null)}>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-orange-500" />
                            Détail du signalement
                        </SheetTitle>
                    </SheetHeader>

                    {detail && (
                        <div className="space-y-5 text-sm">
                            {/* Statut */}
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Statut</span>
                                <StatutBadge statut={detail.statut} />
                            </div>

                            <div className="border-t" />

                            {/* Signalé par */}
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Signalé par</span>
                                <span className="font-medium">{detail.client?.fullname ?? "Inconnu"}</span>
                            </div>

                            {/* Cible */}
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Cible</span>
                                {renderCible(detail)}
                            </div>

                            {/* Motif */}
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Motif</span>
                                <Badge className="bg-secondary text-secondary-foreground text-xs">
                                    {detail.motif}
                                </Badge>
                            </div>

                            {/* Date */}
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Date</span>
                                <span>{new Date(detail.date_signalement).toLocaleDateString("fr-FR", {
                                    day: "numeric", month: "long", year: "numeric"
                                })}</span>
                            </div>

                            {/* Description */}
                            {detail.description && (
                                <>
                                    <div className="border-t" />
                                    <div className="space-y-1.5">
                                        <span className="text-muted-foreground">Description</span>
                                        <p className="bg-muted rounded p-3 leading-relaxed">{detail.description}</p>
                                    </div>
                                </>
                            )}

                            {/* Action prise par l'admin */}
                            {detail.action_cible && (
                                <>
                                    <div className="border-t" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Action appliquée</span>
                                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs capitalize">
                                            {detail.action_cible}
                                        </Badge>
                                    </div>
                                </>
                            )}

                            {/* Note admin */}
                            {detail.note_admin && (
                                <div className="space-y-1.5">
                                    <span className="text-muted-foreground">Note de l&apos;admin</span>
                                    <p className="bg-muted rounded p-3 leading-relaxed">{detail.note_admin}</p>
                                </div>
                            )}

                            {/* Photos du véhicule signalé */}
                            {detail.cible_vehicule?.photos && detail.cible_vehicule.photos.length > 0 && (
                                <>
                                    <div className="border-t" />
                                    <div className="space-y-2">
                                        <span className="text-muted-foreground">Photos du véhicule</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {detail.cible_vehicule.photos.map((photo, i) => (
                                                <img
                                                    key={i}
                                                    src={photo.path.startsWith('http') ? photo.path : `${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${photo.path}`}
                                                    alt={`Photo ${i + 1}`}
                                                    className="w-full h-32 object-cover rounded-md border"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Modale de traitement enrichie ─────────────────────────────── */}
            <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            Traiter le signalement
                        </DialogTitle>
                        <DialogDescription>
                            Consultez les détails puis choisissez l&apos;action à appliquer.
                        </DialogDescription>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-5 py-1">
                            {/* ── Section 1 : Détails du signalement (lecture seule) ── */}
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-muted-foreground shrink-0">Signalé par</span>
                                    <span className="font-medium text-right">
                                        {selected.client?.fullname ?? "Inconnu"}
                                    </span>
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-muted-foreground shrink-0">Cible</span>
                                    <span className="text-right">{renderCible(selected)}</span>
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-muted-foreground shrink-0">Motif</span>
                                    <Badge className="bg-secondary text-secondary-foreground text-xs">
                                        {selected.motif}
                                    </Badge>
                                </div>

                                {selected.description && (
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground">Description</span>
                                        <p className="bg-muted rounded p-3 text-sm leading-relaxed">
                                            {selected.description}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-muted-foreground shrink-0">Date</span>
                                    <span>
                                        {new Date(selected.date_signalement).toLocaleDateString("fr-FR", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t" />

                            {/* ── Section 2 : Choisir l'action ── */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Action</Label>

                                {/* Toggle Traiter / Rejeter */}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={modalAction === "traiter" ? "default" : "outline"}
                                        className={
                                            modalAction === "traiter"
                                                ? "bg-green-600 text-white hover:bg-green-700 flex-1"
                                                : "border-green-200 text-green-700 hover:bg-green-50 flex-1"
                                        }
                                        onClick={() => setModalAction("traiter")}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                        Traiter
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={modalAction === "rejeter" ? "default" : "outline"}
                                        className={
                                            modalAction === "rejeter"
                                                ? "bg-red-600 text-white hover:bg-red-700 flex-1"
                                                : "border-red-200 text-red-700 hover:bg-red-50 flex-1"
                                        }
                                        onClick={() => setModalAction("rejeter")}
                                    >
                                        <XCircle className="h-4 w-4 mr-1.5" />
                                        Rejeter
                                    </Button>
                                </div>

                                {/* Select action sur la cible — uniquement si on traite */}
                                {modalAction === "traiter" && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="action-cible" className="text-xs text-muted-foreground">
                                            Action sur la cible
                                        </Label>
                                        <Select value={actionCible} onValueChange={setActionCible}>
                                            <SelectTrigger id="action-cible" className="w-full">
                                                <SelectValue placeholder="Choisir une action" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getActionCibleOptions().map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* ── Section 3 : Note admin — toujours visible ── */}
                            <div className="space-y-1.5">
                                <Label htmlFor="note-admin" className="text-xs text-muted-foreground">
                                    {modalAction === "traiter"
                                        ? "Note visible par la personne concernée (optionnel)"
                                        : "Motif du rejet visible par le reporter (optionnel)"}
                                </Label>
                                <Textarea
                                    id="note-admin"
                                    placeholder={
                                        modalAction === "traiter"
                                            ? "Ex : votre annonce contient des informations incorrectes..."
                                            : "Ex : le signalement ne correspond pas à nos conditions..."
                                    }
                                    value={noteAdmin}
                                    maxLength={500}
                                    rows={3}
                                    onChange={e => setNoteAdmin(e.target.value)}
                                    className="resize-none text-sm"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {noteAdmin.length} / 500
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setSelected(null)}
                            disabled={acting}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={executeAction}
                            disabled={acting}
                            className={
                                modalAction === "traiter"
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-red-600 text-white hover:bg-red-700"
                            }
                        >
                            {acting ? "En cours..." : "Confirmer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
