"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Car, Eye, Fuel, Gauge, Pencil, Trash2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/src/lib/api"
import { vehicule } from "@/src/types"
import Link from "next/link"
import { EditVehicle } from "./editVehicle"

// On réexporte le type réel du backend pour que page.tsx puisse l'importer depuis ici
export type { vehicule as Vehicules }

const getStatutConfig = (statut: string) => {
    switch (statut) {
        case "disponible": return { label: "Disponible", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
        case "vendu": return { label: "Vendu", className: "bg-zinc-100 text-zinc-700 border-zinc-300" }
        case "loué": return { label: "Loué", className: "bg-sky-50 text-sky-700 border-sky-200" }
        case "suspendu": return { label: "Suspendu", className: "bg-amber-50 text-amber-700 border-amber-200" }
        case "banni": return { label: "Banni", className: "bg-red-50 text-red-700 border-red-200" }
        default: return { label: statut, className: "bg-muted text-muted-foreground" }
    }
}

/**
 * Génère les colonnes de la table en injectant le callback onRefresh.
 * On utilise une factory plutôt qu'une constante pour pouvoir passer
 * le callback de rechargement à chaque cellule d'action.
 */
export function makeColonnes(onRefresh: () => void): ColumnDef<vehicule>[] {
    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Tout sélectionner"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Sélectionner la ligne"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            id: "vehicule",
            accessorFn: (row) => `${row.description?.marque} ${row.description?.modele}`,
            header: "Véhicule",
            cell: ({ row }) => {
                const v = row.original
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                            <Car className="h-5 w-5 text-zinc-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-sm">
                                {v.description?.marque} {v.description?.modele}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Fuel className="h-3 w-3" />
                                    {v.description?.carburant}
                                </span>
                                <span className="text-border">|</span>
                                <span className="flex items-center gap-1">
                                    <Gauge className="h-3 w-3" />
                                    {v.description?.kilometrage} km
                                </span>
                                <span className="text-border">|</span>
                                <span>{v.description?.annee}</span>
                            </div>
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: "post_type",
            header: "Type",
            cell: ({ row }) => {
                const type = row.getValue("post_type") as string
                return (
                    <Badge variant="outline" className={
                        type === "vente"
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-900 border-zinc-300"
                    }>
                        {type === "vente" ? "Vente" : "Location"}
                    </Badge>
                )
            },
            filterFn: (row, id, value) => value.includes(row.getValue(id)),
        },
        {
            accessorKey: "prix",
            header: () => <div className="text-right">Prix</div>,
            cell: ({ row }) => {
                const prix = row.getValue("prix") as number
                const type = row.original.post_type
                return (
                    <div className="text-right">
                        <span className="font-bold text-sm">{Number(prix).toLocaleString("fr-FR")}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                            FCFA{type === "location" ? "/j" : ""}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const statut = row.getValue("statut") as string
                const config = getStatutConfig(statut)
                return (
                    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
                        {config.label}
                    </Badge>
                )
            },
            filterFn: (row, id, value) => value.includes(row.getValue(id)),
        },
        {
            accessorKey: "views_count",
            header: () => <div className="text-center">Vues</div>,
            cell: ({ row }) => {
                const vues = row.getValue("views_count") as number
                return (
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{vues ?? 0}</span>
                    </div>
                )
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => <ActionsCell vehicule={row.original} onRefresh={onRefresh} />,
        },
    ]
}

// ── Cellule d'actions ──────────────────────────────────────────────────────

function ActionsCell({ vehicule: v, onRefresh }: { vehicule: vehicule; onRefresh: () => void }) {
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<vehicule | null>(null)

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await api.delete(`/vehicules/${v.id}`)
            toast.success("Véhicule supprimé", {
                description: `${v.description?.marque} ${v.description?.modele} a été supprimé.`,
            })
            setDeleteOpen(false)
            onRefresh()
        } catch {
            toast.error("Impossible de supprimer ce véhicule")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-end gap-1">
                <Button asChild variant="ghost" size="icon-xs" className="cursor-pointer">
                    <Link href={`/partenaire/mongarage/${v.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                    </Link>
                </Button>

                <Button variant="ghost" size="icon-xs" className="cursor-pointer" onClick={() => setEditingVehicle(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="cursor-pointer text-destructive hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {editingVehicle &&(
                <EditVehicle 
                    isOpen={!!editingVehicle}
                    vehicule={editingVehicle}
                    onClose={() => setEditingVehicle(null)}
                    onSubmit={() => { setEditingVehicle(null); onRefresh() }}
                />
            )}

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-red-100 text-red-600">
                            <Trash2 />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Supprimer le véhicule ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. {v.description?.marque} {v.description?.modele} sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline">Annuler</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Suppression..." : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
