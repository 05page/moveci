"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
import { api } from "@/src/lib/api"
import { vehicule } from "@/src/types"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
    Tag, Car, Settings, CalendarDays, BadgeDollarSign,
    ShoppingBag, Key, Check, ChevronLeft, ChevronRight,
    ImagePlus, X, Send, Camera, Eye,
} from "lucide-react"

interface EditVehiculeProps {
    isOpen: boolean
    onClose: () => void
    onSubmit?: () => void
    vehicule: vehicule
}

interface FormData {
    typePublication: "vente" | "location" | ""
    typeVehicule: "neuf" | "occasion" | ""
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
}

interface StepInfo {
    id: number
    title: string
    icon: React.ComponentType<{ className?: string }>
}

const STEPS: StepInfo[] = [
    { id: 1, title: "Type", icon: Tag },
    { id: 2, title: "Véhicule", icon: Car },
    { id: 3, title: "Équipements", icon: Settings },
    { id: 4, title: "Dates", icon: CalendarDays },
    { id: 5, title: "Prix", icon: BadgeDollarSign },
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

export function EditVehicle({ isOpen, onClose, onSubmit, vehicule }: EditVehiculeProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState<FormData>({
        typePublication: "",
        typeVehicule: "",
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
    })

    const [photos, setPhotos] = useState<File[]>([])
    const [photoUrls, setPhotoUrls] = useState<string[]>([])

    const allowedPhotoMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/gif",
        "image/svg+xml",
        "image/webp",
    ]
    const allowedPhotoExtensions = ["jpg", "jpeg", "png", "gif", "svg", "webp"]

    useEffect(() => {
        if (!isOpen) return
        setCurrentStep(1)
        setFormData({
            typePublication: vehicule.post_type ?? "",
            typeVehicule: (vehicule.type as "neuf" | "occasion" | "") ?? "",
            marque: vehicule.description?.marque ?? "",
            modele: vehicule.description?.modele ?? "",
            annee: String(vehicule.description?.annee ?? ""),
            kilometrage: String(vehicule.description?.kilometrage ?? ""),
            carburant: vehicule.description?.carburant ?? "",
            transmission: vehicule.description?.transmission ?? "",
            couleur: vehicule.description?.couleur ?? "",
            nombrePortes: String(vehicule.description?.nombre_portes ?? ""),
            nombrePlaces: String(vehicule.description?.nombre_places ?? ""),
            description: "",
            equipements: vehicule.description?.equipements ?? [],
            dateDisponibilite: vehicule.date_disponibilite ? new Date(vehicule.date_disponibilite) : undefined,
            dateDebutLocation: "",
            dateFinLocation: "",
            prix: String(vehicule.prix ?? ""),
            prixParJour: "",
            negociable: vehicule.negociable ?? false,
        })
    }, [isOpen])

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

        const validFiles = files.filter((file) => {
            const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
            return allowedPhotoMimeTypes.includes(file.type) || allowedPhotoExtensions.includes(ext)
        })

        if (validFiles.length < files.length) {
            toast.error("Certaines photos ont ete ignorees (formats autorises: JPG, PNG, GIF, SVG, WEBP)")
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
        const toastId = toast.loading("Modification de l'annonce en cours...")
        try {
            await api.put(`/vehicules/${vehicule.id}`, {
                post_type: formData.typePublication,
                type: formData.typeVehicule,
                prix: Number(formData.prix),
                negociable: formData.negociable,
                date_disponibilite: formData.typePublication === "vente" && formData.dateDisponibilite
                    ? formData.dateDisponibilite.toISOString().split("T")[0]
                    : undefined,
                marque: formData.marque,
                modele: formData.modele,
                annee: formData.annee ? Number(formData.annee) : undefined,
                carburant: formData.carburant || undefined,
                transmission: formData.transmission || undefined,
                kilometrage: formData.kilometrage ? Number(formData.kilometrage) : undefined,
                couleur: formData.couleur || undefined,
                nombre_portes: formData.nombrePortes ? Number(formData.nombrePortes) : undefined,
                nombre_places: formData.nombrePlaces ? Number(formData.nombrePlaces) : undefined,
                equipements: formData.equipements,
            })
            toast.dismiss(toastId)
            toast.success("Annonce modifiée avec succès !", {
                description: `${formData.marque} ${formData.modele} a été mis à jour.`,
            })
            onSubmit?.()
            onClose()
        } catch (err: unknown) {
            toast.dismiss(toastId)
            const message = err instanceof Error ? err.message : "Erreur lors de la modification"
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="max-w-7xl sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0 gap-0 rounded-2xl border-border/40">
                <DialogHeader className="p-5 pb-0">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                            <Car className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div>
                            <span className="text-lg font-bold">Modifier l&apos;annonce</span>
                            <p className="text-sm text-muted-foreground font-normal">Étape {currentStep} sur 5</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="px-5 pt-4">
                    {/* Step indicator */}
                    <div className="flex items-center gap-1 mb-5">
                        {STEPS.map((step, index) => (
                            <Fragment key={step.id}>
                                <button
                                    type="button"
                                    onClick={() => { if (step.id < currentStep) setCurrentStep(step.id) }}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                        currentStep === step.id
                                            ? "bg-zinc-900/10 text-zinc-700"
                                            : currentStep > step.id
                                                ? "text-zinc-700 cursor-pointer hover:bg-zinc-900/5"
                                                : "text-muted-foreground",
                                    )}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold",
                                        currentStep > step.id
                                            ? "bg-zinc-900 text-white"
                                            : currentStep === step.id
                                                ? "bg-zinc-900/20 text-zinc-700 ring-1 ring-zinc-900/30"
                                                : "bg-muted/50 text-muted-foreground",
                                    )}>
                                        {currentStep > step.id ? <Check className="h-3 w-3" /> : step.id}
                                    </div>
                                    <span className="hidden sm:inline">{step.title}</span>
                                </button>
                                {index < STEPS.length - 1 && (
                                    <div className={cn(
                                        "flex-1 h-0.5 rounded-full",
                                        currentStep > step.id ? "bg-zinc-900" : "bg-border/60",
                                    )} />
                                )}
                            </Fragment>
                        ))}
                    </div>

                    <Separator className="mb-5" />

                    {/* Step content */}
                    <div key={currentStep} className="animate-in fade-in duration-200">

                        {/* ── Step 1: Type de publication ── */}
                        {currentStep === 1 && (
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                        Type de publication
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => updateFormData("typePublication", "vente")}
                                            className={cn(
                                                "relative p-5 rounded-xl border-2 text-left transition-all",
                                                formData.typePublication === "vente"
                                                    ? "border-zinc-900 bg-zinc-900/5"
                                                    : "border-border/40 hover:border-zinc-900/30",
                                            )}
                                        >
                                            {formData.typePublication === "vente" && (
                                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                                                    <Check className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                            <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center mb-3">
                                                <ShoppingBag className="h-5 w-5 text-zinc-700" />
                                            </div>
                                            <h4 className="font-bold text-sm mb-1">Vente</h4>
                                            <p className="text-xs text-muted-foreground">Mettre en vente</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => updateFormData("typePublication", "location")}
                                            className={cn(
                                                "relative p-5 rounded-xl border-2 text-left transition-all",
                                                formData.typePublication === "location"
                                                    ? "border-zinc-900 bg-zinc-900/5"
                                                    : "border-border/40 hover:border-zinc-900/30",
                                            )}
                                        >
                                            {formData.typePublication === "location" && (
                                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                                                    <Check className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                                                <Key className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <h4 className="font-bold text-sm mb-1">Location</h4>
                                            <p className="text-xs text-muted-foreground">Proposer en location</p>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                        État du véhicule
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(["neuf", "occasion"] as const).map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => updateFormData("typeVehicule", t)}
                                                className={cn(
                                                    "relative p-4 rounded-xl border-2 text-left transition-all",
                                                    formData.typeVehicule === t
                                                        ? "border-zinc-900 bg-zinc-900/5"
                                                        : "border-border/40 hover:border-zinc-900/30",
                                                )}
                                            >
                                                {formData.typeVehicule === t && (
                                                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                                <h4 className="font-bold text-sm capitalize">{t}</h4>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Informations du véhicule ── */}
                        {currentStep === 2 && (
                            <div className="space-y-5">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    Informations du véhicule
                                </h3>

                                {/* Marque + Modèle */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Marque <span className="text-red-500">*</span></Label>
                                        <Select value={formData.marque} onValueChange={v => updateFormData("marque", v)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Sélectionner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MARQUES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Modèle <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="Ex: RAV4, Série 3..."
                                            value={formData.modele}
                                            onChange={e => updateFormData("modele", e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Année + Kilométrage */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Année <span className="text-red-500">*</span></Label>
                                        <Select value={formData.annee} onValueChange={v => updateFormData("annee", v)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Année" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ANNEES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Kilométrage (km)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 45000"
                                            value={formData.kilometrage}
                                            onChange={e => updateFormData("kilometrage", e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Carburant + Transmission */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Carburant</Label>
                                        <Select value={formData.carburant} onValueChange={v => updateFormData("carburant", v)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Carburant" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CARBURANTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Transmission</Label>
                                        <Select value={formData.transmission} onValueChange={v => updateFormData("transmission", v)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Transmission" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Couleur */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Couleur</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {COULEURS.map(c => (
                                            <button
                                                key={c.name}
                                                type="button"
                                                onClick={() => updateFormData("couleur", c.name)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all",
                                                    formData.couleur === c.name
                                                        ? "border-zinc-900 bg-zinc-900/5 ring-1 ring-zinc-900/30"
                                                        : "border-border/40 hover:border-zinc-900/30",
                                                )}
                                            >
                                                <span className="w-3.5 h-3.5 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: c.hex }} />
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Portes + Places */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Portes</Label>
                                        <Select value={formData.nombrePortes} onValueChange={v => updateFormData("nombrePortes", v)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Portes" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["2", "3", "4", "5"].map(n => <SelectItem key={n} value={n}>{n} portes</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Places</Label>
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

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Description</Label>
                                    <Textarea
                                        placeholder="Décrivez votre véhicule (état, historique, options...)"
                                        value={formData.description}
                                        onChange={e => updateFormData("description", e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                {/* Photos */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs flex items-center gap-1.5">
                                            <Camera className="h-3.5 w-3.5" /> Photos
                                        </Label>
                                        <Badge variant="outline" className="rounded-full text-[10px]">{photos.length} / 10</Badge>
                                    </div>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onKeyDown={e => { if (e.key === "Enter") fileInputRef.current?.click() }}
                                        role="button"
                                        tabIndex={0}
                                        className="border-2 border-dashed border-border/60 rounded-xl p-5 text-center hover:border-zinc-900/50 hover:bg-zinc-900/5 transition-all cursor-pointer"
                                    >
                                        <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-xs font-medium">Cliquez pour ajouter des photos</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, GIF, SVG, WEBP</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.gif,.svg,.webp,image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handlePhotoAdd}
                                        />
                                    </div>

                                    {photoUrls.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {photoUrls.map((url, i) => (
                                                <div key={i} className="relative rounded-lg overflow-hidden aspect-square group">
                                                    <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); removePhoto(i) }}
                                                        className="absolute top-1.5 right-1.5 w-6 h-6 md:w-5 md:h-5 bg-black/70 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3 md:h-2.5 md:w-2.5 text-white" />
                                                    </button>
                                                    {i === 0 && (
                                                        <Badge className="absolute bottom-1 left-1 bg-zinc-900 text-white text-[8px] rounded-full px-1.5 py-0">
                                                            Principale
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Équipements ── */}
                        {currentStep === 3 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                        Équipements & Options
                                    </h3>
                                    {formData.equipements.length > 0 && (
                                        <Badge className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full text-xs">
                                            {formData.equipements.length} sélectionnés
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {EQUIPEMENTS.map(eq => {
                                        const selected = formData.equipements.includes(eq.id)
                                        return (
                                            <button
                                                key={eq.id}
                                                type="button"
                                                onClick={() => toggleEquipement(eq.id)}
                                                className={cn(
                                                    "flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-all",
                                                    selected
                                                        ? "border-zinc-900/40 bg-zinc-900/10 text-zinc-700 dark:text-zinc-400"
                                                        : "border-border/40 hover:border-zinc-900/20 hover:bg-muted/30",
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                                                    selected ? "bg-zinc-900 border-zinc-900 text-white" : "border-border/60",
                                                )}>
                                                    {selected && <Check className="h-2.5 w-2.5" />}
                                                </div>
                                                <span className="font-medium">{eq.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Step 4: Disponibilité ── */}
                        {currentStep === 4 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    {formData.typePublication === "vente" ? "Disponibilité" : "Période de location"}
                                </h3>

                                {formData.typePublication === "vente" ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-center">
                                            <Calendar
                                                mode="single"
                                                selected={formData.dateDisponibilite}
                                                onSelect={(date: Date | undefined) => updateFormData("dateDisponibilite", date)}
                                                disabled={(date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                className="rounded-xl border border-border/40"
                                            />
                                        </div>
                                        {formData.dateDisponibilite && (
                                            <div className="text-center">
                                                <Badge variant="outline" className="bg-zinc-900/10 text-zinc-700 border-zinc-900/20 rounded-full px-3 py-1">
                                                    Disponible à partir du {formatDate(formData.dateDisponibilite)}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Date de début <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="date"
                                                    value={formData.dateDebutLocation}
                                                    onChange={e => updateFormData("dateDebutLocation", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Date de fin <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="date"
                                                    value={formData.dateFinLocation}
                                                    onChange={e => updateFormData("dateFinLocation", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        {formData.dateDebutLocation && formData.dateFinLocation && (
                                            <div className="text-center">
                                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 rounded-full px-3 py-1">
                                                    Du {new Date(formData.dateDebutLocation).toLocaleDateString("fr-FR")} au {new Date(formData.dateFinLocation).toLocaleDateString("fr-FR")}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Step 5: Prix & Récapitulatif ── */}
                        {currentStep === 5 && (
                            <div className="space-y-5">
                                {/* Prix */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                        Prix & Négociation
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">
                                                {formData.typePublication === "vente" ? "Prix de vente" : "Prix total"} (FCFA)
                                                <span className="text-red-500"> *</span>
                                            </Label>
                                            <Input
                                                type="number"
                                                placeholder="Ex: 15000000"
                                                value={formData.prix}
                                                onChange={e => updateFormData("prix", e.target.value)}
                                            />
                                            {formData.prix && (
                                                <p className="text-[10px] text-muted-foreground">{formatMontant(formData.prix)} FCFA</p>
                                            )}
                                        </div>
                                        {formData.typePublication === "location" && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Prix par jour (FCFA) <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 25000"
                                                    value={formData.prixParJour}
                                                    onChange={e => updateFormData("prixParJour", e.target.value)}
                                                />
                                                {formData.prixParJour && (
                                                    <p className="text-[10px] text-muted-foreground">{formatMontant(formData.prixParJour)} FCFA / jour</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-muted/20">
                                        <Checkbox
                                            id="negociable-edit"
                                            checked={formData.negociable}
                                            onCheckedChange={(checked) => updateFormData("negociable", checked as boolean)}
                                        />
                                        <div>
                                            <Label htmlFor="negociable-edit" className="text-xs font-medium cursor-pointer">
                                                Prix négociable
                                            </Label>
                                            <p className="text-[10px] text-muted-foreground">
                                                Les acheteurs pourront proposer un prix différent
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Récapitulatif */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-amber-600" />
                                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                            Récapitulatif
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-xs rounded-xl border border-border/40 bg-muted/10 p-4">
                                        <span className="text-muted-foreground">Type</span>
                                        <span className="font-medium capitalize">{formData.typePublication || "—"}</span>

                                        <span className="text-muted-foreground">Véhicule</span>
                                        <span className="font-medium">{formData.marque} {formData.modele} {formData.annee}</span>

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

                                        {formData.couleur && (
                                            <>
                                                <span className="text-muted-foreground">Couleur</span>
                                                <span className="font-medium">{formData.couleur}</span>
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

                                        <span className="text-muted-foreground">Photos</span>
                                        <span className="font-medium">{photos.length} photo(s)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between p-5 pt-4 border-t border-border/40 mt-5">
                    {currentStep > 1 ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToPrev}
                            className="gap-1.5 cursor-pointer rounded-lg"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Précédent
                        </Button>
                    ) : (
                        <div />
                    )}

                    {currentStep < 5 ? (
                        <Button
                            size="sm"
                            onClick={goToNext}
                            className="gap-1.5 bg-zinc-900 hover:bg-zinc-700 text-white font-bold cursor-pointer rounded-lg"
                        >
                            Suivant
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="gap-1.5 bg-zinc-900 hover:bg-zinc-700 text-white font-bold cursor-pointer rounded-lg px-6"
                        >
                            <Send className="h-3.5 w-3.5" />
                            Enregistrer
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
