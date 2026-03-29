"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { api } from "@/src/lib/api"
import { vehicule, Avis } from "@/src/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Phone, Star, Car, Package, CalendarDays } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface ProfilVendeur {
    id: string
    fullname: string
    avatar: string | null
    adresse: string | null
    telephone: string | null
    role: string
    note_moyenne: number
    nb_avis: number
    membre_since: string | null
}

interface ProfilData {
    vendeur: ProfilVendeur
    vehicules: vehicule[]
    avis: Avis[]
}

const ROLE_LABELS: Record<string, string> = {
    vendeur: "Vendeur particulier",
    concessionnaire: "Concessionnaire",
    auto_ecole: "Auto-école",
}

export default function ProfilVendeurPage() {
    const { id } = useParams<{ id: string }>()
    const [data, setData] = useState<ProfilData | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        // fetch direct via le proxy — fonctionne sans token car la route backend est publique
        fetch(`/api/proxy/users/${id}/profil`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(res => setData(res.data ?? null))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <ProfilSkeleton />

    if (notFound || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-2">
                    <Car className="h-12 w-12 mx-auto text-zinc-300" />
                    <p className="font-semibold text-zinc-700">Vendeur introuvable</p>
                    <p className="text-sm text-zinc-400">Ce profil n&apos;existe pas ou n&apos;est plus disponible.</p>
                </div>
            </div>
        )
    }

    const { vendeur, vehicules, avis } = data

    return (
        <div className="min-h-screen bg-zinc-50 pt-14 pb-16">
            {/* Header profil */}
            <div className="bg-white border-b border-zinc-100">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-5">
                        {/* Avatar initiales */}
                        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                            <span className="text-white text-xl font-bold">
                                {vendeur.fullname.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-black text-zinc-900 truncate">{vendeur.fullname}</h1>
                            <Badge variant="outline" className="mt-1 rounded-full text-xs">
                                {ROLE_LABELS[vendeur.role] ?? vendeur.role}
                            </Badge>

                            {/* Note */}
                            {vendeur.note_moyenne > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star
                                            key={i}
                                            className={cn(
                                                "h-4 w-4",
                                                i <= Math.round(vendeur.note_moyenne)
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-zinc-200"
                                            )}
                                        />
                                    ))}
                                    <span className="text-sm text-zinc-500 ml-1">
                                        {vendeur.note_moyenne.toFixed(1)} ({vendeur.nb_avis} avis)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Coordonnées */}
                    <div className="mt-5 flex flex-col gap-2">
                        {vendeur.adresse && (
                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                                <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                                {vendeur.adresse}
                            </div>
                        )}
                        {/* Téléphone cliquable pour lancer un appel */}
                        {vendeur.telephone && (
                            <a
                                href={`tel:${vendeur.telephone}`}
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                                <Phone className="h-4 w-4 shrink-0" />
                                {vendeur.telephone}
                            </a>
                        )}
                        {vendeur.membre_since && (
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <CalendarDays className="h-4 w-4 shrink-0" />
                                Membre depuis {new Date(vendeur.membre_since).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sections visibles uniquement pour les vendeurs/concessionnaires/auto-écoles */}
            {vendeur.role !== "client" && <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
                {/* Véhicules disponibles */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-zinc-700" />
                        <h2 className="font-bold text-zinc-900">
                            Véhicules disponibles
                            <span className="ml-2 text-sm font-normal text-zinc-400">({vehicules.length})</span>
                        </h2>
                    </div>

                    {vehicules.length === 0 ? (
                        <Card className="rounded-2xl border-zinc-100">
                            <CardContent className="p-8 text-center text-zinc-400 text-sm">
                                Aucun véhicule disponible pour le moment.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vehicules.map(v => {
                                const primaryPhoto = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
                                const imageUrl = primaryPhoto
                                    ? (primaryPhoto.path.startsWith('http') ? primaryPhoto.path : `${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${primaryPhoto.path}`)
                                    : null

                                return (
                                    <Card key={v.id} className="rounded-2xl border-zinc-100 overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="h-36 bg-zinc-100 relative">
                                            {imageUrl
                                                ? <Image src={imageUrl} alt={`${v.description?.marque} ${v.description?.modele}`} fill className="object-cover" unoptimized />
                                                : <div className="h-full flex items-center justify-center"><Car className="h-10 w-10 text-zinc-300" /></div>
                                            }
                                            <Badge className={cn(
                                                "absolute top-2 left-2 rounded-full text-xs font-semibold",
                                                v.post_type === "vente"
                                                    ? "bg-zinc-900 text-white"
                                                    : "bg-blue-500 text-white"
                                            )}>
                                                {v.post_type === "vente" ? "Vente" : "Location"}
                                            </Badge>
                                        </div>
                                        <CardContent className="p-3">
                                            <p className="font-semibold text-zinc-900 text-sm truncate">
                                                {v.description?.marque} {v.description?.modele}
                                            </p>
                                            <p className="text-xs text-zinc-400">{v.description?.annee}</p>
                                            <p className="text-sm font-bold text-zinc-900 mt-1">
                                                {Number(v.prix).toLocaleString("fr-FR")} FCFA
                                                {v.post_type === "location" && <span className="font-normal text-zinc-400"> /jr</span>}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Avis clients */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="h-5 w-5 text-zinc-700" />
                        <h2 className="font-bold text-zinc-900">
                            Avis clients
                            <span className="ml-2 text-sm font-normal text-zinc-400">({avis.length})</span>
                        </h2>
                    </div>

                    {avis.length === 0 ? (
                        <Card className="rounded-2xl border-zinc-100">
                            <CardContent className="p-8 text-center text-zinc-400 text-sm">
                                Aucun avis pour le moment.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {avis.map(a => (
                                <Card key={a.id} className="rounded-2xl border-zinc-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-zinc-800">
                                                {a.client?.fullname ?? "Anonyme"}
                                            </p>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Star
                                                        key={i}
                                                        className={cn(
                                                            "h-3.5 w-3.5",
                                                            i <= a.note
                                                                ? "fill-amber-400 text-amber-400"
                                                                : "text-zinc-200"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {a.commentaire && (
                                            <p className="text-sm text-zinc-600">{a.commentaire}</p>
                                        )}
                                        <p className="text-xs text-zinc-400 mt-2">
                                            {new Date(a.date_avis).toLocaleDateString("fr-FR", {
                                                day: "numeric", month: "long", year: "numeric"
                                            })}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            </div>}
        </div>
    )
}

function ProfilSkeleton() {
    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="bg-white border-b border-zinc-100">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-5">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="mt-5 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                </div>
            </div>
            <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
            </div>
        </div>
    )
}
