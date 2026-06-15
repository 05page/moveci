"use client"

import { Suspense, useState } from "react"
import { getErrorMessage } from "@/src/lib/handleError"

/** Extrait un message lisible depuis une réponse JSON Laravel (gère data.errors et data.message). */
function extractApiError(data: { message?: string; errors?: Record<string, string[]> }, fallback: string): string {
    if (data.errors && Object.keys(data.errors).length > 0) {
        return Object.values(data.errors).flat().join(" ")
    }
    return data.message || fallback
}
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CheckCircle,
    Eye,
    EyeOff,
    GraduationCap,
    Lock,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Store,
    UserCircle,
    Users,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getDashBoard } from "@/src/core/auth/permission"
import { UserRole } from "@/src/types"
import { forgotPassword } from "@/src/actions/auth.actions"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface FormRegister {
    fullname: string,
    role: "vendeur" | "client" | "concessionnaire" | "auto_ecole",
    email: string,
    telephone: string,
    adresse: string
    latitude?: number
    longitude?: number
    password: string,
    passwordConfirmation: string,
    raison_sociale: string,
    rccm: string,
    numero_agrement: string,
}

interface FormLogin {
    email: string,
    password: string,
}

const AuthContent = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [registerStep, setRegisterStep] = useState(1)
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)
    const [forgotOpen, setForgotOpen] = useState(false)
    const [forgotEmail, setForgotEmail] = useState("")
    const [isSendingReset, setIsSendingReset] = useState(false)
    const [forgotSent, setForgotSent] = useState(false)
    const defaultTab = searchParams.get("tab") === "register" ? "register" : "login"
    const [formDataLogin, setFormDataLogin] = useState<FormLogin>({
        email: "",
        password: ""
    })
    const roleFromUrl = searchParams.get("role")
    const initialRole: FormRegister["role"] =
        roleFromUrl === "concessionnaire" || roleFromUrl === "auto_ecole" || roleFromUrl === "vendeur"
            ? roleFromUrl
            : "client"

    const [formDataRegister, setFormDataRegister] = useState<FormRegister>({
        fullname: "",
        role: initialRole,
        email: "",
        telephone: "",
        adresse: "",
        password: "",
        passwordConfirmation: "",
        raison_sociale: "",
        rccm: "",
        numero_agrement: "",
    })

    const isPartenaire = formDataRegister.role === "concessionnaire" || formDataRegister.role === "auto_ecole"

    const handleChange = (key: keyof FormRegister, value: FormRegister[keyof FormRegister]) => {
        setFormDataRegister(prev => ({
            ...prev,
            [key]: value
        }))
    }
    const handleChangeLogin = (key: keyof FormLogin, value: string) => {
        setFormDataLogin(prev => ({
            ...prev,
            [key]: value
        }))
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSendingReset(true)
        try {
            await forgotPassword(forgotEmail)
            setForgotSent(true)
        } catch (err) {
            // On affiche le message du backend (ex: "Ce compte utilise Google")
            // plutôt qu'un message générique qui cache la vraie raison
            const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi. Réessayez dans quelques instants."
            toast.error(msg)
        } finally {
            setIsSendingReset(false)
        }
    }

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoggingIn(true)
        try {
            const res = await fetch('/api/auth/login', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formDataLogin),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(extractApiError(data, "Erreur lors de la connexion"))
                return
            }
            toast.success("Connexion réussie !")
            router.push(getDashBoard(data.role as UserRole))
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsLoggingIn(false)
        }
    }

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsRegistering(true)
        try {
            const body: Record<string, string | number> = {
                fullname: formDataRegister.fullname,
                role: formDataRegister.role,
                email: formDataRegister.email,
                telephone: formDataRegister.telephone,
                adresse: formDataRegister.adresse,
                password: formDataRegister.password,
                password_confirmation: formDataRegister.passwordConfirmation,
                ...(formDataRegister.latitude  && { latitude:  formDataRegister.latitude }),
                ...(formDataRegister.longitude && { longitude: formDataRegister.longitude }),
            }
            if (formDataRegister.role === "concessionnaire" || formDataRegister.role === "auto_ecole") {
                body.raison_sociale = formDataRegister.raison_sociale
                if (formDataRegister.role === "concessionnaire") body.rccm = formDataRegister.rccm
                if (formDataRegister.role === "auto_ecole") body.numero_agrement = formDataRegister.numero_agrement
            }

            const res = await fetch('/api/auth/register', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            const data = await res.json()
            if (!res.ok) {
                toast.error(extractApiError(data, "Erreur lors de l'inscription"))
                return
            }

            if (formDataRegister.role === "concessionnaire" || formDataRegister.role === "auto_ecole") {
                toast.success("Demande envoyée ! Votre compte est en attente de validation par notre équipe.")
                router.push("/auth/en-attente")
            } else {
                toast.success(data.message || "Compte créé avec succès !")
                router.push(getDashBoard(data.role as UserRole))
            }
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setIsRegistering(false)
        }
    }
    const handleAuthGoogle = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/google/redirect`;
    }
    return (
        <>
        <div className="min-h-screen flex">
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <Image
                    src="/vehicle/img3.jpg"
                    alt="Move CI - Votre vehicule ideal"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/10" />

            </div>

            <div className="w-full lg:w-1/2 bg-white flex flex-col">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center justify-center gap-2 pt-8 pb-4">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/vehicle/mov3.png" alt="Move CI" width={90} height={52} />
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-16">
                    <div className="w-full max-w-md">
                        {/* Desktop logo */}
                        <div className="hidden lg:flex items-center gap-2 mb-10">
                            <Link href="/" className="flex items-center gap-2">
                                <Image src="/vehicle/mov3.png" alt="Move CI" width={90} height={52} />
                            </Link>
                        </div>

                        <Tabs defaultValue={defaultTab} className="w-full" onValueChange={() => setRegisterStep(1)}>
                            <TabsList className="grid w-full grid-cols-2 bg-gray-100 h-12 p-1 rounded-2xl">
                                <TabsTrigger
                                    value="login"
                                    className="h-full rounded-xl font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 cursor-pointer"
                                >
                                    Connexion
                                </TabsTrigger>
                                <TabsTrigger
                                    value="register"
                                    className="h-full rounded-xl font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500 cursor-pointer"
                                >
                                    Inscription
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="mt-0">
                                <div className="mb-8">
                                    <h2 className="text-3xl font-black text-zinc-900 mb-2">Bon retour !</h2>
                                    <p className="text-zinc-400">Connectez-vous pour acceder a votre compte</p>
                                </div>

                                <form className="space-y-6" onSubmit={handleLoginSubmit}>
                                    <div className="space-y-2">
                                        <Label htmlFor="login-email" className="text-sm font-semibold text-zinc-700">
                                            Email
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <Input
                                                id="login-email"
                                                type="email"
                                                value={formDataLogin.email}
                                                onChange={(e) => handleChangeLogin("email", e.target.value)}
                                                placeholder="exemple@email.com"
                                                className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="login-password" className="text-sm font-semibold text-zinc-700">
                                                Mot de passe
                                            </Label>
                                            <button
                                                type="button"
                                                onClick={() => { setForgotOpen(true); setForgotSent(false); setForgotEmail("") }}
                                                className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                                            >
                                                Mot de passe oublié ?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <Input
                                                id="login-password"
                                                type={showPassword ? "text" : "password"}
                                                value={formDataLogin.password}
                                                onChange={(e) => handleChangeLogin("password", e.target.value)}
                                                placeholder="Votre mot de passe"
                                                className="pl-11 pr-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoggingIn}
                                        className="w-full h-12 rounded-xl bg-[#efbf04] hover:bg-[#d4aa00] text-black font-bold text-sm cursor-pointer shadow-lg shadow-[#efbf04]/20"
                                    >
                                        {isLoggingIn
                                            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Connexion...</>
                                            : "Se connecter"
                                        }
                                    </Button>

                                    <div className="relative my-2">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200" />
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="bg-white px-4 text-zinc-400 font-medium">ou</span>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={() => handleAuthGoogle()}
                                        variant="outline"
                                        className="w-full h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-zinc-700 font-bold text-sm cursor-pointer"
                                    >
                                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        Continuer avec Google
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="register" className="mt-0">
                                <div className="mb-6">
                                    <h2 className="text-3xl font-black text-zinc-900 mb-2">Creer un compte</h2>
                                    <p className="text-zinc-400">Rejoignez la communaute Move CI</p>
                                </div>

                                {/* Step Indicator */}
                                <div className="flex items-center gap-2 mb-6">
                                    {[1, 2, 3].map((step) => (
                                        <div key={step} className="flex items-center gap-2 flex-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${registerStep === step
                                                ? "bg-[#efbf04] text-black shadow-md shadow-[#efbf04]/20"
                                                : registerStep > step
                                                    ? "bg-amber-100 text-amber-600"
                                                    : "bg-gray-100 text-zinc-400"
                                                }`}>
                                                {registerStep > step ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : step}
                                            </div>
                                            {step < 3 && (
                                                <div className={`flex-1 h-1 rounded-full transition-all duration-200 ${registerStep > step ? "bg-amber-300" : "bg-gray-200"
                                                    }`} />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                                    {/* ===== ETAPE 1 : Type de compte ===== */}
                                    {registerStep === 1 && (
                                        <div className="space-y-5">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-zinc-700">
                                                    Type de compte
                                                </Label>
                                                <p className="text-xs text-zinc-400">Choisissez le type de compte qui vous correspond</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {([
                                                        { role: "client", label: "Client", sub: "Acheter ou louer", Icon: UserCircle },
                                                        { role: "vendeur", label: "Vendeur", sub: "Vendre des véhicules", Icon: Store },
                                                        { role: "concessionnaire", label: "Concessionnaire", sub: "Réseau de vente pro", Icon: Building2 },
                                                        { role: "auto_ecole", label: "Auto-école", sub: "Formations au permis", Icon: GraduationCap },
                                                    ] as const).map(({ role, label, sub, Icon }) => {
                                                        const active = formDataRegister.role === role
                                                        return (
                                                            <button
                                                                key={role}
                                                                type="button"
                                                                onClick={() => handleChange("role", role)}
                                                                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${active
                                                                    ? "border-amber-500 bg-amber-50 shadow-md shadow-amber-500/10"
                                                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                                                    }`}
                                                            >
                                                                {active && (
                                                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#efbf04] flex items-center justify-center">
                                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${active ? "bg-amber-100" : "bg-gray-50"}`}>
                                                                    <Icon className={`h-6 w-6 ${active ? "text-amber-600" : "text-gray-400"}`} />
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className={`text-sm font-bold ${active ? "text-amber-700" : "text-zinc-700"}`}>{label}</p>
                                                                    <p className="text-xs text-zinc-400">{sub}</p>
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={() => setRegisterStep(2)}
                                                className="w-full h-12 rounded-xl bg-[#efbf04] hover:bg-[#d4aa00] text-black font-bold text-sm cursor-pointer shadow-lg shadow-[#efbf04]/20"
                                            >
                                                Suivant
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* ===== ETAPE 2 : Informations personnelles ===== */}
                                    {registerStep === 2 && (
                                        <div className="space-y-5">
                                            <p className="text-sm font-semibold text-zinc-700">Informations personnelles</p>

                                            {/* Nom + Prenom */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="lastname" className="text-sm font-semibold text-zinc-700">
                                                        Nom Complet
                                                    </Label>
                                                    <div className="relative">
                                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                        <Input
                                                            id="lastname"
                                                            type="text"
                                                            value={formDataRegister.fullname}
                                                            onChange={(e) => handleChange("fullname", e.target.value)}
                                                            placeholder="Votre nom"
                                                            className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Email + Telephone */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reg-email" className="text-sm font-semibold text-zinc-700">
                                                        Email
                                                    </Label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                        <Input
                                                            id="reg-email"
                                                            type="email"
                                                            value={formDataRegister.email}
                                                            onChange={(e) => handleChange("email", e.target.value)}
                                                            placeholder="Email"
                                                            className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone" className="text-sm font-semibold text-zinc-700">
                                                        Telephone
                                                    </Label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                        <Input
                                                            id="phone"
                                                            type="tel"
                                                            value={formDataRegister.telephone}
                                                            onChange={(e) => handleChange("telephone", e.target.value)}
                                                            placeholder="+225 XX XX XX XX"
                                                            className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Adresse */}
                                            <div className="space-y-2">
                                                <Label htmlFor="address" className="text-sm font-semibold text-zinc-700">
                                                    Adresse
                                                </Label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                    <Input
                                                        id="address"
                                                        type="text"
                                                        value={formDataRegister.adresse}
                                                        onChange={(e) => handleChange("adresse", e.target.value)}
                                                        placeholder="Abidjan, Cocody..."
                                                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                    />
                                                </div>
                                            </div>

                                            {/* Champs spécifiques partenaires */}
                                            {isPartenaire && (
                                                <div className="space-y-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Informations professionnelles</p>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-semibold text-zinc-700">Raison sociale</Label>
                                                        <div className="relative">
                                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                            <Input
                                                                type="text"
                                                                value={formDataRegister.raison_sociale}
                                                                onChange={(e) => handleChange("raison_sociale", e.target.value)}
                                                                placeholder="Nom de votre entreprise"
                                                                className="pl-11 h-12 rounded-xl bg-white border-amber-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                            />
                                                        </div>
                                                    </div>
                                                    {formDataRegister.role === "concessionnaire" && (
                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-semibold text-zinc-700">Numéro RCCM</Label>
                                                            <Input
                                                                type="text"
                                                                value={formDataRegister.rccm}
                                                                onChange={(e) => handleChange("rccm", e.target.value)}
                                                                placeholder="Ex: CI-ABJ-2024-B-12345"
                                                                className="h-12 rounded-xl bg-white border-amber-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                            />
                                                        </div>
                                                    )}
                                                    {formDataRegister.role === "auto_ecole" && (
                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-semibold text-zinc-700">Numéro d&apos;agrément</Label>
                                                            <Input
                                                                type="text"
                                                                value={formDataRegister.numero_agrement}
                                                                onChange={(e) => handleChange("numero_agrement", e.target.value)}
                                                                placeholder="Ex: AE-2024-0123"
                                                                className="h-12 rounded-xl bg-white border-amber-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                            />
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-amber-600">
                                                        Votre compte sera activé après vérification par notre équipe (24-48h).
                                                    </p>
                                                </div>
                                            )}

                                            {/* Navigation */}
                                            <div className="flex gap-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setRegisterStep(1)}
                                                    className="flex-1 h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-zinc-700 font-bold text-sm cursor-pointer"
                                                >
                                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                                    Retour
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => setRegisterStep(3)}
                                                    className="flex-1 h-12 rounded-xl bg-[#efbf04] hover:bg-[#d4aa00] text-black font-bold text-sm cursor-pointer shadow-lg shadow-[#efbf04]/20"
                                                >
                                                    Suivant
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== ETAPE 3 : Mot de passe ===== */}
                                    {registerStep === 3 && (
                                        <div className="space-y-5">
                                            <p className="text-sm font-semibold text-zinc-700">Securisez votre compte</p>

                                            {/* Mot de passe */}
                                            <div className="space-y-2">
                                                <Label htmlFor="reg-password" className="text-sm font-semibold text-zinc-700">
                                                    Mot de passe
                                                </Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                    <Input
                                                        id="reg-password"
                                                        type={showPassword ? "text" : "password"}
                                                        onChange={(e) => handleChange("password", e.target.value)}
                                                        value={formDataRegister.password}
                                                        placeholder="Votre mot de passe"
                                                        className="pl-11 pr-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Confirmation mot de passe */}
                                            <div className="space-y-2">
                                                <Label htmlFor="confirm-password" className="text-sm font-semibold text-zinc-700">
                                                    Confirmer le mot de passe
                                                </Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                                    <Input
                                                        id="confirm-password"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        onChange={(e) => handleChange("passwordConfirmation", e.target.value)}
                                                        placeholder="Confirmer votre mot de passe"
                                                        value={formDataRegister.passwordConfirmation}
                                                        className="pl-11 pr-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-xs text-zinc-400 leading-relaxed">
                                                En creant un compte, vous acceptez nos{" "}
                                                <a href="#" className="text-amber-600 hover:underline font-medium">conditions d&apos;utilisation</a>
                                                {" "}et notre{" "}
                                                <a href="#" className="text-amber-600 hover:underline font-medium">politique de confidentialite</a>.
                                            </p>

                                            {/* Navigation */}
                                            <div className="flex gap-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setRegisterStep(2)}
                                                    className="flex-1 h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-zinc-700 font-bold text-sm cursor-pointer"
                                                >
                                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                                    Retour
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={isRegistering}
                                                    className="flex-1 h-12 rounded-xl bg-[#efbf04] hover:bg-[#d4aa00] text-black font-bold text-sm cursor-pointer shadow-lg shadow-[#efbf04]/20"
                                                >
                                                    {isRegistering
                                                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Création...</>
                                                        : "Creer mon compte"
                                                    }
                                                </Button>
                                            </div>

                                            <div className="relative my-2">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gray-200" />
                                                </div>
                                                <div className="relative flex justify-center text-xs">
                                                    <span className="bg-white px-4 text-zinc-400 font-medium">ou</span>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={() => handleAuthGoogle()}
                                                variant="outline"
                                                className="w-full h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-zinc-700 font-bold text-sm cursor-pointer"
                                            >
                                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                Continuer avec Google
                                            </Button>
                                        </div>
                                    )}
                                </form>
                            </TabsContent>
                        </Tabs>

                        <p className="text-center text-xs text-zinc-400 mt-8">
                            2025 Move CI. Tous droits reserves.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* ── Modal mot de passe oublié ─────────────────────────────── */}
        <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Mot de passe oublié</DialogTitle>
                </DialogHeader>

                {forgotSent ? (
                    /* État succès — email envoyé */
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                        <p className="text-sm font-semibold text-zinc-800">Email envoyé !</p>
                        <p className="text-sm text-zinc-500">
                            Si <strong>{forgotEmail}</strong> est enregistré, vous recevrez un lien
                            de réinitialisation dans quelques minutes.
                        </p>
                        <p className="text-xs text-zinc-400">Pensez à vérifier vos spams.</p>
                        <Button
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={() => setForgotOpen(false)}
                        >
                            Fermer
                        </Button>
                    </div>
                ) : (
                    /* Formulaire email */
                    <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 pt-2">
                        <p className="text-sm text-zinc-500">
                            Entrez l&apos;adresse email de votre compte. Nous vous enverrons un lien
                            pour choisir un nouveau mot de passe.
                        </p>
                        <div>
                            <Label htmlFor="forgot-email">Adresse email</Label>
                            <div className="relative mt-1.5">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    required
                                    placeholder="votre@email.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    className="pl-10 h-11 rounded-xl"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={isSendingReset}
                            className="w-full h-11 bg-[#efbf04] hover:bg-[#d4aa00] text-black font-semibold rounded-xl"
                        >
                            {isSendingReset
                                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Envoi...</>
                                : "Envoyer le lien"
                            }
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
        </>
    )
}

const AuthPage = () => (
    <Suspense>
        <AuthContent />
    </Suspense>
)

export default AuthPage
