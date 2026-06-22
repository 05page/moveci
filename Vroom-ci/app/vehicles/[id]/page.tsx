"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    Car, Fuel, Settings, Calendar, FileCheck, Shield, AlertCircle,
    CalendarPlus, Heart, Eye, Star, Bell, Flag, MessageSquare,
    MapPin, Clock, ChevronLeft, ChevronRight, ShieldCheck, Check,
    ArrowLeft, Gauge, Palette, DoorOpen, Users,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { vehicule, Avis, Favori } from "@/src/types"
import { getVehicule, getVehicules } from "@/src/actions/vehicules.actions"
import { useUser } from "@/src/context/UserContext"
import { cn, getPhotoUrl } from "@/src/lib/utils"
import { api } from "@/src/lib/api"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getFavoris, addFavori, removeFavori } from "@/src/actions/favoris.actions"

/** Formate une date ISO en chaîne lisible en français. */
const formatDate = (date: string | Date | undefined): string => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const VehicleDetailSkeleton = () => (
    <div className="pt-16 max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <Skeleton className="h-4 w-64 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-8 w-3/4" />
                <div className="grid grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
            </div>
            <Skeleton className="h-80 rounded-2xl" />
        </div>
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
    const [photoIndex, setPhotoIndex] = useState(0)
    const [isFavori, setIsFavori] = useState(false)
    const [favLoading, setFavLoading] = useState(false)
    const [contactLoading, setContactLoading] = useState(false)
    const [avisData, setAvisData] = useState<{ avis: Avis[]; note_moyenne: number; total: number } | null>(null)
    const [similarVehicules, setSimilarVehicules] = useState<vehicule[]>([])

    // Dialog RDV
    const [rdvOpen, setRdvOpen] = useState(false)
    const [rdvLoading, setRdvLoading] = useState(false)
    const [rdvForm, setRdvForm] = useState({ date: "", heure: "", type: "visite" as "visite" | "essai_routier" | "premiere_rencontre", motif: "", lieu: "" })

    // Dialog signalement
    const [signalOpen, setSignalOpen] = useState(false)
    const [signalLoading, setSignalLoading] = useState(false)
    const [signalForm, setSignalForm] = useState({ motif: "", description: "" })

    // Dialog alerte prix
    const [alerteOpen, setAlerteOpen] = useState(false)
    const [alerteLoading, setAlerteLoading] = useState(false)
    const [alerteForm, setAlerteForm] = useState({ prix_max: "", carburant: "" })

    const [reserverLoading, setReserverLoading] = useState(false)

    // ── Chargement ──────────────────────────────────────────────────────────

    useEffect(() => {
        const id = params?.id as string
        if (!id) return
        const fetchVehicule = async () => {
            setIsLoading(true)
            try {
                const res = await getVehicule(id)
                if (!res?.data) { setNotFound(true); return }
                setVehiculeData(res.data)
                if (res.data.creator?.id) {
                    api.get<{ avis: Avis[]; note_moyenne: number; total: number }>(`/avis/vendeur/${res.data.creator.id}`)
                        .then(r => setAvisData(r.data ?? null)).catch(() => {})
                }
                // Véhicules similaires (même marque, autre id)
                const marqueCible = res.data.description?.marque
                getVehicules().then(r => {
                    const all = r?.data?.vehicules ?? []
                    const similaires = all.filter((v: vehicule) => v.id !== id && v.description?.marque === marqueCible)
                    setSimilarVehicules(similaires.slice(0, 6))
                }).catch(() => {})
            } catch {
                setNotFound(true)
            } finally {
                setIsLoading(false)
            }
        }
        fetchVehicule()
    }, [params?.id])

    useEffect(() => {
        if (!user || !vehiculeData) return
        getFavoris().then(res => {
            const ids = new Set((res?.data ?? []).map((f: Favori) => f.vehicule_id))
            setIsFavori(ids.has(vehiculeData.id))
        }).catch(() => {})
    }, [user, vehiculeData?.id])

    // ── Actions ──────────────────────────────────────────────────────────────

    const requireAuth = (): boolean => {
        if (!user) { toast.info("Connectez-vous pour continuer"); router.push("/auth"); return false }
        return true
    }

    const handleToggleFavori = async () => {
        if (!requireAuth() || !vehiculeData) return
        setFavLoading(true)
        try {
            if (isFavori) { await removeFavori(vehiculeData.id); setIsFavori(false); toast.success("Retiré des favoris") }
            else { await addFavori(vehiculeData.id); setIsFavori(true); toast.success("Ajouté aux favoris") }
        } catch { toast.error("Erreur lors de la mise à jour des favoris") }
        finally { setFavLoading(false) }
    }

    /** Ouvre la conversation avec le vendeur et redirige vers les messages. */
    const handleContact = async () => {
        if (!requireAuth() || !vehiculeData?.creator?.id) return
        if (user?.id === vehiculeData.creator.id) return
        setContactLoading(true)
        try {
            const { findOrCreateConversation } = await import("@/src/actions/conversations.actions")
            const res = await findOrCreateConversation({ vehicule_id: vehiculeData.id, other_user_id: vehiculeData.creator.id })
            const convId = (res as unknown as { conversation: { id: string } })?.conversation?.id
            if (!convId) throw new Error()
            const base = user?.role === "vendeur" ? "/vendeur" : user?.role === "partenaire" ? "/partenaire" : "/client"
            router.push(`${base}/messages?conv=${convId}`)
        } catch { toast.error("Impossible d'ouvrir la conversation") }
        finally { setContactLoading(false) }
    }

    const handleReserver = async () => {
        if (!requireAuth()) return
        setReserverLoading(true)
        try {
            await api.post("/reservations", { vehicule_id: vehiculeData?.id })
            toast.success("Véhicule réservé avec succès !")
            setVehiculeData(prev => prev ? { ...prev, statut: "réservé" } : prev)
        } catch (e: unknown) {
            toast.error((e as { message?: string })?.message ?? "Une erreur est survenue")
        } finally { setReserverLoading(false) }
    }

    const handleRdvSubmit = async () => {
        if (!requireAuth()) return
        if (!rdvForm.date || !rdvForm.heure) { toast.error("Veuillez choisir une date et une heure"); return }
        setRdvLoading(true)
        try {
            await api.post("/rdv/", { vehicule_id: vehiculeData?.id, date_heure: `${rdvForm.date}T${rdvForm.heure}:00`, type: rdvForm.type, motif: rdvForm.motif || null, lieu: rdvForm.lieu || null })
            toast.success("Demande de rendez-vous envoyée !")
            setRdvOpen(false)
            setRdvForm({ date: "", heure: "", type: "visite", motif: "", lieu: "" })
        } catch { toast.error("Impossible d'envoyer la demande") }
        finally { setRdvLoading(false) }
    }

    const handleAlerteSubmit = async () => {
        if (!requireAuth()) return
        if (!alerteForm.prix_max) { toast.error("Veuillez saisir un prix maximum"); return }
        setAlerteLoading(true)
        try {
            await api.post("/alertes/", { marque_cible: vehiculeData?.description?.marque ?? null, modele_cible: vehiculeData?.description?.modele ?? null, prix_max: Number(alerteForm.prix_max), carburant: alerteForm.carburant || null })
            toast.success("Alerte prix créée !")
            setAlerteOpen(false)
            setAlerteForm({ prix_max: "", carburant: "" })
        } catch { toast.error("Impossible de créer l'alerte") }
        finally { setAlerteLoading(false) }
    }

    const handleSignalSubmit = async () => {
        if (!requireAuth()) return
        if (!signalForm.motif.trim()) { toast.error("Veuillez indiquer un motif"); return }
        setSignalLoading(true)
        try {
            await api.post("/signalements/", { cible_vehicule_id: vehiculeData?.id, motif: signalForm.motif, description: signalForm.description || null })
            toast.success("Signalement envoyé")
            setSignalOpen(false)
            setSignalForm({ motif: "", description: "" })
        } catch { toast.error("Impossible d'envoyer le signalement") }
        finally { setSignalLoading(false) }
    }

    // ── Guards ────────────────────────────────────────────────────────────────

    if (isLoading) return <VehicleDetailSkeleton />

    if (notFound || !vehiculeData) {
        return (
            <div className="pt-20 flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                    <Car className="h-10 w-10 text-zinc-300" />
                </div>
                <h2 className="text-2xl font-black text-zinc-900 mb-2">Véhicule introuvable</h2>
                <p className="text-sm text-zinc-500 mb-6 max-w-sm">Ce véhicule n'existe pas ou a été supprimé.</p>
                <Link href="/vehicles">
                    <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                        <ArrowLeft className="h-4 w-4 mr-2" />Retour au catalogue
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
    const isVerified = vehiculeData.status_validation === "validee"

    const documents = [
        { label: "Carte grise", ok: vehiculeData.description?.carte_grise, icon: FileCheck },
        { label: "Assurance", ok: vehiculeData.description?.assurance, icon: Shield },
        { label: "Visite technique", ok: vehiculeData.description?.visite_technique, icon: Calendar },
        { label: "Sans accident", ok: !vehiculeData.description?.historique_accidents, icon: AlertCircle },
    ]

    const specs = [
        { label: "Année", value: String(vehiculeData.description?.annee ?? "—"), icon: Calendar },
        { label: "Kilométrage", value: `${Number(vehiculeData.description?.kilometrage ?? 0).toLocaleString("fr-FR")} km`, icon: Gauge },
        { label: "Transmission", value: vehiculeData.description?.transmission ?? "—", icon: Settings },
        { label: "Énergie", value: vehiculeData.description?.carburant ?? "—", icon: Fuel },
        { label: "Couleur", value: vehiculeData.description?.couleur ?? "—", icon: Palette },
        { label: "Portes / Places", value: `${vehiculeData.description?.nombre_portes ?? "—"} / ${vehiculeData.description?.nombre_places ?? "—"}`, icon: DoorOpen },
    ]

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <div className="pt-16 bg-white min-h-screen">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">

                {/* ── Breadcrumb ───────────────────────────────────────────── */}
                <nav className="flex items-center gap-2 text-xs text-zinc-400">
                    <Link href="/" className="hover:text-zinc-700 transition-colors">Accueil</Link>
                    <span>/</span>
                    <Link href="/vehicles" className="hover:text-zinc-700 transition-colors">Véhicules</Link>
                    <span>/</span>
                    <span className="text-zinc-600 font-medium">{vehiculeData.description?.marque}</span>
                    <span>/</span>
                    <span className="text-zinc-900 font-semibold truncate max-w-48">
                        {vehiculeData.description?.marque} {vehiculeData.description?.modele}
                    </span>
                </nav>

                {/* ── Layout 2 colonnes ────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ════ COLONNE GAUCHE (contenu principal) ════ */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* ── Galerie photos ─────────────────────────────── */}
                        <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden h-72 md:h-96">
                            {/* Grande photo principale */}
                            <div className="col-span-2 relative bg-zinc-100">
                                {imageUrl
                                    ? <Image src={imageUrl} alt={`${vehiculeData.description?.marque} ${vehiculeData.description?.modele}`} fill className="object-cover" unoptimized />
                                    : <div className="absolute inset-0 flex items-center justify-center"><Car className="h-16 w-16 text-zinc-300" /></div>
                                }
                                {/* Bouton voir toutes les photos */}
                                {photos.length > 1 && (
                                    <div className="absolute bottom-3 right-3">
                                        <button className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow hover:bg-white transition-colors cursor-pointer">
                                            📷 Voir toutes les photos ({photos.length})
                                        </button>
                                    </div>
                                )}
                                {/* ♡ favori */}
                                <button
                                    onClick={handleToggleFavori}
                                    disabled={favLoading}
                                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors cursor-pointer"
                                >
                                    <Heart className={cn("h-4 w-4", isFavori ? "fill-red-500 text-red-500" : "text-zinc-500")} />
                                </button>
                                {/* Compteur vues */}
                                <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                                    <Eye className="h-3 w-3 text-white" />
                                    <span className="text-[11px] text-white font-medium">{vehiculeData.views_count}</span>
                                </div>
                            </div>

                            {/* 2 miniatures empilées */}
                            <div className="flex flex-col gap-2">
                                {[1, 2].map(offset => {
                                    const idx = (photoIndex + offset) % Math.max(photos.length, 1)
                                    const thumb = photos[idx]
                                    const thumbUrl = thumb ? getPhotoUrl(thumb.path) : null
                                    return (
                                        <div
                                            key={offset}
                                            className="flex-1 relative bg-zinc-100 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => photos.length > 1 && setPhotoIndex(idx)}
                                        >
                                            {thumbUrl
                                                ? <Image src={thumbUrl} alt="Photo véhicule" fill className="object-cover" unoptimized />
                                                : <div className="absolute inset-0 flex items-center justify-center"><Car className="h-8 w-8 text-zinc-200" /></div>
                                            }
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Navigation photos (points) */}
                        {photos.length > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                {photos.slice(0, 8).map((_, i) => (
                                    <button key={i} onClick={() => setPhotoIndex(i)} className={cn("w-1.5 h-1.5 rounded-full transition-colors cursor-pointer", i === photoIndex ? "bg-zinc-900" : "bg-zinc-300")} />
                                ))}
                                <button onClick={() => setPhotoIndex(i => (i + 1) % photos.length)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* ── Titre + prix + badges ───────────────────────── */}
                        <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">
                                        {vehiculeData.description?.marque} {vehiculeData.description?.modele}
                                    </h1>
                                    <p className="text-2xl font-black text-move-gold mt-1">
                                        {vehiculeData.prix?.toLocaleString("fr-FR")}
                                        <span className="text-sm font-normal text-zinc-400 ml-1.5">
                                            FCFA{!isVente ? " / jour" : ""}
                                        </span>
                                    </p>
                                    {vehiculeData.negociable && (
                                        <p className="text-xs text-zinc-400 mt-0.5">Prix négociable</p>
                                    )}
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="rounded-full text-xs font-semibold border-zinc-300 text-zinc-600">
                                    {vehiculeData.type === "neuf" ? "Neuf" : "Occasion"}
                                </Badge>
                                {isVerified && (
                                    <Badge className="rounded-full text-xs font-bold bg-zinc-900 text-white gap-1 border-0">
                                        <ShieldCheck className="h-3 w-3" />
                                        VÉRIFIÉ MOVE
                                    </Badge>
                                )}
                                <Badge className={cn("rounded-full text-xs font-semibold border-0", isVente ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>
                                    {isVente ? "Vente" : "Location"}
                                </Badge>
                            </div>

                            {/* 4 stats boxes */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {specs.slice(0, 4).map(s => (
                                    <div key={s.label} className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 bg-zinc-50 text-center gap-1">
                                        <s.icon className="h-5 w-5 text-zinc-400 mb-0.5" />
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{s.label}</p>
                                        <p className="text-sm font-black text-zinc-900">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Disponibilité ───────────────────────────────── */}
                        {vehiculeData.date_disponibilite && (
                            <div className={cn(
                                "flex items-center gap-3 p-3.5 rounded-xl border",
                                new Date(vehiculeData.date_disponibilite) > new Date()
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-green-50 border-green-200"
                            )}>
                                <Calendar className={cn("h-4 w-4 shrink-0", new Date(vehiculeData.date_disponibilite) > new Date() ? "text-amber-600" : "text-green-600")} />
                                <p className={cn("text-sm font-semibold", new Date(vehiculeData.date_disponibilite) > new Date() ? "text-amber-700" : "text-green-700")}>
                                    {new Date(vehiculeData.date_disponibilite) > new Date()
                                        ? `Disponible à partir du ${formatDate(vehiculeData.date_disponibilite)}`
                                        : "Disponible maintenant"
                                    }
                                </p>
                            </div>
                        )}

                        {/* ── Équipements (en lieu de description) ────────── */}
                        {vehiculeData.description?.equipements?.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-lg font-black text-zinc-900">Équipements</h2>
                                <ul className="space-y-1.5">
                                    {vehiculeData.description.equipements.map(eq => (
                                        <li key={eq} className="flex items-center gap-2 text-sm text-zinc-700">
                                            <div className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                                                <Check className="h-2.5 w-2.5 text-zinc-500" />
                                            </div>
                                            {eq.replace(/_/g, " ")}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ── Caractéristiques Techniques ─────────────────── */}
                        <div className="space-y-3">
                            <h2 className="text-lg font-black text-zinc-900">Caractéristiques Techniques</h2>
                            <div className="rounded-xl border border-zinc-200 overflow-hidden">
                                {specs.map((s, i) => (
                                    <div key={s.label} className={cn("flex items-center justify-between px-4 py-3 text-sm", i % 2 === 0 ? "bg-white" : "bg-zinc-50")}>
                                        <span className="text-zinc-500 font-medium">{s.label}</span>
                                        <span className="font-bold text-zinc-900">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Documents ────────────────────────────────────── */}
                        <div className="space-y-3">
                            <h2 className="text-lg font-black text-zinc-900">Documents &amp; Historique</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {documents.map(doc => (
                                    <div key={doc.label} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border text-center", doc.ok ? "bg-green-50 border-green-200" : "bg-zinc-50 border-zinc-200")}>
                                        <doc.icon className={cn("h-5 w-5", doc.ok ? "text-green-500" : "text-zinc-300")} />
                                        <p className="text-xs font-bold text-zinc-800">{doc.label}</p>
                                        <p className={cn("text-[10px]", doc.ok ? "text-green-600" : "text-zinc-400")}>{doc.ok ? "Disponible" : "Non renseigné"}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Actions mobiles (uniquement < lg) ───────────── */}
                        <div className="flex gap-2 flex-wrap lg:hidden">
                            <Button onClick={() => { if (requireAuth()) setRdvOpen(true) }} className="flex-1 bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white font-bold rounded-xl gap-2 cursor-pointer">
                                <CalendarPlus className="h-4 w-4" /> Planifier une visite
                            </Button>
                            {vehiculeData.creator && user?.id !== vehiculeData.creator.id && (
                                <Button onClick={handleContact} disabled={contactLoading} variant="outline" className="flex-1 rounded-xl border-zinc-200 cursor-pointer gap-2">
                                    <MessageSquare className="h-4 w-4" /> Contacter
                                </Button>
                            )}
                        </div>

                    </div>

                    {/* ════ COLONNE DROITE (sidebar sticky) ════ */}
                    <div className="space-y-4">
                        <div className="sticky top-20 space-y-4">

                            {/* Card CTA */}
                            <Card className="rounded-2xl border border-zinc-200 shadow-md">
                                <CardContent className="p-5 space-y-3">
                                    <h3 className="text-base font-black text-zinc-900">Prêt à rouler ?</h3>

                                    {/* Contacter le vendeur */}
                                    {vehiculeData.creator && user?.id !== vehiculeData.creator.id && (
                                        <Button
                                            onClick={handleContact}
                                            disabled={contactLoading}
                                            className="w-full h-11 rounded-xl bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white font-bold cursor-pointer gap-2"
                                        >
                                            {contactLoading
                                                ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                : <MessageSquare className="h-4 w-4" />
                                            }
                                            Contacter le vendeur
                                        </Button>
                                    )}

                                    {/* Planifier une visite */}
                                    <Button
                                        onClick={() => { if (requireAuth()) setRdvOpen(true) }}
                                        variant="outline"
                                        className="w-full h-11 rounded-xl border-zinc-200 font-semibold cursor-pointer gap-2 text-zinc-700 hover:bg-zinc-50"
                                    >
                                        <CalendarPlus className="h-4 w-4 text-move-gold" />
                                        Planifier une visite
                                    </Button>

                                    {/* Réserver */}
                                    {vehiculeData.post_type === "vente" && vehiculeData.statut === "a_venir" && user?.id !== vehiculeData.creator?.id && (
                                        <Button
                                            onClick={handleReserver}
                                            disabled={reserverLoading}
                                            variant="outline"
                                            className="w-full h-11 rounded-xl border-zinc-200 font-semibold cursor-pointer gap-2"
                                        >
                                            {reserverLoading ? <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                                            Réserver
                                        </Button>
                                    )}

                                    <Separator />

                                    {/* Infos vendeur */}
                                    {vehiculeData.creator && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 text-sm font-black text-zinc-600">
                                                    {vehiculeData.creator.fullname?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-zinc-900">{vehiculeData.creator.fullname}</p>
                                                    {avisData && avisData.total > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Star className="h-3 w-3 text-move-gold fill-move-gold" />
                                                            <span className="text-xs font-bold text-zinc-700">{avisData.note_moyenne}</span>
                                                            <span className="text-xs text-zinc-400">({avisData.total} avis)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {vehiculeData.creator.adresse && (
                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                    <span>{vehiculeData.creator.adresse}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                                <span>Répond généralement en 1h</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Achat sécurisé MOVE */}
                            <div className="flex items-start gap-3 p-4 rounded-2xl border border-zinc-200 bg-zinc-50">
                                <ShieldCheck className="h-5 w-5 text-move-gold shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-zinc-900">Achat sécurisé MOVE</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Paiement sécurisé et vérification du véhicule certifiée par nos experts.</p>
                                </div>
                            </div>

                            {/* Actions secondaires */}
                            <div className="flex gap-2">
                                <button onClick={() => { if (requireAuth()) setAlerteOpen(true) }} title="Créer une alerte prix" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors">
                                    <Bell className="h-3.5 w-3.5" /> Alerte prix
                                </button>
                                <button onClick={() => { if (requireAuth()) setSignalOpen(true) }} title="Signaler ce véhicule" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer transition-colors">
                                    <Flag className="h-3.5 w-3.5" /> Signaler
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ── Vous pourriez aussi aimer ────────────────────────────── */}
                {similarVehicules.length > 0 && (
                    <div className="space-y-4 border-t border-zinc-100 pt-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-zinc-900">Vous pourriez aussi aimer</h2>
                            <div className="flex gap-1">
                                <button className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 cursor-pointer">
                                    <ChevronLeft className="h-4 w-4 text-zinc-500" />
                                </button>
                                <button className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 cursor-pointer">
                                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {similarVehicules.slice(0, 3).map(v => {
                                const photo = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
                                const url = photo ? getPhotoUrl(photo.path) : null
                                return (
                                    <Link key={v.id} href={`/vehicles/${v.id}`}>
                                        <Card className="rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                                            <div className="relative h-36 bg-zinc-100">
                                                {url
                                                    ? <Image src={url} alt={`${v.description?.marque} ${v.description?.modele}`} fill className="object-cover" unoptimized />
                                                    : <div className="absolute inset-0 flex items-center justify-center"><Car className="h-8 w-8 text-zinc-200" /></div>
                                                }
                                                <button
                                                    onClick={e => { e.preventDefault() }}
                                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"
                                                >
                                                    <Heart className="h-3.5 w-3.5 text-zinc-400" />
                                                </button>
                                            </div>
                                            <CardContent className="p-3 space-y-1">
                                                <p className="text-sm font-bold text-zinc-900 truncate">{v.description?.marque} {v.description?.modele}</p>
                                                <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{v.description?.annee}</span>
                                                    <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{Number(v.description?.kilometrage ?? 0).toLocaleString("fr-FR")} km</span>
                                                </div>
                                                <p className="text-sm font-black text-move-gold">{v.prix?.toLocaleString("fr-FR")} FCFA</p>
                                                <Button variant="outline" size="sm" className="w-full rounded-lg text-xs border-zinc-200 mt-1 cursor-pointer">
                                                    Voir les détails
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

            </div>

            {/* ════════════════ DIALOGS ════════════════ */}

            {/* RDV */}
            <Dialog open={rdvOpen} onOpenChange={open => { if (!open) setRdvOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Prendre rendez-vous</DialogTitle>
                        <p className="text-sm text-zinc-500">{vehiculeData.description?.marque} {vehiculeData.description?.modele}</p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500">Date</Label>
                                <Input type="date" min={new Date().toISOString().split("T")[0]} value={rdvForm.date} onChange={e => setRdvForm(f => ({ ...f, date: e.target.value }))} className="rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-zinc-500">Heure</Label>
                                <Input type="time" value={rdvForm.heure} onChange={e => setRdvForm(f => ({ ...f, heure: e.target.value }))} className="rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Type de rendez-vous</Label>
                            <Select value={rdvForm.type} onValueChange={(v: typeof rdvForm.type) => setRdvForm(f => ({ ...f, type: v }))}>
                                <SelectTrigger className="rounded-lg text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="visite">Visite</SelectItem>
                                    <SelectItem value="essai_routier">Essai routier</SelectItem>
                                    <SelectItem value="premiere_rencontre">Première rencontre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Lieu (optionnel)</Label>
                            <Input placeholder="Ex: Abidjan Plateau..." value={rdvForm.lieu} onChange={e => setRdvForm(f => ({ ...f, lieu: e.target.value }))} className="rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Motif (optionnel)</Label>
                            <Textarea placeholder="Précisez votre demande..." value={rdvForm.motif} onChange={e => setRdvForm(f => ({ ...f, motif: e.target.value }))} className="rounded-lg text-sm resize-none" rows={2} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setRdvOpen(false)} className="rounded-xl cursor-pointer">Annuler</Button>
                        <Button disabled={rdvLoading} onClick={handleRdvSubmit} className="bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl cursor-pointer">
                            {rdvLoading ? "Envoi..." : "Envoyer la demande"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerte prix */}
            <Dialog open={alerteOpen} onOpenChange={open => { if (!open) setAlerteOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Créer une alerte prix</DialogTitle>
                        <p className="text-sm text-zinc-500">Soyez notifié si un {vehiculeData.description?.marque} {vehiculeData.description?.modele} passe sous votre budget.</p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Prix maximum (FCFA)</Label>
                            <Input type="number" placeholder="Ex: 5000000" value={alerteForm.prix_max} onChange={e => setAlerteForm(f => ({ ...f, prix_max: e.target.value }))} className="rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Carburant (optionnel)</Label>
                            <Select value={alerteForm.carburant} onValueChange={v => setAlerteForm(f => ({ ...f, carburant: v }))}>
                                <SelectTrigger className="rounded-lg text-sm"><SelectValue placeholder="Tous les carburants" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="essence">Essence</SelectItem>
                                    <SelectItem value="diesel">Diesel</SelectItem>
                                    <SelectItem value="electrique">Électrique</SelectItem>
                                    <SelectItem value="hybride">Hybride</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAlerteOpen(false)} className="rounded-xl cursor-pointer">Annuler</Button>
                        <Button disabled={alerteLoading} onClick={handleAlerteSubmit} className="bg-move-gold hover:bg-[oklch(0.72_0.175_83)] text-white rounded-xl cursor-pointer">
                            {alerteLoading ? "Création..." : "Créer l'alerte"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Signalement */}
            <Dialog open={signalOpen} onOpenChange={open => { if (!open) setSignalOpen(false) }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-zinc-900">Signaler ce véhicule</DialogTitle>
                        <p className="text-sm text-zinc-500">Votre signalement sera examiné par notre équipe de modération.</p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Motif <span className="text-red-500">*</span></Label>
                            <Input placeholder="Ex: Prix trompeur, photos fausses..." value={signalForm.motif} onChange={e => setSignalForm(f => ({ ...f, motif: e.target.value }))} className="rounded-lg text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Description (optionnel)</Label>
                            <Textarea placeholder="Donnez plus de détails..." value={signalForm.description} onChange={e => setSignalForm(f => ({ ...f, description: e.target.value }))} className="rounded-lg text-sm resize-none" rows={3} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSignalOpen(false)} className="rounded-xl cursor-pointer">Annuler</Button>
                        <Button disabled={signalLoading} onClick={handleSignalSubmit} className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer">
                            {signalLoading ? "Envoi..." : "Envoyer le signalement"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}

export default VehicleDetailPage
