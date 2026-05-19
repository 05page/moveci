"use client"

export const dynamic = "force-dynamic"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, XCircle, Eye, Clock, GraduationCap, Users, Euro, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import {
    getAdminFormations,
    validerFormation,
    rejeterFormation,
    type AdminFormation,
} from "@/src/actions/admin.actions"

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUT_LABEL: Record<AdminFormation["statut_validation"], string> = {
    en_attente: "En attente",
    validé: "Validée",
    rejeté: "Rejetée",
}

const STATUT_VARIANT: Record<AdminFormation["statut_validation"], string> = {
    en_attente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    validé: "bg-green-100 text-green-800 border-green-200",
    rejeté: "bg-red-100 text-red-800 border-red-200",
}

const PERMIS_COLOR: Record<string, string> = {
    A:  "bg-red-100 text-red-700",
    A2: "bg-orange-100 text-orange-700",
    B:  "bg-blue-100 text-blue-700",
    B1: "bg-indigo-100 text-indigo-700",
    C:  "bg-purple-100 text-purple-700",
    D:  "bg-pink-100 text-pink-700",
}

const FILTRES = [
    { value: "", label: "Toutes" },
    { value: "en_attente", label: "En attente" },
    { value: "validé", label: "Validées" },
    { value: "rejeté", label: "Rejetées" },
]

// ── Composant ──────────────────────────────────────────────────────────────

export default function AdminFormationsPage() {
    const [formations, setFormations] = useState<AdminFormation[]>([])
    const [loading, setLoading]       = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [filtre, setFiltre]         = useState("")

    const [selected, setSelected]           = useState<AdminFormation | null>(null)
    const [sheetOpen, setSheetOpen]         = useState(false)
    const [rejetDialog, setRejetDialog]     = useState(false)
    const [motif, setMotif]                 = useState("")
    const [submitting, setSubmitting]       = useState(false)

    // ── Chargement ──────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = filtre ? { statut_validation: filtre } : undefined
            const res = await getAdminFormations(params)
            // PaginatedResponse → data
            const data = (res as unknown as { data: { data: AdminFormation[] } })?.data?.data ?? []
            setFormations(data)
        } catch {
            toast.error("Impossible de charger les formations")
        } finally {
            setLoading(false)
        }
    }, [filtre])

    useEffect(() => { load() }, [load])

    const handleRefresh = () => { setRefreshing(true); load() }

    // ── Actions ─────────────────────────────────────────────
    const handleValider = async (formation: AdminFormation) => {
        setSubmitting(true)
        try {
            await validerFormation(formation.id)
            toast.success("Formation validée")
            // Mise à jour locale immédiate
            setFormations(prev =>
                prev.map(f => f.id === formation.id ? { ...f, statut_validation: "validé" } : f)
            )
            if (selected?.id === formation.id) setSelected({ ...formation, statut_validation: "validé" })
        } catch {
            toast.error("Erreur lors de la validation")
        } finally {
            setSubmitting(false)
        }
    }

    const handleRejeter = async () => {
        if (!selected || !motif.trim()) return
        setSubmitting(true)
        try {
            await rejeterFormation(selected.id, { motif })
            toast.success("Formation rejetée")
            setFormations(prev =>
                prev.map(f => f.id === selected.id ? { ...f, statut_validation: "rejeté" } : f)
            )
            setSelected({ ...selected, statut_validation: "rejeté" })
            setRejetDialog(false)
            setMotif("")
        } catch {
            toast.error("Erreur lors du rejet")
        } finally {
            setSubmitting(false)
        }
    }

    // ── Stats rapides ────────────────────────────────────────
    const countByStatut = (s: string) => formations.filter(f => f.statut_validation === s).length

    // ── Rendu ────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Modération des formations</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Valider ou rejeter les formations soumises par les auto-écoles.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50 shrink-0"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "En attente", count: countByStatut("en_attente"), color: "text-yellow-600" },
                    { label: "Validées",   count: countByStatut("validé"),     color: "text-green-600" },
                    { label: "Rejetées",   count: countByStatut("rejeté"),     color: "text-red-600" },
                ].map(({ label, count, color }) => (
                    <Card key={label}>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={`text-2xl font-bold ${color}`}>{loading ? "—" : count}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filtres */}
            <div className="flex gap-2 flex-wrap">
                {FILTRES.map(f => (
                    <Button
                        key={f.value}
                        variant={filtre === f.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFiltre(f.value)}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            {/* Tableau */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
            ) : formations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <GraduationCap className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Aucune formation trouvée</p>
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Formation</th>
                                <th className="text-left px-4 py-3 font-medium">Auto-école</th>
                                <th className="text-left px-4 py-3 font-medium">Permis</th>
                                <th className="text-right px-4 py-3 font-medium">Prix</th>
                                <th className="text-right px-4 py-3 font-medium">Durée</th>
                                <th className="text-center px-4 py-3 font-medium">Inscrits</th>
                                <th className="text-center px-4 py-3 font-medium">Statut</th>
                                <th className="text-right px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {formations.map(formation => (
                                <tr key={formation.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium truncate max-w-[180px]">
                                            {formation.description?.titre ?? "Sans titre"}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {formation.auto_ecole?.fullname ?? "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${PERMIS_COLOR[formation.type_permis] ?? "bg-muted"}`}>
                                            {formation.type_permis}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {formation.prix.toLocaleString("fr-FR")} FCFA
                                    </td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">
                                        {formation.duree_heures}h
                                    </td>
                                    <td className="px-4 py-3 text-center text-muted-foreground">
                                        {formation.inscriptions_count}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUT_VARIANT[formation.statut_validation]}`}>
                                            {STATUT_LABEL[formation.statut_validation]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Détail */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => { setSelected(formation); setSheetOpen(true) }}
                                                title="Voir le détail"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {formation.statut_validation === "en_attente" && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleValider(formation)}
                                                        disabled={submitting}
                                                        title="Valider"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => { setSelected(formation); setRejetDialog(true) }}
                                                        disabled={submitting}
                                                        title="Rejeter"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sheet détail */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    {selected && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selected.description?.titre ?? "Formation"}</SheetTitle>
                                <SheetDescription>
                                    Soumise par <strong>{selected.auto_ecole?.fullname}</strong>
                                </SheetDescription>
                            </SheetHeader>

                            <div className="mt-6 space-y-5">
                                {/* Statut */}
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUT_VARIANT[selected.statut_validation]}`}>
                                        {STATUT_LABEL[selected.statut_validation]}
                                    </span>
                                </div>

                                <Separator />

                                {/* Infos */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <GraduationCap className="h-4 w-4 shrink-0" />
                                        <span>Permis <strong className="text-foreground">{selected.type_permis}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4 shrink-0" />
                                        <span><strong className="text-foreground">{selected.duree_heures}h</strong> de formation</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Euro className="h-4 w-4 shrink-0" />
                                        <span><strong className="text-foreground">{selected.prix.toLocaleString("fr-FR")}</strong> FCFA</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="h-4 w-4 shrink-0" />
                                        <span><strong className="text-foreground">{selected.inscriptions_count}</strong> inscrits</span>
                                    </div>
                                </div>

                                <Separator />

                                {/* Description */}
                                {selected.description?.texte && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Description</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                            {selected.description.texte}
                                        </p>
                                    </div>
                                )}

                                {/* Actions si en attente */}
                                {selected.statut_validation === "en_attente" && (
                                    <>
                                        <Separator />
                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => { handleValider(selected); setSheetOpen(false) }}
                                                disabled={submitting}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Valider
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                                onClick={() => { setSheetOpen(false); setRejetDialog(true) }}
                                                disabled={submitting}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Rejeter
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Dialog rejet avec motif */}
            <Dialog open={rejetDialog} onOpenChange={setRejetDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter la formation</DialogTitle>
                        <DialogDescription>
                            Indiquez le motif du rejet. L&apos;auto-école pourra en prendre connaissance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="motif">Motif (obligatoire)</Label>
                        <Textarea
                            id="motif"
                            value={motif}
                            onChange={e => setMotif(e.target.value)}
                            placeholder="Ex : Description insuffisante, prix anormal, informations manquantes..."
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejetDialog(false); setMotif("") }}>
                            Annuler
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleRejeter}
                            disabled={!motif.trim() || submitting}
                        >
                            Confirmer le rejet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
