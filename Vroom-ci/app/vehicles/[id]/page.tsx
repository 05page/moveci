"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    ArrowLeft,
    Car,
    Tag,
    KeyRound,
    Fuel,
    Settings,
    Palette,
    DoorOpen,
    Users,
    Gauge,
    Check,
    ChevronLeft,
    ChevronRight,
    Calendar,
    FileCheck,
    Shield,
    Clock,
    AlertCircle,
    CalendarPlus,
    Heart,
    Eye,
    User,
    Star,
    Bell,
    Flag,
    MessageSquare,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { vehicule, Avis } from "@/src/types"
import { getVehicule } from "@/src/actions/vehicules.actions"
import { useUser } from "@/src/context/UserContext"
import { cn, getPhotoUrl } from "@/src/lib/utils"
import { api } from "@/src/lib/api"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getFavoris, addFavori, removeFavori } from "@/src/actions/favoris.actions"
import { Favori } from "@/src/types"


/** Formate une date ISO ou Date en chaîne lisible en français. */
const formatDate = (date: string | Date | undefined): string => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

// ─── Skeleton de chargement ───────────────────────────────────────────────────

const VehicleDetailSkeleton = () => (
    <div className="pt-20 px-4 md:px-6 max-w-4xl mx-auto mb-12 space-y-4">
        {/* Lien retour */}
        <Skeleton className="h-8 w-28 rounded-lg" />

        {/* Galerie */}
        <Skeleton className="h-72 md:h-96 w-full rounded-2xl" />

        {/* Titre + prix */}
        <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
        </div>

        {/* Grille specs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
        </div>

        {/* Docs */}
        <Skeleton className="h-24 w-full rounded-xl" />
    </div>
)

// ─── Page principale ──────────────────────────────────────────────────────────

const VehicleDetailPage = () => {
    const params = useParams()
    const router = useRouter()
    const { user } = useUser()

    const [vehiculeData, setVehiculeData] = useState<vehicule | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    // Galerie photos
    const [photoIndex, setPhotoIndex] = useState(0)

    // Favoris
    const [isFavori, setIsFavori] = useState(false)
    const [favLoading, setFavLoading] = useState(false)

    const [contactLoading, setContactLoading] = useState(false)

    // Avis du vendeur
    const [avisData, setAvisData] = useState<{ avis: Avis[]; note_moyenne: number; total: number } | null>(null)

    // Dialog RDV
    const [rdvOpen, setRdvOpen] = useState(false)
    const [rdvLoading, setRdvLoading] = useState(false)
    const [rdvForm, setRdvForm] = useState({
        date: "",
        heure: "",
        type: "visite" as "visite" | "essai_routier" | "premiere_rencontre",
        motif: "",
        lieu: "",
    })

    // Dialog signalement
    const [signalOpen, setSignalOpen] = useState(false)
    const [signalLoading, setSignalLoading] = useState(false)
    const [signalForm, setSignalForm] = useState({ motif: "", description: "" })

    // Dialog alerte prix
    const [alerteOpen, setAlerteOpen] = useState(false)
    const [alerteLoading, setAlerteLoading] = useState(false)
    const [alerteForm, setAlerteForm] = useState({ prix_max: "", carburant: "" })

    // Réservation
    const [reserverLoading, setReserverLoading] = useState(false)

    // ── Chargement du véhicule ─────────────────────────────────────────────────
    useEffect(() => {
        const id = params?.id as string
        if (!id) return

        const fetchVehicule = async () => {
            setIsLoading(true)
            try {
                const res = await getVehicule(id)
                if (!res?.data) {
                    setNotFound(true)
                    return
                }
                setVehiculeData(res.data)

                // Charger les avis du vendeur en parallèle si creator connu
                if (res.data.creator?.id) {
                    api.get<{ avis: Avis[]; note_moyenne: number; total: number }>(
                        `/avis/vendeur/${res.data.creator.id}`
                    )
                        .then(r => setAvisData(r.data ?? null))
                        .catch(() => {}) // silencieux — les avis sont optionnels
                }
            } catch {
                setNotFound(true)
            } finally {
                setIsLoading(false)
            }
        }

        fetchVehicule()
    }, [params?.id])

    // ── Charger les favoris de l'user si connecté ─────────────────────────────
    useEffect(() => {
        if (!user || !vehiculeData) return
        getFavoris()
            .then(res => {
                const ids = new Set((res?.data ?? []).map((f: Favori) => f.vehicule_id))
                setIsFavori(ids.has(vehiculeData.id))
            })
            .catch(() => {})
    }, [user, vehiculeData?.id])

    // ── Guard auth : redirige vers /auth si non connecté ─────────────────────
    /**
     * Vérifie que l'utilisateur est connecté avant d'exécuter une action.
     * Affiche un toast et redirige vers /auth si besoin.
     * @returns true si connecté, false sinon
     */
    const requireAuth = (): boolean => {
        if (!user) {
            toast.info("Connectez-vous pour contacter")
            router.push("/auth")
            return false
        }
        return true
    }

    // ── Toggle favori ─────────────────────────────────────────────────────────
    const handleToggleFavori = async () => {
        if (!requireAuth()) return
        if (!vehiculeData) return
        setFavLoading(true)
        try {
            if (isFavori) {
                await removeFavori(vehiculeData.id)
                setIsFavori(false)
                toast.success("Retiré des favoris")
            } else {
                await addFavori(vehiculeData.id)
                setIsFavori(true)
                toast.success("Ajouté aux favoris")
            }
        } catch {
            toast.error("Erreur lors de la mise à jour des favoris")
        } finally {
            setFavLoading(false)
        }
    }

    /** Crée ou récupère la conversation avec le vendeur et redirige vers les messages. */
    const handleContact = async () => {
        if (!requireAuth()) return
        if (!vehiculeData?.creator?.id) return
        if (user?.id === vehiculeData.creator.id) return
        setContactLoading(true)
        try {
            const { findOrCreateConversation } = await import("@/src/actions/conversations.actions")
            const res = await findOrCreateConversation({
                vehicule_id:   vehiculeData.id,
                other_user_id: vehiculeData.creator.id,
            })
            const convId = (res as unknown as { conversation: { id: string } })?.conversation?.id
            if (!convId) throw new Error()
            const base = user?.role === "vendeur" ? "/vendeur" : user?.role === "partenaire" ? "/partenaire" : "/client"
            router.push(`${base}/messages?conv=${convId}`)
        } catch {
            toast.error("Impossible d'ouvrir la conversation")
        } finally {
            setContactLoading(false)
        }
    }

    // ── Réserver un véhicule ──────────────────────────────────────────────────
    const handleReserver = async () => {
        if (!requireAuth()) return
        setReserverLoading(true)
        try {
            await api.post("/reservations", { vehicule_id: vehiculeData?.id })
            toast.success("Véhicule réservé avec succès !")
            // Met à jour le statut localement pour griser le bouton sans recharger
            setVehiculeData(prev => prev ? { ...prev, statut: "réservé" } : prev)
        } catch (e: unknown) {
            const msg = (e as { message?: string })?.message ?? "Une erreur est survenue"
            toast.error(msg)
        } finally {
            setReserverLoading(false)
        }
    }

    // ── Soumettre RDV ─────────────────────────────────────────────────────────
    const handleRdvSubmit = async () => {
        if (!requireAuth()) return
        if (!rdvForm.date || !rdvForm.heure) {
            toast.error("Veuillez choisir une date et une heure")
            return
        }
        setRdvLoading(true)
        try {
            await api.post("/rdv/", {
                vehicule_id: vehiculeData?.id,
                date_heure: `${rdvForm.date}T${rdvForm.heure}:00`,
                type: rdvForm.type,
                motif: rdvForm.motif || null,
                lieu: rdvForm.lieu || null,
            })
            toast.success("Demande de rendez-vous envoyée !")
            setRdvOpen(false)
            setRdvForm({ date: "", heure: "", type: "visite", motif: "", lieu: "" })
        } catch {
            toast.error("Impossible d'envoyer la demande")
        } finally {
            setRdvLoading(false)
        }
    }

    // ── Soumettre alerte ─────────────────────────────────────────────────────
    const handleAlerteSubmit = async () => {
        if (!requireAuth()) return
        if (!alerteForm.prix_max) {
            toast.error("Veuillez saisir un prix maximum")
            return
        }
        setAlerteLoading(true)
        try {
            await api.post("/alertes/", {
                marque_cible: vehiculeData?.description?.marque ?? null,
                modele_cible: vehiculeData?.description?.modele ?? null,
                prix_max: Number(alerteForm.prix_max),
                carburant: alerteForm.carburant || null,
            })
            toast.success("Alerte prix créée !")
            setAlerteOpen(false)
            setAlerteForm({ prix_max: "", carburant: "" })
        } catch {
            toast.error("Impossible de créer l'alerte")
        } finally {
            setAlerteLoading(false)
        }
    }

    // ── Soumettre signalement ─────────────────────────────────────────────────
    const handleSignalSubmit = async () => {
        if (!requireAuth()) return
        if (!signalForm.motif.trim()) {
            toast.error("Veuillez indiquer un motif")
            return
        }
        setSignalLoading(true)
        try {
            await api.post("/signalements/", {
                cible_vehicule_id: vehiculeData?.id,
                motif: signalForm.motif,
                description: signalForm.description || null,
            })
            toast.success("Signalement envoyé")
            setSignalOpen(false)
            setSignalForm({ motif: "", description: "" })
        } catch {
            toast.error("Impossible d'envoyer le signalement")
        } finally {
            setSignalLoading(false)
        }
    }

    // ── États de rendu ────────────────────────────────────────────────────────
    if (isLoading) return <VehicleDetailSkeleton />

    if (notFound || !vehiculeData) {
        return (
            <div className="pt-20 px-4 max-w-4xl mx-auto mb-12 flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                    <Car className="h-10 w-10 text-zinc-300" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900 mb-2">Véhicule introuvable</h2>
                <p className="text-sm text-zinc-500 mb-6 max-w-sm">
                    Ce véhicule n'existe pas ou a été supprimé.
                </p>
                <Link href="/vehicles">
                    <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour au catalogue
                    </Button>
                </Link>
            </div>
        )
    }

    // ── Données dérivées ──────────────────────────────────────────────────────
    const isVente = vehiculeData.post_type === "vente"
    const photos = vehiculeData.photos ?? []
    const currentPhoto = photos[photoIndex]
    const imageUrl = currentPhoto ? getPhotoUrl(currentPhoto.path) : null

    /** Grille des 6 caractéristiques techniques affichées sous la galerie. */
    const specs = [
        { label: "Kilométrage", value: `${vehiculeData.description?.kilometrage} km`, icon: Gauge },
        { label: "Carburant", value: vehiculeData.description?.carburant, icon: Fuel },
        { label: "Transmission", value: vehiculeData.description?.transmission, icon: Settings },
        { label: "Couleur", value: vehiculeData.description?.couleur, icon: Palette },
        { label: "Portes", value: vehiculeData.description?.nombre_portes, icon: DoorOpen },
        { label: "Places", value: vehiculeData.description?.nombre_places, icon: Users },
    ]

    /** Documents légaux du véhicule avec leur statut (présent ou absent). */
    const documents = [
        { label: "Carte grise", ok: vehiculeData.description?.carte_grise, icon: FileCheck },
        { label: "Assurance", ok: vehiculeData.description?.assurance, icon: Shield },
        { label: "Visite technique", ok: vehiculeData.description?.visite_technique, icon: Calendar },
        { label: "Sans accident", ok: !vehiculeData.description?.historique_accidents, icon: AlertCircle },
    ]

    // ── Rendu ─────────────────────────────────────────────────────────────────
    return (
        <div className="pt-20 px-4 md:px-6 max-w-4xl mx-auto mb-16 space-y-5 animate-in fade-in slide-in-from-bottom duration-500">

            {/* Lien retour */}
            <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Retour au catalogue
            </Link>

            {/* ── Galerie photos ─────────────────────────────────────────────── */}
            <div className="relative h-64 md:h-96 bg-linear-to-br from-zinc-100 to-zinc-50 rounded-2xl overflow-hidden">
                {imageUrl
                    ? <Image
                        src={imageUrl}
                        alt={`${vehiculeData.description?.marque} ${vehiculeData.description?.modele}`}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Car className="h-24 w-24 text-zinc-300" />
                        </div>
                    )
                }

                {/* Overlay dégradé bas */}
                <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />

                {/* Navigation photos */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>

                        {/* Indicateurs de position */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {photos.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPhotoIndex(i)}
                                    className={cn(
                                        "w-2 h-2 rounded-full transition-colors",
                                        i === photoIndex ? "bg-white" : "bg-white/40"
                                    )}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Badges top-left */}
                <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className={cn(
                        "rounded-full font-bold shadow-sm",
                        isVente
                            ? "bg-green-500/20 text-green-700 border-green-500/30"
                            : "bg-blue-500/20 text-blue-700 border-blue-500/30"
                    )}>
                        {isVente
                            ? <><Tag className="h-3 w-3 mr-1" /> Vente</>
                            : <><KeyRound className="h-3 w-3 mr-1" /> Location</>
                        }
                    </Badge>
                    {vehiculeData.negociable && (
                        <Badge className="rounded-full bg-amber-500/20 text-amber-700 border-amber-500/30 font-bold shadow-sm">
                            Négociable
                        </Badge>
                    )}
                </div>

                {/* Bouton favori top-right */}
                <button
                    onClick={handleToggleFavori}
                    disabled={favLoading}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors cursor-pointer"
                    title={isFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                    <Heart className={cn(
                        "h-5 w-5 transition-colors",
                        isFavori ? "fill-red-500 text-red-500" : "text-zinc-500"
                    )} />
                </button>

                {/* Prix bottom-right */}
                <div className="absolute bottom-4 right-4">
                    <div className="bg-white/95 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg">
                        <p className="text-xl font-black text-zinc-900">
                            {vehiculeData.prix?.toLocaleString()}
                            <span className="text-xs font-normal text-zinc-500 ml-1">
                                FCFA{!isVente ? " / jour" : ""}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Compteur vues bottom-left */}
                <div className="absolute bottom-4 left-4">
                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
                        <Eye className="h-3.5 w-3.5 text-white" />
                        <span className="text-xs text-white font-medium">{vehiculeData.views_count} vues</span>
                    </div>
                </div>
            </div>

            {/* ── Titre + type ────────────── ──────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">
                        {vehiculeData.description?.marque} {vehiculeData.description?.modele}
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {vehiculeData.description?.annee}
                        &nbsp;·&nbsp;{vehiculeData.description?.carburant}
                        &nbsp;·&nbsp;{vehiculeData.description?.transmission}
                    </p>
                </div>
                <Badge variant="outline" className="rounded-full shrink-0 mt-1">
                    {vehiculeData.type === "neuf" ? "Neuf" : "Occasion"}
                </Badge>
            </div>

            {/* ── Boutons d'action ────────────────────────────────────────────── */}
            <div className="flex gap-2 flex-wrap">
                {/* Prendre RDV */}
                <Button
                    onClick={() => { if (requireAuth()) setRdvOpen(true) }}
                    className="flex-1 min-w-30 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl gap-2 cursor-pointer"
                >
                    <CalendarPlus className="h-4 w-4" />
                    Prendre RDV
                </Button>

                {/* Réserver — uniquement pour les ventes disponibles, masqué si proprio */}
                {vehiculeData.post_type === "vente" &&
                    vehiculeData.statut === "disponible" &&
                    (!vehiculeData.date_disponibilite || new Date(vehiculeData.date_disponibilite) <= new Date()) &&
                    user?.id !== vehiculeData.creator?.id && (
                    <Button
                        onClick={handleReserver}
                        disabled={reserverLoading}
                        className="flex-1 min-w-30 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl gap-2 cursor-pointer"
                    >
                        {reserverLoading
                            ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <KeyRound className="h-4 w-4" />
                        }
                        Réserver
                    </Button>
                )}

                {/* Contacter le vendeur — masqué si l'user est le proprio */}
                {vehiculeData.creator && user?.id !== vehiculeData.creator.id && (
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleContact}
                        disabled={contactLoading}
                        className="rounded-xl border-zinc-200 text-zinc-600 hover:text-primary hover:border-primary/50 cursor-pointer"
                        title="Contacter le vendeur"
                    >
                        {contactLoading
                            ? <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <MessageSquare className="h-4 w-4" />
                        }
                    </Button>
                )}

                {/* Alerte prix */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { if (requireAuth()) setAlerteOpen(true) }}
                    className="rounded-xl border-zinc-200 text-zinc-600 hover:text-amber-600 hover:border-amber-300 cursor-pointer"
                    title="Créer une alerte prix"
                >
                    <Bell className="h-4 w-4" />
                </Button>

                {/* Signaler */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { if (requireAuth()) setSignalOpen(true) }}
                    className="rounded-xl border-zinc-200 text-zinc-600 hover:text-red-600 hover:border-red-300 cursor-pointer"
                    title="Signaler ce véhicule"
                >
                    <Flag className="h-4 w-4" />
                </Button>
            </div>

            <Separator />

            {/* ── Caractéristiques techniques ─────────────────────────────────── */}
            <div>
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Caractéristiques
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {specs.map(spec => (
                        <div
                            key={spec.label}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200"
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-200/60 flex items-center justify-center shrink-0">
                                <spec.icon className="h-4 w-4 text-zinc-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-zinc-400 leading-tight">{spec.label}</p>
                                <p className="text-sm font-bold text-zinc-800 truncate">{spec.value ?? "—"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Documents légaux ────────────────────────────────────────────── */}
            <div>
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Documents &amp; historique
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {documents.map(doc => (
                        <div
                            key={doc.label}
                            className={cn(
                                "flex items-center gap-2.5 p-3 rounded-xl border",
                                doc.ok
                                    ? "bg-green-50 border-green-200"
                                    : "bg-zinc-50 border-zinc-200"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                doc.ok ? "bg-green-100" : "bg-zinc-200/60"
                            )}>
                                <doc.icon className={cn(
                                    "h-4 w-4",
                                    doc.ok ? "text-green-600" : "text-zinc-400"
                                )} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-800 leading-tight">{doc.label}</p>
                                <p className={cn(
                                    "text-[10px] mt-0.5",
                                    doc.ok ? "text-green-600" : "text-zinc-400"
                                )}>
                                    {doc.ok ? "Disponible" : "Non renseigné"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Équipements ─────────────────────────────────────────────────── */}
            {vehiculeData.description?.equipements?.length > 0 && (
                <div>
                    <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                        Équipements
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {vehiculeData.description.equipements.map(eq => (
                            <Badge
                                key={eq}
                                variant="outline"
                                className="rounded-full px-3 py-1.5 gap-1.5 text-xs"
                            >
                                <Check className="h-3 w-3" />
                                {eq.replace(/_/g, " ")}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Disponibilité ───────────────────────────────────────────────── */}
            <div>
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {isVente ? "Disponibilité" : "Période de location"}
                </h2>
                <Card className="rounded-xl border border-zinc-200 bg-zinc-50 shadow-none">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                isVente ? "bg-zinc-200/60" : "bg-blue-50"
                            )}>
                                {isVente
                                    ? <Calendar className="h-4 w-4 text-zinc-600" />
                                    : <Clock className="h-4 w-4 text-blue-600" />
                                }
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400">
                                    {isVente ? "Disponible à partir du" : "Disponible à la location"}
                                </p>
                                <p className="font-bold text-sm text-zinc-800">
                                    {formatDate(vehiculeData.date_disponibilite)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Vendeur + avis ──────────────────────────────────────────────── */}
            {vehiculeData.creator && (
                <div>
                    <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                        Vendeur
                    </h2>
                    <Card className="rounded-xl border border-zinc-200 bg-zinc-50 shadow-none">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4 text-zinc-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-800">
                                            {vehiculeData.creator.fullname}
                                        </p>
                                        <p className="text-xs text-zinc-500 capitalize">
                                            {vehiculeData.creator.role}
                                        </p>
                                    </div>
                                </div>
                                {avisData && avisData.total > 0 && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                        <span className="font-bold text-sm text-zinc-800">
                                            {avisData.note_moyenne}
                                        </span>
                                        <span className="text-xs text-zinc-500">({avisData.total})</span>
                                    </div>
                                )}
                            </div>

                            {/* Les 2 derniers avis du vendeur */}
                            {avisData && avisData.avis.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-200 space-y-2">
                                    {avisData.avis.slice(0, 2).map(a => (
                                        <div key={a.id} className="text-xs">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <Star
                                                        key={n}
                                                        className={cn(
                                                            "h-3 w-3",
                                                            n <= a.note
                                                                ? "text-amber-400 fill-amber-400"
                                                                : "text-zinc-300"
                                                        )}
                                                    />
                                                ))}
                                                <span className="text-zinc-500 ml-1">{a.client?.fullname}</span>
                                            </div>
                                            {a.commentaire && (
                                                <p className="text-zinc-600 italic">"{a.commentaire}"</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* Dialogs                                                          */}
            {/* ════════════════════════════════════════════════════════════════ */}

            {/* Dialog RDV */}
            <Dialog open={rdvOpen} onOpenChange={open => { if (!open) setRdvOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Prendre rendez-vous</DialogTitle>
                        <p className="text-sm text-zinc-500">
                            {vehiculeData.description?.marque} {vehiculeData.description?.modele}
                        </p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500">Date</Label>
                                <Input
                                    type="date"
                                    min={new Date().toISOString().split("T")[0]}
                                    value={rdvForm.date}
                                    onChange={e => setRdvForm(f => ({ ...f, date: e.target.value }))}
                                    className="rounded-lg text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500">Heure</Label>
                                <Input
                                    type="time"
                                    value={rdvForm.heure}
                                    onChange={e => setRdvForm(f => ({ ...f, heure: e.target.value }))}
                                    className="rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Type de rendez-vous</Label>
                            <Select
                                value={rdvForm.type}
                                onValueChange={(v: typeof rdvForm.type) =>
                                    setRdvForm(f => ({ ...f, type: v }))
                                }
                            >
                                <SelectTrigger className="rounded-lg text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="visite">Visite</SelectItem>
                                    <SelectItem value="essai_routier">Essai routier</SelectItem>
                                    <SelectItem value="premiere_rencontre">Première rencontre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Lieu (optionnel)</Label>
                            <Input
                                placeholder="Ex: Abidjan Plateau..."
                                value={rdvForm.lieu}
                                onChange={e => setRdvForm(f => ({ ...f, lieu: e.target.value }))}
                                className="rounded-lg text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Motif (optionnel)</Label>
                            <Textarea
                                placeholder="Précisez votre demande..."
                                value={rdvForm.motif}
                                onChange={e => setRdvForm(f => ({ ...f, motif: e.target.value }))}
                                className="rounded-lg text-sm resize-none"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRdvOpen(false)}
                            className="rounded-xl cursor-pointer"
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={rdvLoading}
                            onClick={handleRdvSubmit}
                            className="bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl cursor-pointer"
                        >
                            {rdvLoading ? "Envoi..." : "Envoyer la demande"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog alerte prix */}
            <Dialog open={alerteOpen} onOpenChange={open => { if (!open) setAlerteOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Créer une alerte prix</DialogTitle>
                        <p className="text-sm text-zinc-500">
                            Soyez notifié si un {vehiculeData.description?.marque} {vehiculeData.description?.modele} passe sous votre budget.
                        </p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Prix maximum (FCFA)</Label>
                            <Input
                                type="number"
                                placeholder="Ex: 5000000"
                                value={alerteForm.prix_max}
                                onChange={e => setAlerteForm(f => ({ ...f, prix_max: e.target.value }))}
                                className="rounded-lg text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Carburant (optionnel)</Label>
                            <Select
                                value={alerteForm.carburant}
                                onValueChange={v => setAlerteForm(f => ({ ...f, carburant: v }))}
                            >
                                <SelectTrigger className="rounded-lg text-sm">
                                    <SelectValue placeholder="Tous les carburants" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="essence">Essence</SelectItem>
                                    <SelectItem value="diesel">Diesel</SelectItem>
                                    <SelectItem value="electrique">Électrique</SelectItem>
                                    <SelectItem value="hybride">Hybride</SelectItem>
                                    <SelectItem value="GPL">GPL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setAlerteOpen(false)}
                            className="rounded-xl cursor-pointer"
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={alerteLoading}
                            onClick={handleAlerteSubmit}
                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl cursor-pointer"
                        >
                            {alerteLoading ? "Création..." : "Créer l'alerte"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog signalement */}
            <Dialog open={signalOpen} onOpenChange={open => { if (!open) setSignalOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Signaler ce véhicule</DialogTitle>
                        <p className="text-sm text-zinc-500">
                            Votre signalement sera examiné par notre équipe de modération.
                        </p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">
                                Motif <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                placeholder="Ex: Prix trompeur, photos fausses..."
                                value={signalForm.motif}
                                onChange={e => setSignalForm(f => ({ ...f, motif: e.target.value }))}
                                className="rounded-lg text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Description (optionnel)</Label>
                            <Textarea
                                placeholder="Donnez plus de détails..."
                                value={signalForm.description}
                                onChange={e => setSignalForm(f => ({ ...f, description: e.target.value }))}
                                className="rounded-lg text-sm resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setSignalOpen(false)}
                            className="rounded-xl cursor-pointer"
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={signalLoading}
                            onClick={handleSignalSubmit}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer"
                        >
                            {signalLoading ? "Envoi..." : "Envoyer le signalement"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default VehicleDetailPage
