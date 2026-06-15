"use client"

import { Clock, Mail, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function EnAttentePage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md text-center space-y-6">

                {/* Icône état */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="h-10 w-10 text-amber-500" />
                    </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-zinc-900">Demande envoyée !</h1>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        Votre compte partenaire est en cours de vérification par notre équipe.
                        Vous recevrez une notification dès que votre compte sera activé.
                    </p>
                </div>

                {/* Étapes */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left space-y-4">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Prochaines étapes</p>
                    {[
                        { icon: CheckCircle2, color: "text-emerald-500", label: "Compte créé", done: true },
                        { icon: Clock,        color: "text-amber-500",   label: "Vérification des documents (24-48h)", done: false },
                        { icon: Mail,         color: "text-blue-500",    label: "Notification par email", done: false },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <step.icon className={`h-5 w-5 shrink-0 ${step.done ? step.color : "text-zinc-300"}`} />
                            <span className={`text-sm ${step.done ? "text-zinc-700 font-medium" : "text-zinc-400"}`}>
                                {step.label}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <Button asChild className="w-full h-12 rounded-xl bg-[#efbf04] hover:bg-[#d4aa00] text-black font-bold">
                        <Link href="/auth">Se connecter</Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full h-12 rounded-xl text-zinc-500">
                        <Link href="/">Retour à l&apos;accueil</Link>
                    </Button>
                </div>

                <p className="text-xs text-zinc-400">
                    Une question ? Contactez-nous à <span className="text-amber-600">support@vroomci.com</span>
                </p>
            </div>
        </div>
    )
}
