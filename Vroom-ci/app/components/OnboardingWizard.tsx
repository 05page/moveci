"use client"

import { useState } from "react"
import { useUser } from "@/src/context/UserContext"
import { api } from "@/src/lib/api"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { finishOnboarding, submitAutoEcoleProfile, submitOnboardingProfile } from "@/src/actions/onboarding.actions"
import { useRouter } from "next/navigation"
// ─── Définition des étapes par rôle ──────────────────────────────────────────

interface Step {
    title: string
    description: string
}

interface RaisonSociale {
    telephone: string
    adresse: string
}

// Champs spécifiques à l'auto-école — différents de RaisonSociale
interface AutoEcoleProfile {
    raison_sociale: string
    numero_agrement: string
}

const STEPS: Record<string, Step[]> = {
    vendeur: [
        {
            title: "Bienvenue sur Vroom !",
            description: "Quelques étapes rapides pour configurer votre espace vendeur.",
        },
        {
            title: "Votre profil",
            description: "Complétez vos informations de contact pour être joignable par les acheteurs.",
        },
        {
            title: "Votre premier véhicule",
            description: "Ajoutez votre première annonce pour commencer à vendre.",
        },
        {
            title: "Vous êtes prêt !",
            description: "Votre espace vendeur est configuré. Bonne vente !",
        },
    ],
    concessionnaire: [
        {
            title: "Bienvenue sur Vroom !",
            description: "Quelques étapes pour configurer votre espace concessionnaire.",
        },
        {
            title: "Votre concession",
            description: "Renseignez les informations de votre concession.",
        },
        {
            title: "Votre catalogue",
            description: "Ajoutez votre premier véhicule au catalogue.",
        },
        {
            title: "Vous êtes prêt !",
            description: "Votre espace concessionnaire est opérationnel. Bonne activité !",
        },
    ],
    auto_ecole: [
        {
            title: "Bienvenue sur Vroom !",
            description: "Quelques étapes pour configurer votre espace auto-école.",
        },
        {
            title: "Votre auto-école",
            description: "Renseignez les informations de votre établissement.",
        },
        {
            title: "Votre première formation",
            description: "Créez votre première formation pour accueillir des élèves.",
        },
        {
            title: "Vous êtes prêt !",
            description: "Votre espace auto-école est prêt. Bonne gestion !",
        },
    ],
    client: [
        {
            title: "Bienvenue sur Vroom !",
            description: "Prenez 1 minute pour compléter votre profil.",
        },
        {
            title: "Vos coordonnées",
            description: "Renseignez votre téléphone et adresse pour être contacté par les vendeurs.",
        },
        {
            title: "Vous êtes prêt !",
            description: "Votre compte est configuré. Bonne navigation !",
        },
    ],
}

// ─── Contenu de chaque étape par rôle ────────────────────────────────────────
// TODO : remplacer chaque <div> par le vrai formulaire ou composant correspondant.

// StepContent reçoit rsSociale + setRsSociale en props : l'état vit dans OnboardingWizard,
// mais c'est ce composant qui affiche et modifie les champs du formulaire.
function StepContent({
    role,
    stepIndex,
    rsSociale,
    setRsSociale,
    autoEcoleData,
    setAutoEcoleData,
}: {
    role: string
    stepIndex: number
    rsSociale: RaisonSociale
    setRsSociale: React.Dispatch<React.SetStateAction<RaisonSociale>>
    autoEcoleData: AutoEcoleProfile
    setAutoEcoleData: React.Dispatch<React.SetStateAction<AutoEcoleProfile>>
}) {
    const router = useRouter()
    // Validation pour les formulaires téléphone + adresse (vendeur / concessionnaire)
    const handleSubmitContact = (e: React.FormEvent) => {
        e.preventDefault()
        if (!rsSociale.adresse || !rsSociale.telephone) {
            toast.error("Ces champs sont requis")
        }
    }

    // Validation pour le formulaire auto-école
    const handleSubmitAutoEcole = (e: React.FormEvent) => {
        e.preventDefault()
        if (!autoEcoleData.raison_sociale || !autoEcoleData.numero_agrement) {
            toast.error("Ces champs sont requis")
        }
    }

    const handleChange = (key: keyof RaisonSociale, value: string) => {
        setRsSociale(prev => ({ ...prev, [key]: value }))
    }

    const handleChangeAutoEcole = (key: keyof AutoEcoleProfile, value: string) => {
        setAutoEcoleData(prev => ({ ...prev, [key]: value }))
    }

    const postFisrtVehicule = () => {
        router.push('/vendeur/addVehicle')
    }

    if (role === "vendeur") {
        if (stepIndex === 0) return <WelcomeStep />
        // Même formulaire que concessionnaire — vendeur renseigne aussi téléphone + adresse
        if (stepIndex === 1) return (
            <form onSubmit={handleSubmitContact} className="flex flex-col gap-4 mt-2">
                <div>
                    <Label>Téléphone</Label>
                    <Input
                        type="text"
                        placeholder="Téléphone"
                        value={rsSociale.telephone}
                        onChange={(e) => handleChange("telephone", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
                <div>
                    <Label>Adresse</Label>
                    <Input
                        type="text"
                        placeholder="Adresse"
                        value={rsSociale.adresse}
                        onChange={(e) => handleChange("adresse", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
            </form>
        )
        if (stepIndex === 2) return <div>{/* TODO : bouton vers /vendeur/addVehicle */}
            <Button onClick={postFisrtVehicule}>Ajouter votre premier véhicule</Button>
        </div>
        if (stepIndex === 3) return <FinishStep />
    }

    if (role === "concessionnaire") {
        if (stepIndex === 0) return <WelcomeStep />
        if (stepIndex === 1) return (
            <form onSubmit={handleSubmitContact} className="flex flex-col gap-4 mt-2">
                <div>
                    <Label>Téléphone</Label>
                    <Input
                        type="text"
                        placeholder="Téléphone"
                        value={rsSociale.telephone}
                        onChange={(e) => handleChange("telephone", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
                <div>
                    <Label>Adresse</Label>
                    <Input
                        type="text"
                        placeholder="Adresse"
                        value={rsSociale.adresse}
                        onChange={(e) => handleChange("adresse", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
            </form>
        )
        if (stepIndex === 2) return (
            <div className="flex flex-col items-center gap-4 py-6 text-center text-muted-foreground">
                <p className="text-sm">Ajoutez votre premier véhicule au catalogue de votre concession.</p>
                <Button onClick={() => router.push('/partenaire/mongarage')}>
                    Ajouter votre premier véhicule
                </Button>
            </div>
        )
        if (stepIndex === 3) return <FinishStep />
    }

    if (role === "auto_ecole") {
        if (stepIndex === 0) return <WelcomeStep />
        // Formulaire spécifique auto-école — champs différents de RaisonSociale
        if (stepIndex === 1) return (
            <form onSubmit={handleSubmitAutoEcole} className="flex flex-col gap-4 mt-2">
                <div>
                    <Label>Raison sociale</Label>
                    <Input
                        type="text"
                        placeholder="Nom de votre auto-école"
                        value={autoEcoleData.raison_sociale}
                        onChange={(e) => handleChangeAutoEcole("raison_sociale", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
                <div>
                    <Label>Numéro d'agrément</Label>
                    <Input
                        type="text"
                        placeholder="Numéro d'agrément officiel"
                        value={autoEcoleData.numero_agrement}
                        onChange={(e) => handleChangeAutoEcole("numero_agrement", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
            </form>
        )
        if (stepIndex === 2) return (
            <div className="flex flex-col items-center gap-4 py-6 text-center text-muted-foreground">
                <p className="text-sm">Créez votre première formation pour accueillir vos élèves.</p>
                <Button onClick={() => router.push('/partenaire/formations')}>
                    Créer une formation
                </Button>
            </div>
        )
        if (stepIndex === 3) return <FinishStep />
    }

    if (role === "client") {
        if (stepIndex === 0) return <WelcomeStep />
        if (stepIndex === 1) return (
            <form onSubmit={handleSubmitContact} className="flex flex-col gap-4 mt-2">
                <div>
                    <Label>Téléphone</Label>
                    <Input
                        type="text"
                        placeholder="Téléphone (optionnel)"
                        value={rsSociale.telephone}
                        onChange={(e) => handleChange("telephone", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
                <div>
                    <Label>Adresse</Label>
                    <Input
                        type="text"
                        placeholder="Adresse (optionnel)"
                        value={rsSociale.adresse}
                        onChange={(e) => handleChange("adresse", e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:border-[#efbf04] focus:ring-[#efbf04]/20"
                    />
                </div>
            </form>
        )
        if (stepIndex === 2) return <FinishStep />
    }

    return null
}

function WelcomeStep() {
    return (
        <div className="flex flex-col items-center gap-4 py-6 text-center text-muted-foreground">
            <p className="text-sm">
                Ce guide rapide vous prendra moins de 2 minutes.
            </p>
        </div>
    )
}

function FinishStep() {
    return (
        <div className="flex flex-col items-center gap-4 py-6 text-center text-muted-foreground">
            <p className="text-sm">
                Vous pouvez toujours compléter votre profil plus tard depuis les Paramètres.
            </p>
        </div>
    )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function OnboardingWizard() {
    const { user, setUser } = useUser()
    const [step, setStep] = useState(0)
    const [finishing, setFinishing] = useState(false)

    // État du formulaire de profil — vit ici pour être accessible dans handleFinish
    const [rsSociale, setRsSociale] = useState<RaisonSociale>({
        telephone: "",
        adresse: "",
    })

    // État spécifique auto-école — champs différents, état séparé pour ne pas polluer RaisonSociale
    const [autoEcoleData, setAutoEcoleData] = useState<AutoEcoleProfile>({
        raison_sociale: "",
        numero_agrement: "",
    })

    // Rôles concernés par l'onboarding wizard
    const ROLES_WITH_ONBOARDING = ["client", "vendeur", "concessionnaire", "auto_ecole"]

    // N'affiche le wizard que si :
    // 1. L'utilisateur est connecté
    // 2. Son rôle est concerné
    // 3. Il n'a pas encore terminé l'onboarding
    const shouldShow =
        !!user &&
        ROLES_WITH_ONBOARDING.includes(user.role) &&
        user.onboarding_completed_at === null

    if (!shouldShow) return null

    const steps = STEPS[user!.role] ?? []
    const isLastStep = step === steps.length - 1
    const currentStep = steps[step]

    // Pourcentage de progression pour la barre
    const progress = Math.round(((step + 1) / steps.length) * 100)

    const handleNext = () => {
        if (step < steps.length - 1) setStep(s => s + 1)
    }

    const handlePrev = () => {
        if (step > 0) setStep(s => s - 1)
    }

    /**
     * Appelle le backend pour marquer l'onboarding terminé,
     * puis met à jour le contexte utilisateur sans recharger la page.
     */
    const handleFinish = async () => {
        setFinishing(true)
        try {
            if (user.role === "auto_ecole") {
                await submitAutoEcoleProfile(autoEcoleData)
            } else if (user.role === "client") {
                // Champs optionnels pour le client — on n'envoie que si les deux sont remplis
                if (rsSociale.telephone && rsSociale.adresse) {
                    await submitOnboardingProfile(rsSociale)
                }
            } else {
                // 1. Sauvegarde du profil en premier — finishOnboarding doit trouver les données déjà en base
                await submitOnboardingProfile(rsSociale)
            }
            // 2. Marque l'onboarding terminé et récupère le user mis à jour
            // On utilise une variable séparée car Promise.all retourne un tableau — res[0], res[1] — pas res.data
            const res = await finishOnboarding()
            if (res.data?.user) {
                setUser(res.data.user as typeof user)
            }
            toast.success("Onboarding terminé, bienvenue !")
        } catch {
            toast.error("Erreur lors de la finalisation, réessayez.")
        } finally {
            setFinishing(false)
        }
    }

    return (
        <Dialog open={true}>
            <DialogContent
                className="sm:max-w-md"
                // Empêche la fermeture en cliquant à l'extérieur
                onInteractOutside={e => e.preventDefault()}
                onEscapeKeyDown={e => e.preventDefault()}
            >
                <DialogHeader>
                    {/* Barre de progression */}
                    <div className="w-full bg-muted rounded-full h-1.5 mb-4">
                        <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Indicateur d'étape */}
                    <p className="text-xs text-muted-foreground">
                        Étape {step + 1} sur {steps.length}
                    </p>

                    <DialogTitle>{currentStep.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{currentStep.description}</p>
                </DialogHeader>

                {/* Zone de contenu — à remplir étape par étape */}
                <div className="min-h-25">
                    {/* rsSociale et setRsSociale passés en props pour que StepContent puisse lire et modifier l'état */}
                    <StepContent
                        role={user!.role}
                        stepIndex={step}
                        rsSociale={rsSociale}
                        setRsSociale={setRsSociale}
                        autoEcoleData={autoEcoleData}
                        setAutoEcoleData={setAutoEcoleData}
                    />
                </div>

                <DialogFooter className="flex justify-between gap-2 sm:justify-between">
                    <Button
                        variant="ghost"
                        onClick={handlePrev}
                        disabled={step === 0}
                    >
                        Précédent
                    </Button>

                    {isLastStep ? (
                        <Button onClick={handleFinish} disabled={finishing}>
                            {finishing ? "Enregistrement…" : "Terminer"}
                        </Button>
                    ) : (
                        <Button onClick={handleNext}>
                            Suivant
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
