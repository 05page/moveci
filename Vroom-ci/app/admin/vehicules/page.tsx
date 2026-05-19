"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import {
    Car,
    CheckCircle2,
    XCircle,
    User,
    Fuel,
    Gauge,
    Tag,
    Clock,
    Eye,
    Calendar,
    Wrench,
    DollarSign,
    RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { getVehicules, validerVehicule, rejeterVehicule } from "@/src/actions/admin.actions"

// Interface complète du véhicule avec tous les champs renvoyés par le backend
interface Vehicule {
    id: string
    post_type: "vente" | "location"
    type: "neuf" | "occasion"
    statut: string
    prix: number
    prix_suggere?: number
    negociable: boolean
    date_disponibilite?: string
    status_validation: string
    description_validation?: string
    views_count?: number
    created_at: string
    creator?: { id: string; fullname: string; role: string }
    description?: {
        marque: string
        modele: string
        annee: number
        carburant?: string
        transmission?: string
        kilometrage?: string
        couleur?: string
        nombre_portes?: number
        nombre_places?: number
        visite_technique?: string
        carte_grise?: string
        assurance?: string
        historique_accidents?: string
        equipements?: string[]
    }
    photos?: { path: string; is_primary: boolean; position: number }[]
}

// Définition des filtres possibles avec leur libellé et style de badge
const FILTRES = [
    { value: "tous",       label: "Tous" },
    { value: "en_attente", label: "En attente" },
    { value: "validee",    label: "Validés" },
    { value: "rejetee",    label: "Rejetés" },
    { value: "restauree",  label: "Restaurés" },
    { value: "a_venir",  label: "A Venir" },
] as const

type FiltreValue = typeof FILTRES[number]["value"]

// Renvoie le style du badge selon le statut de validation
function badgeStatut(statut: string) {
    switch (statut) {
        case "validee":    return "bg-green-100 text-green-700 border-green-200"
        case "rejetee":    return "bg-red-100 text-red-700 border-red-200"
        case "en_attente": return "bg-yellow-100 text-yellow-700 border-yellow-200"
        case "restauree":  return "bg-blue-100 text-blue-700 border-blue-200"
        default:           return "bg-muted text-muted-foreground"
    }
}

function labelStatut(statut: string) {
    switch (statut) {
        case "validee":    return "Validé"
        case "rejetee":    return "Rejeté"
        case "en_attente": return "En attente"
        case "restauree":  return "Restauré"
        case "a_venir":    return "A Venir"
        default:           return statut
    }
}

const photoUrl = (path: string) => path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${path}`

export default function AdminVehiculesPage() {
    const [vehicules, setVehicules] = useState<Vehicule[]>([])
    const [loading, setLoading]     = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [filtre, setFiltre]       = useState<FiltreValue>("tous")
    const searchParams = useSearchParams();
    const openId = searchParams.get("open")
    // State du drawer latéral : le véhicule sélectionné (null = fermé)
    const [selectedVehicule, setSelectedVehicule] = useState<Vehicule | null>(null)
    // Photo active dans la galerie du drawer
    const [activePhoto, setActivePhoto] = useState<string | null>(null)

    // Validation
    const [toValidate, setToValidate] = useState<Vehicule | null>(null)
    const [validating, setValidating] = useState(false)

    // Rejet (motif obligatoire côté backend)
    const [toReject, setToReject] = useState<Vehicule | null>(null)
    const [motif, setMotif]       = useState("")
    const [rejecting, setRejecting] = useState(false)

    const fetchVehicules = useCallback(async () => {
        setLoading(true)
        try {
            // getVehicules() retourne vehicule[] (type public) — castée ici vers Vehicule (type local admin plus complet)
            const res = await getVehicules()
            if (res.data) setVehicules(res.data as unknown as Vehicule[])
        } catch {
            toast.error("Impossible de charger les véhicules")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchVehicules() }, [fetchVehicules])

    const handleRefresh = () => { setRefreshing(true); fetchVehicules() }

    // Quand un véhicule est sélectionné, initialise la photo active sur la photo
    // marquée is_primary, sinon la première de la liste
    useEffect(() => {
        if (!selectedVehicule?.photos?.length) {
            setActivePhoto(null)
            return
        }
        const primary = selectedVehicule.photos.find(p => p.is_primary)
        setActivePhoto(photoUrl((primary ?? selectedVehicule.photos[0]).path))
    }, [selectedVehicule])

     useEffect(() => {                                                                                                                                                                   if (openId) {                                                                                                                                                             
          const found = vehicules.find((v => v.id === openId))
          if (found) setSelectedVehicule(found)  
      }
  }, [vehicules, openId])

    // Filtrage local — aucun appel API supplémentaire
    const vehiculesFiltres = useMemo(() =>
        filtre === "tous" ? vehicules : vehicules.filter(v => v.status_validation === filtre),
        [vehicules, filtre]
    )

    // Comptage par statut pour afficher les badges sur les onglets
    const comptages = useMemo(() => {
        const counts: Record<string, number> = { tous: vehicules.length }
        for (const v of vehicules) {
            counts[v.status_validation] = (counts[v.status_validation] ?? 0) + 1
        }
        return counts
    }, [vehicules])

    const handleValidate = async () => {
        if (!toValidate) return
        setValidating(true)
        try {
            await validerVehicule(toValidate.id)
            toast.success(`Annonce validée — ${toValidate.description?.marque} ${toValidate.description?.modele}`)
            setToValidate(null)
            fetchVehicules()
        } catch {
            toast.error("Échec de la validation")
        } finally {
            setValidating(false)
        }
    }

    const handleReject = async () => {
        if (!toReject || !motif.trim()) return
        setRejecting(true)
        try {
            await rejeterVehicule(toReject.id, { motif })
            toast.success(`Annonce rejetée — ${toReject.description?.marque} ${toReject.description?.modele}`)
            setToReject(null)
            setMotif("")
            fetchVehicules()
        } catch {
            toast.error("Échec du rejet")
        } finally {
            setRejecting(false)
        }
    }

    // Raccourci pour accéder aux champs de description du véhicule sélectionné
    const desc = selectedVehicule?.description

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Modération véhicules</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Toutes les annonces · {vehicules.length} au total
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
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
                        <Car className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">{vehiculesFiltres.length}</span>
                    </div>
                </div>
            </div>

            {/* Onglets de filtre */}
            <div className="flex flex-wrap gap-2">
                {FILTRES.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setFiltre(value)}
                        className={[
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                            filtre === value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:bg-muted",
                        ].join(" ")}
                    >
                        {label}
                        {(comptages[value] ?? 0) > 0 && (
                            <span className={[
                                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                filtre === value ? "bg-white/20" : "bg-muted-foreground/15",
                            ].join(" ")}>
                                {comptages[value]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Liste des véhicules */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <Skeleton className="h-20 w-28 rounded-lg shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-64" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-8 w-20" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : vehiculesFiltres.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 mb-3 text-green-600" />
                        <p className="font-medium">Aucun résultat</p>
                        <p className="text-sm mt-1">Aucun véhicule pour ce filtre</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {vehiculesFiltres.map((v) => (
                        // cursor-pointer + onClick pour ouvrir le drawer de détails
                        <Card
                            key={v.id}
                            className="hover:shadow-sm transition-shadow cursor-pointer"
                            onClick={() => setSelectedVehicule(v)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Photo principale ou icône de fallback */}
                                    {(() => {
                                        const photo = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
                                        const src = photo ? photoUrl(photo.path) : null
                                        return src ? (
                                            <div className="relative h-20 w-28 rounded-lg overflow-hidden shrink-0">
                                                <img
                                                    src={src}
                                                    alt={`${v.description?.marque} ${v.description?.modele}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-secondary shrink-0">
                                                <Car className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )
                                    })()}

                                    {/* Infos véhicule */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="font-semibold text-base">
                                                {v.description?.marque} {v.description?.modele}{" "}
                                                <span className="text-muted-foreground font-normal">
                                                    ({v.description?.annee})
                                                </span>
                                            </h3>
                                            {/* Badge type de publication */}
                                            <Badge className={
                                                v.post_type === "vente"
                                                    ? "bg-primary/15 text-primary border-primary/25 text-xs"
                                                    : "bg-blue-100 text-blue-700 border-blue-200 text-xs"
                                            }>
                                                {v.post_type === "vente" ? "Vente" : "Location"}
                                            </Badge>
                                            {/* Badge statut de validation */}
                                            <Badge className={`${badgeStatut(v.status_validation)} text-xs`}>
                                                {labelStatut(v.status_validation)}
                                            </Badge>
                                            {/* Badge disponibilité */}
                                            {v.statut !== "disponible" && (
                                                <Badge className={
                                                    v.statut === "vendu"
                                                        ? "bg-zinc-900 text-white border-zinc-900 text-xs"
                                                        : v.statut === "loué"
                                                        ? "bg-blue-600 text-white border-blue-600 text-xs"
                                                        : "bg-zinc-100 text-zinc-600 text-xs"
                                                }>
                                                    {v.statut === "vendu" ? "Vendu" : v.statut === "loué" ? "Loué" : v.statut}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Tag className="h-3 w-3" />
                                                {Number(v.prix).toLocaleString("fr-FR")} FCFA
                                                {v.negociable && " (négociable)"}
                                            </span>
                                            {v.description?.carburant && (
                                                <span className="flex items-center gap-1">
                                                    <Fuel className="h-3 w-3" />
                                                    {v.description.carburant}
                                                </span>
                                            )}
                                            {v.description?.kilometrage && (
                                                <span className="flex items-center gap-1">
                                                    <Gauge className="h-3 w-3" />
                                                    {v.description.kilometrage}
                                                </span>
                                            )}
                                        </div>

                                        <Separator className="my-2" />

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {v.creator?.fullname ?? "Inconnu"}{" "}
                                                <span className="opacity-60">({v.creator?.role})</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Soumis le {new Date(v.created_at).toLocaleDateString("fr-FR")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Boutons d'action — stopPropagation pour ne pas ouvrir le drawer */}
                                    {v.status_validation === "en_attente" && (
                                        <div
                                            className="flex flex-col gap-2 shrink-0"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                                onClick={() => setToValidate(v)}
                                            >
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Valider
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 h-8 text-xs"
                                                onClick={() => { setToReject(v); setMotif("") }}
                                            >
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Rejeter
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Sheet
                open={!!selectedVehicule}
                onOpenChange={open => !open && setSelectedVehicule(null)}
            >
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                    {selectedVehicule && (
                        <>
                            <SheetHeader className="mb-4">
                                <SheetTitle>
                                    {desc?.marque} {desc?.modele}{" "}
                                    {desc?.annee ? `(${desc.annee})` : ""}
                                </SheetTitle>
                                {/* Identifiant court pour retrouver l'annonce rapidement */}
                                <SheetDescription>#{selectedVehicule.id.slice(0, 8)}</SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">

                                {/* ---- Section 1 : Galerie photos ---- */}
                                <section>
                                    {selectedVehicule.photos && selectedVehicule.photos.length > 0 ? (
                                        <div className="space-y-2">
                                            {/* Photo principale agrandie */}
                                            <div className="h-48 w-full rounded-lg overflow-hidden bg-secondary">
                                                <img
                                                    src={activePhoto ?? ""}
                                                    alt={`${desc?.marque} ${desc?.modele}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            {/* Miniatures scrollables — cliquer pour changer la photo principale */}
                                            <div className="flex gap-2 overflow-x-auto pb-1">
                                                {selectedVehicule.photos.map((p, i) => (
                                                    <img
                                                        key={i}
                                                        src={photoUrl(p.path)}
                                                        alt={`Photo ${i + 1}`}
                                                        className={[
                                                            "h-16 w-20 shrink-0 rounded object-cover cursor-pointer transition-opacity",
                                                            // Met en évidence la miniature active
                                                            activePhoto === photoUrl(p.path)
                                                                ? "ring-2 ring-primary opacity-100"
                                                                : "opacity-60 hover:opacity-100",
                                                        ].join(" ")}
                                                        onClick={() => setActivePhoto(photoUrl(p.path))}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Aucune photo : placeholder centré */
                                        <div className="flex h-48 w-full items-center justify-center rounded-lg bg-secondary">
                                            <Car className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}
                                </section>

                                <Separator />

                                {/* ---- Section 2 : Infos principales ---- */}
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Informations principales
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">

                                        {/* Type de publication */}
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Tag className="h-3 w-3" /> Publication
                                            </p>
                                            <Badge className={
                                                selectedVehicule.post_type === "vente"
                                                    ? "bg-green-100 text-green-700 border-green-200"
                                                    : "bg-blue-100 text-blue-700 border-blue-200"
                                            }>
                                                {selectedVehicule.post_type === "vente" ? "Vente" : "Location"}
                                            </Badge>
                                        </div>

                                        {/* Type de véhicule */}
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Car className="h-3 w-3" /> Type
                                            </p>
                                            <p className="text-sm font-medium capitalize">{selectedVehicule.type}</p>
                                        </div>

                                        {/* Statut de disponibilité */}
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Wrench className="h-3 w-3" /> Statut
                                            </p>
                                            <p className="text-sm font-medium capitalize">{selectedVehicule.statut}</p>
                                        </div>

                                        {/* Prix */}
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" /> Prix
                                            </p>
                                            <p className="text-sm font-medium">
                                                {Number(selectedVehicule.prix).toLocaleString("fr-FR")} FCFA
                                                {selectedVehicule.negociable && (
                                                    <Badge className="ml-2 bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
                                                        négociable
                                                    </Badge>
                                                )}
                                            </p>
                                        </div>

                                        {/* Prix suggéré par l'IA — affiché seulement si présent */}
                                        {selectedVehicule.prix_suggere != null && (
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" /> Prix IA
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {Number(selectedVehicule.prix_suggere).toLocaleString("fr-FR")} FCFA
                                                </p>
                                            </div>
                                        )}

                                        {/* Date de disponibilité — affichée seulement si présente */}
                                        {selectedVehicule.date_disponibilite && (
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" /> Disponible le
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {new Date(selectedVehicule.date_disponibilite).toLocaleDateString("fr-FR")}
                                                </p>
                                            </div>
                                        )}

                                        {/* Nombre de vues — affiché seulement si présent */}
                                        {selectedVehicule.views_count != null && (
                                            <div className="space-y-0.5">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Eye className="h-3 w-3" /> Vues
                                                </p>
                                                <p className="text-sm font-medium">{selectedVehicule.views_count}</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <Separator />

                                {/* ---- Section 3 : Description technique ---- */}
                                {desc && (
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                            Description technique
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Seuls les champs non-null/undefined sont affichés */}
                                            {desc.marque && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Marque</p>
                                                    <p className="text-sm font-medium">{desc.marque}</p>
                                                </div>
                                            )}
                                            {desc.modele && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Modèle</p>
                                                    <p className="text-sm font-medium">{desc.modele}</p>
                                                </div>
                                            )}
                                            {desc.annee && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Année</p>
                                                    <p className="text-sm font-medium">{desc.annee}</p>
                                                </div>
                                            )}
                                            {desc.carburant && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Carburant</p>
                                                    <p className="text-sm font-medium">{desc.carburant}</p>
                                                </div>
                                            )}
                                            {desc.transmission && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Transmission</p>
                                                    <p className="text-sm font-medium">{desc.transmission}</p>
                                                </div>
                                            )}
                                            {desc.kilometrage && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Kilométrage</p>
                                                    <p className="text-sm font-medium">{desc.kilometrage}</p>
                                                </div>
                                            )}
                                            {desc.couleur && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Couleur</p>
                                                    <p className="text-sm font-medium">{desc.couleur}</p>
                                                </div>
                                            )}
                                            {desc.nombre_portes != null && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Nb portes</p>
                                                    <p className="text-sm font-medium">{desc.nombre_portes}</p>
                                                </div>
                                            )}
                                            {desc.nombre_places != null && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Nb places</p>
                                                    <p className="text-sm font-medium">{desc.nombre_places}</p>
                                                </div>
                                            )}
                                            {desc.visite_technique && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Visite technique</p>
                                                    <p className="text-sm font-medium">{desc.visite_technique}</p>
                                                </div>
                                            )}
                                            {desc.carte_grise && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Carte grise</p>
                                                    <p className="text-sm font-medium">{desc.carte_grise}</p>
                                                </div>
                                            )}
                                            {desc.assurance && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Assurance</p>
                                                    <p className="text-sm font-medium">{desc.assurance}</p>
                                                </div>
                                            )}
                                            {desc.historique_accidents && (
                                                <div className="col-span-2">
                                                    <p className="text-xs text-muted-foreground">Historique accidents</p>
                                                    <p className="text-sm font-medium">{desc.historique_accidents}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Équipements — badges si la liste est non vide */}
                                        {desc.equipements && desc.equipements.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs text-muted-foreground">Équipements</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {desc.equipements.map((eq, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs">
                                                            {eq}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                )}

                                <Separator />

                                {/* ---- Section 4 : Informations admin ---- */}
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Informations admin
                                    </h3>

                                    {/* Vendeur */}
                                    {selectedVehicule.creator && (
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-sm font-medium">{selectedVehicule.creator.fullname}</span>
                                            <Badge variant="outline" className="text-[10px]">
                                                {selectedVehicule.creator.role}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Date de soumission */}
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-sm text-muted-foreground">
                                            Soumis le{" "}
                                            <span className="font-medium text-foreground">
                                                {new Date(selectedVehicule.created_at).toLocaleDateString("fr-FR", {
                                                    day: "2-digit",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Statut de validation — réutilise le helper existant */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Validation :</span>
                                        <Badge className={`${badgeStatut(selectedVehicule.status_validation)} text-xs`}>
                                            {labelStatut(selectedVehicule.status_validation)}
                                        </Badge>
                                    </div>

                                    {/* Motif de rejet — bloc rouge pâle si description_validation présent */}
                                    {selectedVehicule.description_validation && (
                                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                                            <p className="text-xs font-semibold text-red-700 mb-1">Motif de rejet</p>
                                            <p className="text-sm text-red-600">{selectedVehicule.description_validation}</p>
                                        </div>
                                    )}
                                </section>

                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Dialog confirmation validation */}
            <AlertDialog open={!!toValidate} onOpenChange={open => !open && setToValidate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Valider cette annonce ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            L&apos;annonce{" "}
                            <strong>
                                {toValidate?.description?.marque} {toValidate?.description?.modele}
                            </strong>{" "}
                            sera publiée et visible par tous les utilisateurs.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleValidate}
                            disabled={validating}
                            className="bg-green-600 text-white hover:bg-green-700"
                        >
                            {validating ? "Validation..." : "Oui, valider"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog rejet — motif obligatoire (requis par le backend) */}
            <Dialog open={!!toReject} onOpenChange={open => !open && setToReject(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter cette annonce</DialogTitle>
                        <DialogDescription>
                            Expliquez pourquoi l&apos;annonce{" "}
                            <strong>
                                {toReject?.description?.marque} {toReject?.description?.modele}
                            </strong>{" "}
                            est rejetée. Ce motif sera transmis au vendeur.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="motif">
                            Motif du rejet <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="motif"
                            placeholder="Ex: Photos insuffisantes, prix incohérent, informations manquantes..."
                            className="resize-none"
                            rows={3}
                            maxLength={500}
                            value={motif}
                            onChange={e => setMotif(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground text-right">{motif.length}/500</p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setToReject(null)}>
                            Annuler
                        </Button>
                        <Button
                            disabled={!motif.trim() || rejecting}
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={handleReject}
                        >
                            {rejecting ? "Rejet en cours..." : "Confirmer le rejet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
