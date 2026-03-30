"use client"

export const dynamic = 'force-dynamic'

import { Button } from "@/components/ui/button"
import { ShieldX, ShieldAlert } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function CompteBloque() {
    const searchParams = useSearchParams()
    const raison = searchParams.get("raison")
    const isBanni = raison === "banni"

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
            {isBanni
                ? <ShieldX className="h-16 w-16 text-red-500 mb-4" />
                : <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
            }

            <h1 className="text-2xl font-bold text-zinc-800 mb-2">
                {isBanni ? "Compte banni" : "Compte suspendu"}
            </h1>

            <p className="text-zinc-500 max-w-sm mb-6">
                {isBanni
                    ? "Votre compte a été banni définitivement pour non-respect des conditions d'utilisation."
                    : "Votre compte est temporairement suspendu. Contactez le support pour plus d'informations."
                }
            </p>

            {!isBanni && (
                <Link href="/client/aide">
                    <Button variant="outline" className="rounded-xl">
                        Contacter le support
                    </Button>
                </Link>
            )}
        </div>
    )
}
