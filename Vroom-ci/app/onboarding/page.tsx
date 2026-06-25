"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { api } from "@/src/lib/api"
import { useUser } from "@/src/context/UserContext"
import {finishOnboarding} from "@/src/actions/onboarding.actions"

type Role = "client" | "vendeur"

export default function OnboardingPage() {
    const router = useRouter()
    const { setUser } = useUser()
    const [step, setStep] = useState<1 | 2>(1)
    const [role, setRole] = useState<Role | null>(null)
    const [telephone, setTelephone] = useState("")
    const [adresse, setAdresse] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!role || !telephone || !adresse) {
            toast.error("Tous les champs sont requis")
            return
        }

        setLoading(true)
        const id = toast.loading("Enregistrement en cours...")

        try {
            const res = await api.post<{ success: boolean; role: string }>("/auth/complete-onboarding", {
                role,
                telephone,
                adresse,
            })

            const finishRes = await finishOnboarding()
            // Mettre à jour le cookie user_role côté client
            document.cookie = `user_role=${res.data?.role}; path=/; max-age=${60 * 60 * 24 * 7}`
            // Supprimer le cookie onboarding_pending
            document.cookie = "onboarding_pending=; path=/; max-age=0"

            // Rafraîchir le contexte utilisateur avec les nouvelles données (téléphone, adresse, rôle)
            setUser(finishRes?.data?.user ?? null)

            toast.dismiss(id)
            toast.success("Profil complété !")

            // Rediriger vers le bon dashboard
            router.push(res.data?.role === "vendeur" ? "/vendeur/dashboard" : "/client/profil")
        } catch {
            toast.dismiss(id)
            toast.error("Une erreur est survenue, réessaie.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">

                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Image src="/logo.svg" alt="Move CI" width={90} height={52} />
                </div>

                <h1 className="text-2xl font-bold text-zinc-900 mb-1">Bienvenue !</h1>
                <p className="text-zinc-500 text-sm mb-8">
                    Complète ton profil pour accéder à la plateforme.
                </p>

                {/* Étape 1 — Choix du rôle */}
                {step === 1 && (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-zinc-700">Tu viens sur Move Ci pour :</p>

                        <button
                            onClick={() => { setRole("client"); setStep(2) }}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                role === "client"
                                    ? "border-zinc-900 bg-zinc-50"
                                    : "border-zinc-200 hover:border-zinc-400"
                            }`}
                        >
                            <p className="font-semibold text-zinc-900">Acheter ou louer un véhicule</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Je suis client</p>
                        </button>

                        <button
                            onClick={() => { setRole("vendeur"); setStep(2) }}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                role === "vendeur"
                                    ? "border-zinc-900 bg-zinc-50"
                                    : "border-zinc-200 hover:border-zinc-400"
                            }`}
                        >
                            <p className="font-semibold text-zinc-900">Vendre ou louer mes véhicules</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Je suis vendeur</p>
                        </button>
                    </div>
                )}

                {/* Étape 2 — Coordonnées */}
                {step === 2 && (
                    <div className="space-y-4">
                        <button
                            onClick={() => setStep(1)}
                            className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1 mb-2"
                        >
                            ← Retour
                        </button>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                                Téléphone
                            </label>
                            <input
                                type="tel"
                                value={telephone}
                                onChange={e => setTelephone(e.target.value)}
                                placeholder="Ex : 0102030405"
                                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-zinc-900 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                                Adresse
                            </label>
                            <input
                                type="text"
                                value={adresse}
                                onChange={e => setAdresse(e.target.value)}
                                placeholder="Ex : Cocody, Abidjan"
                                className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-zinc-900 transition"
                            />
                            <p className="text-xs text-zinc-400 mt-1">
                                Utilisée pour te mettre en relation avec les vendeurs proches.
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !telephone || !adresse}
                            className="w-full bg-zinc-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Accéder à la plateforme
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
