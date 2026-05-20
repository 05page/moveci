"use client"
import { useState, useEffect, useCallback } from "react"
import { getErrorMessage } from "@/src/lib/handleError"
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus"
import { useDataRefresh } from "@/hooks/useDataRefresh"
import { motion } from "motion/react"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
    Car, Plus, Eye, Search,
    Tag, Key, Package, CheckCircle2,
    Edit, Trash2, Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import DetailsCard from "./DetailsVehicles"
import { EditVehicle } from "./EditVehicle"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { VendeurStats } from "@/src/types";
import { vehicule, MesVehicules } from "@/src/types";
import { getMesStats } from "@/src/actions/stats.actions";
import { getMesVehicules, deleteVehicule } from "@/src/actions/vehicules.actions";

const CARD = "rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm"
export default function VehiclesPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [stats, setStats] = useState<VendeurStats | null>(null)
    const [mesvehicules, setMesVehicules] = useState<vehicule[]>([])

    const [detailVehicle, setDetailVehicle] = useState<vehicule | null>(null)
    const [editingVehicle, setEditingVehicle] = useState<vehicule | null>(null)
    const [vehicleToDelete, setVehicleToDelete] = useState<vehicule | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false);


    const handleDelete = async () => {
        if (!vehicleToDelete) return
        try {
            await deleteVehicule(vehicleToDelete.id)
            toast.success("Véhicule supprimé", {
                description: `${vehicleToDelete.description?.marque} ${vehicleToDelete.description?.modele} a été supprimé.`,
            })
            setDeleteOpen(false)
            setVehicleToDelete(null)
            fetchVendeurVehicles()
        } catch {
            toast.error("Erreur lors de la suppression du véhicule")
        }
    }
    const fetchVendeurVehicles = useCallback(async () => {
        try {
            setIsLoading(true);
            const [statsRes, mesVehiculesRes] = await Promise.all([
                getMesStats(),
                getMesVehicules()
            ]);
            setStats(statsRes.data ?? null)
            setMesVehicules(mesVehiculesRes.data?.vehicules ?? [])
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoading(false);
        }
    }, [])

    useEffect(() => { fetchVendeurVehicles() }, [fetchVendeurVehicles])

    // Recharge la liste quand l'utilisateur revient sur l'onglet
    useRevalidateOnFocus(fetchVendeurVehicles)
    // Recharge en temps réel via Reverb quand un véhicule change (ex: validation admin)
    useDataRefresh("vehicule", fetchVendeurVehicles)

    const getStatutColor = (statut: string, status_validation?: string) => {
        if (status_validation === "rejetee")  return "bg-red-500/10 text-red-600 border-red-500/20"
        if (status_validation === "en_attente") return "bg-orange-500/10 text-orange-600 border-orange-500/20"
        switch (statut) {
            case "disponible": return "bg-zinc-900/10 text-zinc-700 border-zinc-900/20"
            case "réservé": return "bg-amber-500/10 text-amber-600 border-amber-500/20"
            case "vendu": return "bg-purple-500/10 text-purple-600 border-purple-500/20"
            case "loué": return "bg-blue-500/10 text-blue-600 border-blue-500/20"
            case "brouillon": return "bg-muted text-muted-foreground border-border"
            default: return "bg-muted text-muted-foreground"
        }
    }

    const getStatutLabel = (statut: string, status_validation?: string) => {
        if (status_validation === "rejetee")  return "Rejeté"
        if (status_validation === "en_attente") return "En attente de validation"
        switch (statut) {
            case "disponible": return "Disponible"
            case "réservé": return "Réservé"
            case "vendu": return "Vendu"
            case "loué": return "En location"
            case "brouillon": return "Brouillon"
            default: return statut
        }
    }
 
    const statsCards = [
        { label: "Total", value: mesvehicules.length, icon: Package, color: "bg-zinc-900/10 text-zinc-700" },
        { label: "En vente", value: mesvehicules.filter(v => v.post_type === "vente" && v.statut === "disponible").length, icon: Tag, color: "bg-zinc-900/10 text-zinc-700" },
        { label: "En location", value: mesvehicules.filter(v => v.post_type === "location").length, icon: Key, color: "bg-blue-500/10 text-blue-600" },
        { label: "Vendus / Loués", value: mesvehicules.filter(v => v.statut === "vendu" || v.statut === "loué").length, icon: CheckCircle2, color: "bg-purple-500/10 text-purple-600" },
    ]

    const filterVehicles = (tab: string) => {
        let filtered = mesvehicules
        if (tab === "en_attente") filtered = mesvehicules.filter(v => v.status_validation === "en_attente")
        else if (tab === "rejetee") filtered = mesvehicules.filter(v => v.status_validation === "rejetee")
        else if (tab === "vente") filtered = mesvehicules.filter(v => v.post_type === "vente" && !["en_attente", "rejetee"].includes(v.status_validation ?? ""))
        else if (tab === "location") filtered = mesvehicules.filter(v => v.post_type === "location" && !["en_attente", "rejetee"].includes(v.status_validation ?? ""))
        else if (tab === "vendus") filtered = mesvehicules.filter(v => v?.statut === "vendu" || v.statut === "loué")
        if (searchQuery) {
            filtered = filtered.filter(v =>
                `${v?.description?.marque} ${v?.description?.modele}`.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        return filtered
    }

    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 px-4 md:px-6 pb-12">
                <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                    </div>
                </div>
            </div>
        )
    }

    const VehicleCard = ({ v, index }: { v: vehicule; index: number }) => {
        // Récupère la photo principale (is_primary=true) ou la première du tableau
        const primaryPhoto = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
        const imageUrl = primaryPhoto
            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${primaryPhoto.path}`
            : null

        return (
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
            >
                <Card className={cn(CARD, "group hover:shadow-2xl transition-shadow duration-300 overflow-hidden")}>
                    <CardContent className="p-0">
                        {/* Zone image — plus haute, zoom au hover */}
                        <div className="h-52 bg-muted/30 relative overflow-hidden">
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt={`${v.description?.marque} ${v.description?.modele}`}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Car className="h-14 w-14 text-muted-foreground/20" />
                                </div>
                            )}

                            {/* Gradient overlay — prix en bas de l'image */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                            {/* Badges statut + type */}
                            <Badge className={cn("absolute top-3 left-3 rounded-full text-xs font-semibold", getStatutColor(v?.statut, v?.status_validation))}>
                                {getStatutLabel(v?.statut, v?.status_validation)}
                            </Badge>
                            <Badge className={cn(
                                "absolute top-3 right-3 rounded-full text-xs font-semibold",
                                v?.post_type === "vente"
                                    ? "bg-black/60 text-white border-white/10"
                                    : "bg-blue-500/80 text-white border-transparent"
                            )}>
                                {v?.post_type === "vente"
                                    ? <><Tag className="h-3 w-3 mr-1 inline" />Vente</>
                                    : <><Key className="h-3 w-3 mr-1 inline" />Location</>
                                }
                            </Badge>

                            {/* Prix dans l'overlay bas */}
                            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                                <div>
                                    <p className="text-white font-bold text-lg leading-tight">
                                        {v?.prix?.toLocaleString("fr-FR")}
                                        <span className="text-xs font-normal text-white/70 ml-1">FCFA</span>
                                    </p>
                                </div>
                                <span className="flex items-center gap-1 text-white/70 text-xs">
                                    <Eye className="h-3 w-3" /> {v?.views_count}
                                </span>
                            </div>
                        </div>

                        {/* Infos + actions */}
                        <div className="p-4 space-y-3">
                            <div>
                                <h3 className="font-bold text-base leading-tight">
                                    {v?.description.marque} {v?.description.modele}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {v?.description.annee} · {Number(v?.description.kilometrage)?.toLocaleString("fr-FR")} km · {v?.description.carburant}
                                </p>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1 cursor-pointer rounded-lg text-xs min-w-0"
                                    onClick={() => setDetailVehicle(v)}
                                >
                                    <Eye className="h-3 w-3 shrink-0" />
                                    <span className="truncate">Détails</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1 cursor-pointer rounded-lg text-xs min-w-0"
                                    onClick={() => setEditingVehicle(v)}
                                >
                                    <Edit className="h-3 w-3 shrink-0" />
                                    <span className="truncate">Modifier</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 cursor-pointer rounded-lg text-xs text-red-500 hover:text-red-600 hover:border-red-200 px-2.5"
                                    onClick={() => { setVehicleToDelete(v); setDeleteOpen(true) }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )
    }

    return (
        <div className="min-h-screen pt-20 px-4 md:px-6 pb-12 overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in fade-in slide-in-from-left duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900/10 flex items-center justify-center">
                            <Car className="h-6 w-6 text-zinc-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Mes véhicules</h1>
                            <p className="text-muted-foreground text-sm">{stats?.stats?.total_vehicule} véhicules au total</p>
                        </div>
                    </div>
                    <Link href="/vendeur/addVehicle">
                        <Button className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-bold cursor-pointer rounded-xl">
                            <Plus className="h-4 w-4" /> Nouvelle annonce
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom duration-500">
                    {statsCards.map((s, i) => (
                        <Card key={i} className={cn(CARD, "hover:shadow-lg transition-all duration-300")}>
                            <CardContent className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
                                <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                                    <s.icon className="h-4 w-4 md:h-5 md:w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xl md:text-2xl font-bold">{s.value}</p>
                                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search */}
                <Card className={cn(CARD, "animate-in fade-in slide-in-from-bottom duration-500 delay-100")}>
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher un véhicule..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs + Vehicles */}
                <Tabs defaultValue="tous" className="animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                    <div className="overflow-x-auto pb-1 mb-4 -mx-1 px-1">
                        <TabsList className="bg-muted/50 rounded-xl p-1 w-max min-w-full md:w-auto flex">
                            <TabsTrigger value="tous" className="rounded-lg cursor-pointer whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black">Tous</TabsTrigger>
                            <TabsTrigger value="vente" className="rounded-lg cursor-pointer whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black">En vente</TabsTrigger>
                            <TabsTrigger value="location" className="rounded-lg cursor-pointer whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black">En location</TabsTrigger>
                            <TabsTrigger value="vendus" className="rounded-lg cursor-pointer whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black">Vendus/Loués</TabsTrigger>
                            <TabsTrigger value="en_attente" className="rounded-lg cursor-pointer whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black">En attente</TabsTrigger>
                            <TabsTrigger value="rejetee" className="rounded-lg cursor-pointer whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-red-600">
                                Rejetés {mesvehicules.filter(v => v.status_validation === "rejetee").length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                                        {mesvehicules.filter(v => v.status_validation === "rejetee").length}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {["tous", "vente", "location", "vendus", "en_attente", "rejetee"].map(tab => (
                        <TabsContent key={tab} value={tab}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filterVehicles(tab).map((v, i) => <VehicleCard key={v.id} v={v} index={i} />)}
                            </div>
                            {filterVehicles(tab).length === 0 && (
                                <Card className={CARD}>
                                    <CardContent className="p-12 text-center">
                                        <Car className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                        <p className="font-medium">Aucun véhicule trouvé</p>
                                        <p className="text-sm text-muted-foreground mt-1">Modifiez vos critères de recherche</p>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Dialog Détails */}
            {detailVehicle && (
                <DetailsCard
                    isOpen={!!detailVehicle}
                    vehicule={detailVehicle}
                    onClose={() => setDetailVehicle(null)}
                />
            )}

             {editingVehicle && (
                <EditVehicle
                    isOpen={!!editingVehicle}
                    vehicule={editingVehicle}
                    onClose={() => setEditingVehicle(null)}
                    onSubmit={() => setEditingVehicle(null)}
                />
            )}

            <AlertDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open)
                    if (!open) setVehicleToDelete(null)
                }}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <Trash2Icon />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Supprimer le véhicule ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le véhicule {vehicleToDelete?.description.marque} sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline">Annuler</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete}>
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
