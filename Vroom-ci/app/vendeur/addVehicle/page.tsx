"use client"

import { useState, useRef, Fragment } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Tag,
    Car,
    Settings,
    CalendarDays,
    BadgeDollarSign,
    ShoppingBag,
    Key,
    Check,
    ChevronLeft,
    ChevronRight,
    ImagePlus,
    X,
    Send,
    ArrowLeft,
    Eye,
    Camera,
    Link,
} from "lucide-react"
// Note : ce fichier utilise fetch() natif pour l'upload multipart (gestion du Content-Type par le navigateur)
// postVehicule() de vehicules.actions utilise api.upload() qui est une alternative possible
interface FormData {
    typePublication: "vente" | "location" | ""
    type: "neuf" | "occasion" | ""
    marque: string
    modele: string
    annee: string
    kilometrage: string
    carburant: string
    transmission: string
    couleur: string
    nombrePortes: string
    nombrePlaces: string
    description: string
    equipements: string[]
    dateDisponibilite: Date | undefined
    dateDebutLocation: string
    dateFinLocation: string
    prix: string
    prixParJour: string
    negociable: boolean
    visite_technique: "à_jour" | "expirée" | "non_concerné" | ""
    date_visite_technique: string
    carte_grise: "à_jour" | "expirée" | "non_concerné" | ""
    date_carte_grise: string
    assurance: "à_jour" | "expirée" | "non_concerné" | ""
    historique_accidents: "aucun" | "quelques_accidents" | "nombreux_accidents" | ""
}

interface StepInfo {
    id: number
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
}

const STEPS: StepInfo[] = [
    { id: 1, title: "Type", description: "Publication", icon: Tag },
    { id: 2, title: "Véhicule", description: "Informations", icon: Car },
    { id: 3, title: "Équipements", description: "Options", icon: Settings },
    { id: 4, title: "Disponibilité", description: "Dates", icon: CalendarDays },
    { id: 5, title: "Prix", description: "Finalisation", icon: BadgeDollarSign },
]

const MARQUES = [
    "Toyota", "BMW", "Mercedes-Benz", "Peugeot", "Renault", "Citroën",
    "Volkswagen", "Audi", "Honda", "Hyundai", "Kia", "Nissan", "Ford",
    "Chevrolet", "Mitsubishi", "Suzuki", "Land Rover", "Jeep", "Mazda",
    "Opel", "Fiat", "Dacia",
]

const ANNEES = Array.from({ length: 16 }, (_, i) => String(2025 - i))

const CARBURANTS = ["Essence", "Diesel", "Hybride", "Électrique", "GPL"]

const TRANSMISSIONS = ["Manuelle", "Automatique"]

const COULEURS = [
    { name: "Noir", hex: "#1a1a1a" },
    { name: "Blanc", hex: "#f5f5f5" },
    { name: "Gris", hex: "#808080" },
    { name: "Rouge", hex: "#dc2626" },
    { name: "Bleu", hex: "#2563eb" },
    { name: "Vert", hex: "#16a34a" },
    { name: "Marron", hex: "#92400e" },
    { name: "Beige", hex: "#d4a76a" },
    { name: "Argent", hex: "#c0c0c0" },
]

const EQUIPEMENTS = [
    { id: "climatisation", label: "Climatisation" },
    { id: "gps", label: "GPS / Navigation" },
    { id: "camera_recul", label: "Caméra de recul" },
    { id: "bluetooth", label: "Bluetooth" },
    { id: "regulateur", label: "Régulateur de vitesse" },
    { id: "sieges_chauffants", label: "Sièges chauffants" },
    { id: "toit_ouvrant", label: "Toit ouvrant" },
    { id: "phares_led", label: "Phares LED" },
    { id: "jantes_alliage", label: "Jantes alliage" },
    { id: "abs", label: "ABS" },
    { id: "airbags", label: "Airbags" },
    { id: "audio_premium", label: "Audio premium" },
    { id: "demarrage_sans_cle", label: "Démarrage sans clé" },
    { id: "capteurs_parking", label: "Capteurs de parking" },
    { id: "radar_angle_mort", label: "Radar angle mort" },
    { id: "freinage_urgence", label: "Freinage auto d'urgence" },
    { id: "cruise_adaptatif", label: "Cruise control adaptatif" },
    { id: "carplay_android", label: "Apple CarPlay / Android Auto" },
]

const CARD = "rounded-2xl md:rounded-3xl shadow-xl border border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm"

export default function AddVehiclePage() {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [periodeChoisie, setPeriodeChoisie] = useState<"maintenant" | "1_semaine" | "2_semaines" | "1_mois" | "personnalisee" | null>(null)

    const [formData, setFormData] = useState<FormData>({
        typePublication: "",
        type: "",
        marque: "",
        modele: "",
        annee: "",
        kilometrage: "",
        carburant: "",
        transmission: "",
        couleur: "",
        nombrePortes: "",
        nombrePlaces: "",
        description: "",
        equipements: [],
        dateDisponibilite: undefined,
        dateDebutLocation: "",
        dateFinLocation: "",
        prix: "",
        prixParJour: "",
        negociable: false,
        visite_technique: "",
        date_visite_technique: "",
        carte_grise: "",
        date_carte_grise: "",
        assurance: "",
        historique_accidents: "",
    })

    const [photos, setPhotos] = useState<File[]>([])
    const [photoUrls, setPhotoUrls] = useState<string[]>([])

    const updateFormData = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const toggleEquipement = (id: string) => {
        setFormData(prev => ({
            ...prev,
            equipements: prev.equipements.includes(id)
                ? prev.equipements.filter(e => e !== id)
                : [...prev.equipements, id],
        }))
    }

    const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (photos.length + files.length > 10) {
            toast.error("Maximum 10 photos autorisées")
            return
        }
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/svg+xml"];
        const validFiles = files.filter((file => allowedTypes.includes(file.type)))
        if(validFiles.length < files.length){
            toast.error("Format non autorisé")
        }

        setPhotos(prev => [...prev, ...validFiles])
        setPhotoUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))])
    }

    const removePhoto = (index: number) => {
        URL.revokeObjectURL(photoUrls[index])
        setPhotos(prev => prev.filter((_, i) => i !== index))
        setPhotoUrls(prev => prev.filter((_, i) => i !== index))
    }

    const formatDate = (date: Date | undefined) => {
        if (!date) return "Non définie"
        return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    }

    const formatMontant = (value: string) => {
        if (!value) return "0"
        return Number(value).toLocaleString("fr-FR")
    }

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.typePublication) {
                    toast.error("Veuillez sélectionner le type de publication")
                    return false
                }
                if (!formData.type) {
                    toast.error("Veuillez sélectionner l'état du véhicule (neuf / occasion)")
                    return false
                }
                return true
            case 2:
                if (!formData.marque || !formData.modele || !formData.annee) {
                    toast.error("Veuillez remplir les champs obligatoires (Marque, Modèle, Année)")
                    return false
                }
                return true
            case 3:
                return true
            case 4:
                if (formData.typePublication === "vente" && !formData.dateDisponibilite) {
                    toast.error("Veuillez sélectionner une date de disponibilité")
                    return false
                }
                if (formData.typePublication === "location" && (!formData.dateDebutLocation || !formData.dateFinLocation)) {
                    toast.error("Veuillez définir les dates de location")
                    return false
                }
                return true
            case 5:
                if (!formData.prix) {
                    toast.error("Veuillez indiquer le prix")
                    return false
                }
                if (formData.typePublication === "location" && !formData.prixParJour) {
                    toast.error("Veuillez indiquer le prix par jour")
                    return false
                }
                return true
            default:
                return true
        }
    }

    const goToNext = () => {
        if (validateStep(currentStep)) setCurrentStep(prev => Math.min(prev + 1, 5))
    }

    const goToPrev = () => setCurrentStep(prev => Math.max(prev - 1, 1))

    const handleSubmit = async () => {
        if (!validateStep(5)) return
        setIsSubmitting(true)
        const toastId = toast.loading("Analyse Gemini en cours...")
        try {
            const fd = new window.FormData()  // window.FormData pour éviter le conflit avec ton interface

            // champs requis — avec les vrais noms backend
            fd.append("post_type", formData.typePublication)
            fd.append("type", formData.type)
            fd.append("marque", formData.marque)
            fd.append("modele", formData.modele)
            fd.append("prix", formData.prix)

            // champs optionnels — seulement si remplis
            if (formData.annee) fd.append("annee", formData.annee)
            if (formData.kilometrage) fd.append("kilometrage", formData.kilometrage)
            if (formData.carburant) fd.append("carburant", formData.carburant)
            if (formData.transmission) fd.append("transmission", formData.transmission)
            if (formData.couleur) fd.append("couleur", formData.couleur)
            if (formData.nombrePortes) fd.append("nombre_portes", formData.nombrePortes)
            if (formData.nombrePlaces) fd.append("nombre_places", formData.nombrePlaces)
            if (formData.dateDisponibilite) fd.append("date_disponibilite", formData.dateDisponibilite.toISOString().split("T")[0])
            if (formData.visite_technique) fd.append("visite_technique", formData.visite_technique)
            if (formData.carte_grise) fd.append("carte_grise", formData.carte_grise)
            if (formData.assurance) fd.append("assurance", formData.assurance)
            if (formData.historique_accidents) fd.append("historique_accidents", formData.historique_accidents)

            // tableaux
            formData.equipements.forEach(eq => fd.append("equipements[]", eq))
            photos.forEach(photo => fd.append("photos[]", photo))

            const res = await fetch("/api/proxy/vehicules/post-vehicule", {
                method: "POST",
                body: fd,  // PAS de Content-Type — le browser le gère
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.message + data.errors || "Erreur lors de la publication", { id: toastId })
                console.log(data)
                return
            }
            toast.success("Véhicule publié !", {
                id: toastId,
                description: `Prix suggéré : ${data.data?.prix_suggere?.toLocaleString("fr-FR")} FCFA — ${data.data?.explication_prix}`
            })
        } catch (error) {
            toast.error("Erreur de connexion au serveur", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStepIndicator = () => (
        <Card className={CARD}>
            <CardContent className="p-4 md:p-6">
                {/* Mobile */}
                <div className="md:hidden">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Étape {currentStep} / 5</span>
                        <Badge className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full">
                            {STEPS[currentStep - 1].title}
                        </Badge>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-2">
                        <div
                            className="bg-zinc-900 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(currentStep / 5) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Desktop */}
                <div className="hidden md:flex items-center justify-between">
                    {STEPS.map((step, index) => (
                        <Fragment key={step.id}>
                            <button
                                type="button"
                                className={cn(
                                    "flex items-center gap-3 transition-all duration-300",
                                    currentStep >= step.id ? "opacity-100" : "opacity-40",
                                    step.id < currentStep && "cursor-pointer",
                                )}
                                onClick={() => { if (step.id < currentStep) setCurrentStep(step.id) }}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                                    currentStep > step.id
                                        ? "bg-zinc-900 text-white"
                                        : currentStep === step.id
                                            ? "bg-zinc-900/10 text-zinc-700 ring-2 ring-zinc-900/30"
                                            : "bg-muted/50 text-muted-foreground",
                                )}>
                                    {currentStep > step.id
                                        ? <Check className="h-5 w-5" />
                                        : <step.icon className="h-5 w-5" />}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-sm font-semibold">{step.title}</p>
                                    <p className="text-xs text-muted-foreground">{step.description}</p>
                                </div>
                            </button>
                            {index < STEPS.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-0.5 mx-2 rounded-full transition-all duration-500",
                                    currentStep > step.id ? "bg-zinc-900" : "bg-border/60",
                                )} />
                            )}
                        </Fragment>
                    ))}
                </div>
            </CardContent>
        </Card>
    )

    // ─── Step 1 : Type de publication ────────────────────

    const renderStep1 = () => (
        <Card className={CARD}>
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-zinc-700" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Type de publication</CardTitle>
                        <p className="text-sm text-muted-foreground">Choisissez le type d&apos;annonce</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vente */}
                    <button
                        type="button"
                        onClick={() => updateFormData("typePublication", "vente")}
                        className={cn(
                            "relative p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:-translate-y-1",
                            formData.typePublication === "vente"
                                ? "border-zinc-900 bg-zinc-900/5 shadow-lg shadow-zinc-900/10"
                                : "border-border/40 bg-card/30 hover:border-zinc-900/30",
                        )}
                    >
                        {formData.typePublication === "vente" && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900/10 flex items-center justify-center mb-4">
                            <ShoppingBag className="h-7 w-7 text-zinc-700" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">Vente</h3>
                        <p className="text-sm text-muted-foreground">
                            Mettez votre véhicule en vente et trouvez un acheteur rapidement
                        </p>
                    </button>

                    {/* Location */}
                    <button
                        type="button"
                        onClick={() => updateFormData("typePublication", "location")}
                        className={cn(
                            "relative p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:-translate-y-1",
                            formData.typePublication === "location"
                                ? "border-zinc-900 bg-zinc-900/5 shadow-lg shadow-zinc-900/10"
                                : "border-border/40 bg-card/30 hover:border-zinc-900/30",
                        )}
                    >
                        {formData.typePublication === "location" && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                            <Key className="h-7 w-7 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold mb-1">Location</h3>
                        <p className="text-sm text-muted-foreground">
                            Proposez votre véhicule en location et générez des revenus réguliers
                        </p>
                    </button>
                </div>

                <Separator className="my-4" />

                {/* Neuf / Occasion */}
                <p className="text-sm font-semibold text-zinc-700 mb-3">État du véhicule <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => updateFormData("type", "neuf")}
                        className={cn(
                            "relative p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:-translate-y-1",
                            formData.type === "neuf"
                                ? "border-green-600 bg-green-50/50 shadow-lg shadow-green-600/10"
                                : "border-border/40 bg-card/30 hover:border-green-600/30",
                        )}
                    >
                        {formData.type === "neuf" && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <h3 className="text-base font-bold mb-1">Neuf</h3>
                        <p className="text-sm text-muted-foreground">Véhicule jamais utilisé, sortie de concession</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => updateFormData("type", "occasion")}
                        className={cn(
                            "relative p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:-translate-y-1",
                            formData.type === "occasion"
                                ? "border-amber-500 bg-amber-50/50 shadow-lg shadow-amber-500/10"
                                : "border-border/40 bg-card/30 hover:border-amber-500/30",
                        )}
                    >
                        {formData.type === "occasion" && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <h3 className="text-base font-bold mb-1">Occasion</h3>
                        <p className="text-sm text-muted-foreground">Véhicule déjà utilisé, avec ou sans historique</p>
                    </button>
                </div>
            </CardContent>
        </Card>
    )

    // ─── Step 2 : Informations du véhicule ───────────────

    const renderStep2 = () => (
        <div className="space-y-4">
            <Card className={CARD}>
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                            <Car className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Informations du véhicule</CardTitle>
                            <p className="text-sm text-muted-foreground">Décrivez votre véhicule en détail</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-4 space-y-5">
                    {/* Marque + Modèle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Marque <span className="text-red-500">*</span></Label>
                            <Select value={formData.marque} onValueChange={v => updateFormData("marque", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Sélectionner une marque" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MARQUES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="modele">Modèle <span className="text-red-500">*</span></Label>
                            <Input
                                id="modele"
                                placeholder="Ex: RAV4, Série 3, 3008..."
                                value={formData.modele}
                                onChange={e => updateFormData("modele", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Année + Kilométrage */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Année <span className="text-red-500">*</span></Label>
                            <Select value={formData.annee} onValueChange={v => updateFormData("annee", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Année du véhicule" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ANNEES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="km">Kilométrage (km)</Label>
                            <Input
                                id="km"
                                type="number"
                                placeholder="Ex: 45000"
                                value={formData.kilometrage}
                                onChange={e => updateFormData("kilometrage", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Carburant + Transmission */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Carburant</Label>
                            <Select value={formData.carburant} onValueChange={v => updateFormData("carburant", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Type de carburant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CARBURANTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Transmission</Label>
                            <Select value={formData.transmission} onValueChange={v => updateFormData("transmission", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Type de transmission" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Couleur */}
                    <div className="space-y-2">
                        <Label>Couleur</Label>
                        <div className="flex flex-wrap gap-2">
                            {COULEURS.map(c => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => updateFormData("couleur", c.name)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-sm",
                                        formData.couleur === c.name
                                            ? "border-zinc-900 bg-zinc-900/5 ring-1 ring-zinc-900/30"
                                            : "border-border/40 hover:border-zinc-900/30",
                                    )}
                                >
                                    <span className="w-4 h-4 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: c.hex }} />
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Portes + Places */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nombre de portes</Label>
                            <Select value={formData.nombrePortes} onValueChange={v => updateFormData("nombrePortes", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Portes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["2", "3", "4", "5"].map(n => <SelectItem key={n} value={n}>{n} portes</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre de places</Label>
                            <Select value={formData.nombrePlaces} onValueChange={v => updateFormData("nombrePlaces", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Places" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["2", "4", "5", "7", "9"].map(n => <SelectItem key={n} value={n}>{n} places</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/*  */}
                </CardContent>
            </Card>

            {/* État & Documents */}
            <Card className={CARD}>
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Settings className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">État & Documents</CardTitle>
                            <p className="text-sm text-muted-foreground">Renseignez les documents et l&apos;historique</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-4 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Visite technique</Label>
                            <Select value={formData.visite_technique} onValueChange={v => updateFormData("visite_technique", v as FormData["visite_technique"])}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="à_jour">À jour</SelectItem>
                                    <SelectItem value="expirée">Expirée</SelectItem>
                                    <SelectItem value="non_concerné">Non concerné</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Carte grise</Label>
                            <Select value={formData.carte_grise} onValueChange={v => updateFormData("carte_grise", v as FormData["carte_grise"])}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="à_jour">À jour</SelectItem>
                                    <SelectItem value="expirée">Expirée</SelectItem>
                                    <SelectItem value="non_concerné">Non concerné</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Assurance</Label>
                            <Select value={formData.assurance} onValueChange={v => updateFormData("assurance", v as FormData["assurance"])}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="à_jour">À jour</SelectItem>
                                    <SelectItem value="expirée">Expirée</SelectItem>
                                    <SelectItem value="non_concerné">Non concerné</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Historique d&apos;accidents</Label>
                        <Select value={formData.historique_accidents} onValueChange={v => updateFormData("historique_accidents", v as FormData["historique_accidents"])}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Historique" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aucun">Aucun accident</SelectItem>
                                <SelectItem value="quelques_accidents">Quelques accidents</SelectItem>
                                <SelectItem value="nombreux_accidents">Nombreux accidents</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Photos */}
            <Card className={CARD}>
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Camera className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Photos du véhicule</CardTitle>
                            <p className="text-sm text-muted-foreground">Ajoutez jusqu&apos;à 8 photos</p>
                        </div>
                        <Badge variant="outline" className="ml-auto rounded-full">{photos.length} / 10</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={e => { if (e.key === "Enter") fileInputRef.current?.click() }}
                        role="button"
                        tabIndex={0}
                        className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center hover:border-zinc-900/50 hover:bg-zinc-900/5 transition-all duration-300 cursor-pointer mb-4"
                    >
                        <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium">Cliquez pour ajouter des photos</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoAdd}
                        />
                    </div>

                    {photoUrls.length > 0 && (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                            {photoUrls.map((url, i) => (
                                <div key={i} className="relative rounded-xl overflow-hidden aspect-square group">
                                    <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); removePhoto(i) }}
                                        className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3 text-white" />
                                    </button>
                                    {i === 0 && (
                                        <Badge className="absolute bottom-2 left-2 bg-zinc-900 text-white text-[10px] rounded-full">
                                            Principale
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )

    // ─── Step 3 : Équipements ────────────────────────────

    const renderStep3 = () => (
        <Card className={CARD}>
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                        <Settings className="h-5 w-5 text-zinc-700" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Équipements & Options</CardTitle>
                        <p className="text-sm text-muted-foreground">Sélectionnez les équipements du véhicule</p>
                    </div>
                    {formData.equipements.length > 0 && (
                        <Badge className="ml-auto bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full">
                            {formData.equipements.length} sélectionnés
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {EQUIPEMENTS.map(eq => {
                        const selected = formData.equipements.includes(eq.id)
                        return (
                            <button
                                key={eq.id}
                                type="button"
                                onClick={() => toggleEquipement(eq.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left text-sm",
                                    selected
                                        ? "border-zinc-900/40 bg-zinc-900/10 text-zinc-700 dark:text-zinc-400"
                                        : "border-border/40 hover:border-zinc-900/20 hover:bg-muted/30",
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                    selected ? "bg-zinc-900 border-zinc-900 text-white" : "border-border/60",
                                )}>
                                    {selected && <Check className="h-3 w-3" />}
                                </div>
                                <span className="font-medium">{eq.label}</span>
                            </button>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )

    // ─── Step 4 : Disponibilité ──────────────────────────

    const renderStep4 = () => (
        <Card className={CARD}>
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-zinc-700" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Disponibilité</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {formData.typePublication === "vente"
                                ? "Date à partir de laquelle le véhicule est disponible"
                                : "Définissez la période de location"}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-4">
                {formData.typePublication === "vente" ? (
                    <div className="space-y-4">
                        {/* Sélection rapide de période */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([
                                { id: "maintenant", label: "Maintenant", days: 0 },
                                { id: "1_semaine", label: "1 semaine", days: 7 },
                                { id: "2_semaines", label: "2 semaines", days: 14 },
                                { id: "1_mois", label: "1 mois", days: 30 },
                            ] as const).map(({ id, label, days }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => {
                                        setPeriodeChoisie(id)
                                        const date = new Date()
                                        date.setDate(date.getDate() + days)
                                        updateFormData("dateDisponibilite", date)
                                    }}
                                    className={cn(
                                        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                                        periodeChoisie === id
                                            ? "bg-primary text-white border-primary"
                                            : "border-border/40 hover:bg-muted"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Option date personnalisée */}
                        <button
                            type="button"
                            onClick={() => {
                                setPeriodeChoisie("personnalisee")
                                updateFormData("dateDisponibilite", undefined)
                            }}
                            className={cn(
                                "w-full rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                                periodeChoisie === "personnalisee"
                                    ? "bg-primary text-white border-primary"
                                    : "border-border/40 hover:bg-muted"
                            )}
                        >
                            Date personnalisée
                        </button>

                        {/* Calendar — uniquement si "personnalisée" sélectionné */}
                        {periodeChoisie === "personnalisee" && (
                            <div className="flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={formData.dateDisponibilite}
                                    onSelect={(date: Date | undefined) => updateFormData("dateDisponibilite", date)}
                                    disabled={(date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    className="rounded-xl border border-border/40"
                                />
                            </div>
                        )}

                        {/* Badge récapitulatif */}
                        {formData.dateDisponibilite && (
                            <div className="text-center">
                                <Badge variant="outline" className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full px-4 py-1.5">
                                    Disponible à partir du {formatDate(formData.dateDisponibilite)}
                                </Badge>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dateDebut">Date de début <span className="text-red-500">*</span></Label>
                                <Input
                                    id="dateDebut"
                                    type="date"
                                    value={formData.dateDebutLocation}
                                    onChange={e => updateFormData("dateDebutLocation", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateFin">Date de fin <span className="text-red-500">*</span></Label>
                                <Input
                                    id="dateFin"
                                    type="date"
                                    value={formData.dateFinLocation}
                                    onChange={e => updateFormData("dateFinLocation", e.target.value)}
                                />
                            </div>
                        </div>
                        {formData.dateDebutLocation && formData.dateFinLocation && (
                            <div className="text-center">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 rounded-full px-4 py-1.5">
                                    Du {new Date(formData.dateDebutLocation).toLocaleDateString("fr-FR")} au {new Date(formData.dateFinLocation).toLocaleDateString("fr-FR")}
                                </Badge>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )

    // ─── Step 5 : Prix & Négociation ─────────────────────

    const renderStep5 = () => (
        <div className="space-y-4">
            {/* Prix */}
            <Card className={CARD}>
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                            <BadgeDollarSign className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Prix & Négociation</CardTitle>
                            <p className="text-sm text-muted-foreground">Définissez le prix de votre annonce</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="prix">
                                {formData.typePublication === "vente" ? "Prix de vente" : "Prix total"} (FCFA)
                                <span className="text-red-500"> *</span>
                            </Label>
                            <Input
                                id="prix"
                                type="number"
                                placeholder="Ex: 15000000"
                                value={formData.prix}
                                onChange={e => updateFormData("prix", e.target.value)}
                            />
                            {formData.prix && (
                                <p className="text-xs text-muted-foreground">{formatMontant(formData.prix)} FCFA</p>
                            )}
                        </div>
                        {formData.typePublication === "location" && (
                            <div className="space-y-2">
                                <Label htmlFor="prixJour">Prix par jour (FCFA) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="prixJour"
                                    type="number"
                                    placeholder="Ex: 25000"
                                    value={formData.prixParJour}
                                    onChange={e => updateFormData("prixParJour", e.target.value)}
                                />
                                {formData.prixParJour && (
                                    <p className="text-xs text-muted-foreground">{formatMontant(formData.prixParJour)} FCFA / jour</p>
                                )}
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-muted/20">
                        <Checkbox
                            id="negociable"
                            checked={formData.negociable}
                            onCheckedChange={(checked) => updateFormData("negociable", checked as boolean)}
                        />
                        <div>
                            <Label htmlFor="negociable" className="text-sm font-medium cursor-pointer">
                                Prix négociable
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Les acheteurs pourront proposer un prix différent
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Récapitulatif */}
            <Card className={CARD}>
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Eye className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Récapitulatif</CardTitle>
                            <p className="text-sm text-muted-foreground">Vérifiez les informations avant de publier</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-4">
                    <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium capitalize">{formData.typePublication || "—"}</span>

                        <span className="text-muted-foreground">Véhicule</span>
                        <span className="font-medium">
                            {formData.marque} {formData.modele} {formData.annee}
                        </span>

                        {formData.kilometrage && (
                            <>
                                <span className="text-muted-foreground">Kilométrage</span>
                                <span className="font-medium">{formatMontant(formData.kilometrage)} km</span>
                            </>
                        )}

                        {formData.carburant && (
                            <>
                                <span className="text-muted-foreground">Carburant</span>
                                <span className="font-medium">{formData.carburant}</span>
                            </>
                        )}

                        {formData.transmission && (
                            <>
                                <span className="text-muted-foreground">Transmission</span>
                                <span className="font-medium">{formData.transmission}</span>
                            </>
                        )}

                        {formData.couleur && (
                            <>
                                <span className="text-muted-foreground">Couleur</span>
                                <span className="font-medium">{formData.couleur}</span>
                            </>
                        )}

                        {formData.nombrePortes && (
                            <>
                                <span className="text-muted-foreground">Portes / Places</span>
                                <span className="font-medium">{formData.nombrePortes} portes, {formData.nombrePlaces || "—"} places</span>
                            </>
                        )}

                        <span className="text-muted-foreground">Équipements</span>
                        <span className="font-medium">
                            {formData.equipements.length > 0
                                ? `${formData.equipements.length} option(s)`
                                : "Aucun"}
                        </span>

                        <span className="text-muted-foreground">Disponibilité</span>
                        <span className="font-medium">
                            {formData.typePublication === "vente"
                                ? formatDate(formData.dateDisponibilite)
                                : formData.dateDebutLocation && formData.dateFinLocation
                                    ? `${new Date(formData.dateDebutLocation).toLocaleDateString("fr-FR")} — ${new Date(formData.dateFinLocation).toLocaleDateString("fr-FR")}`
                                    : "—"}
                        </span>

                        <span className="text-muted-foreground">Prix</span>
                        <span className="font-bold text-zinc-700">{formatMontant(formData.prix)} FCFA</span>

                        {formData.typePublication === "location" && formData.prixParJour && (
                            <>
                                <span className="text-muted-foreground">Prix / jour</span>
                                <span className="font-medium">{formatMontant(formData.prixParJour)} FCFA</span>
                            </>
                        )}

                        <span className="text-muted-foreground">Négociable</span>
                        <span className="font-medium">{formData.negociable ? "Oui" : "Non"}</span>

                        <span className="text-muted-foreground">Photos</span>
                        <span className="font-medium">{photos.length} photo(s)</span>
                    </div>

                    {/* Équipements detail */}
                    {formData.equipements.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/40">
                            <p className="text-sm text-muted-foreground mb-2">Équipements sélectionnés :</p>
                            <div className="flex flex-wrap gap-2">
                                {formData.equipements.map(id => {
                                    const eq = EQUIPEMENTS.find(e => e.id === id)
                                    return eq ? (
                                        <Badge key={id} variant="outline" className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full text-xs">
                                            {eq.label}
                                        </Badge>
                                    ) : null
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )

    // ─── Main Render ─────────────────────────────────────

    return (
        <div className="min-h-screen pt-20 px-4 md:px-6 pb-12">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="animate-in fade-in slide-in-from-left duration-500">

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900/10 flex items-center justify-center">
                            <Car className="h-6 w-6 text-zinc-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Nouvelle annonce</h1>
                            <p className="text-muted-foreground text-sm">Publiez votre véhicule en quelques étapes</p>
                        </div>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                    {renderStepIndicator()}
                </div>

                {/* Step Content */}
                <div key={currentStep} className="animate-in fade-in duration-300">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                </div>

                {/* Navigation */}
                <Card className={cn(CARD, "animate-in fade-in slide-in-from-bottom duration-500 delay-200")}>
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            {currentStep > 1 ? (
                                <Button
                                    variant="outline"
                                    onClick={goToPrev}
                                    className="gap-2 cursor-pointer rounded-xl"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Précédent
                                </Button>
                            ) : (
                                <div />
                            )}

                            {currentStep < 5 ? (
                                <Button
                                    onClick={goToNext}
                                    className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-bold cursor-pointer rounded-xl"
                                >
                                    Suivant
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-bold cursor-pointer rounded-xl px-8"
                                >
                                    <Send className="h-4 w-4" />
                                    Publier l&apos;annonce
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
