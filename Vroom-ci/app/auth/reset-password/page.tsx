"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Eye, EyeOff, Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { resetPassword } from "@/src/actions/auth.actions"
import Link from "next/link"

// Le contenu est dans un composant séparé car useSearchParams()
// doit être enveloppé dans <Suspense> avec l'App Router de Next.js
function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Ces deux paramètres sont injectés dans l'URL par le backend
    const token = searchParams.get("token") ?? ""
    const email = searchParams.get("email") ?? ""

    const [password, setPassword] = useState("")
    const [confirmation, setConfirmation] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    // Lien invalide (accès direct sans token/email dans l'URL)
    if (!token || !email) {
        return (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-sm text-zinc-500">Lien invalide ou expiré.</p>
                <Link href="/auth" className="text-sm text-amber-600 hover:underline font-semibold">
                    Retour à la connexion
                </Link>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmation) {
            toast.error("Les mots de passe ne correspondent pas.")
            return
        }
        if (password.length < 8) {
            toast.error("Le mot de passe doit contenir au moins 8 caractères.")
            return
        }

        setIsSubmitting(true)
        try {
            await resetPassword({
                token,
                email,
                password,
                password_confirmation: confirmation,
            })
            setSuccess(true)
        } catch (err: unknown) {
            // Le backend renvoie 422 si le token est invalide/expiré
            const msg = (err as { message?: string })?.message
            toast.error(msg ?? "Lien invalide ou expiré. Faites une nouvelle demande.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <span className="text-2xl font-bold text-zinc-900">
                        M<span className="text-amber-500">ove</span> CI
                    </span>
                </div>

                {success ? (
                    /* ── Succès ─────────────────────────────────────────────── */
                    <div className="flex flex-col items-center gap-4 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <h1 className="text-lg font-bold text-zinc-900">
                            Mot de passe réinitialisé !
                        </h1>
                        <p className="text-sm text-zinc-500">
                            Votre mot de passe a bien été mis à jour.
                            Vous pouvez maintenant vous connecter.
                        </p>
                        <Button
                            onClick={() => router.push("/auth")}
                            className="mt-2 w-full h-11 bg-[#efbf04] hover:bg-[#d4aa00] text-black font-semibold rounded-xl"
                        >
                            Se connecter
                        </Button>
                    </div>
                ) : (
                    /* ── Formulaire ─────────────────────────────────────────── */
                    <>
                        <h1 className="text-xl font-bold text-zinc-900 mb-1">
                            Nouveau mot de passe
                        </h1>
                        <p className="text-sm text-zinc-500 mb-6">
                            Choisissez un mot de passe d&apos;au moins 8 caractères.
                        </p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Nouveau mot de passe */}
                            <div className="space-y-1.5">
                                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={8}
                                        placeholder="Minimum 8 caractères"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-11 rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirmation */}
                            <div className="space-y-1.5">
                                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input
                                        id="confirm-password"
                                        type={showConfirm ? "text" : "password"}
                                        required
                                        placeholder="Répétez le mot de passe"
                                        value={confirmation}
                                        onChange={(e) => setConfirmation(e.target.value)}
                                        className="pl-10 pr-10 h-11 rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(p => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-11 bg-[#efbf04] hover:bg-[#d4aa00] text-black font-semibold rounded-xl mt-2"
                            >
                                {isSubmitting
                                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Réinitialisation...</>
                                    : "Réinitialiser mon mot de passe"
                                }
                            </Button>
                        </form>

                        <p className="text-center text-xs text-zinc-400 mt-6">
                            <Link href="/auth" className="hover:text-amber-600 transition-colors">
                                ← Retour à la connexion
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordContent />
        </Suspense>
    )
}
