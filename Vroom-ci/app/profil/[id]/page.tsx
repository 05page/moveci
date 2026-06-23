"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { vehicule, Avis } from "@/src/types"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    MapPin, Phone, Star, Car, CalendarDays, PackageX, MessageSquare, ArrowLeft,
} from "lucide-react"
import { cn, getPhotoUrl } from "@/src/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// ─── Types ────────────────────────────────────────────────────────────────────

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

type TabKey = "annonces" | "avis" | "infos"

const TABS: { key: TabKey; label: string }[] = [
    { key: "annonces", label: "Annonces" },
    { key: "avis",     label: "Avis clients" },
    { key: "infos",    label: "Informations" },
]

const ROLE_LABELS: Record<string, string> = {
    vendeur:         "Vendeur particulier",
    concessionnaire: "Concessionnaire",
    auto_ecole:      "Auto-école",
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfilSkeleton() {
    return (
        <div className="min-h-screen bg-zinc-50 pt-16 px-4 md:px-8 pb-16">
            <div className="max-w-4xl mx-auto pt-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-44" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                </div>
                <div className="flex gap-6 border-b border-zinc-200 pb-3">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-5 w-20 rounded" />)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilVendeurPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [data, setData]         = useState<ProfilData | null>(null)
    const [loading, setLoading]   = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [tab, setTab]           = useState<TabKey>("annonces")

    useEffect(() => {
        fetch(`/api/proxy/users/${id}/profil`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(res => setData(res.data ?? null))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <ProfilSkeleton />

    if (notFound || !data) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto shadow-sm">
                        <Car className="h-7 w-7 text-zinc-300" />
                    </div>
                    <p className="font-black text-zinc-900">Vendeur introuvable</p>
                    <p className="text-sm text-zinc-400">Ce profil n&apos;existe pas ou n&apos;est plus disponible.</p>
                </div>
            </div>
        )
    }

    const { vendeur, vehicules, avis } = data
    const initiales = vendeur.fullname.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

    return (
        <div className="min-h-screen bg-zinc-50 pt-16 pb-16">
            <div className="max-w-4xl mx-auto px-4 md:px-8">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="pt-6 pb-2">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour
                    </button>
                </div>
                <div className="py-6 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                        <span className="text-white text-xl font-black">{initiales}</span>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-black text-zinc-900 truncate">{vendeur.fullname}</h1>
                        <span className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 uppercase tracking-wide">
                            {ROLE_LABELS[vendeur.role] ?? vendeur.role}
                        </span>
                        {vendeur.note_moyenne > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                                {[1,2,3,4,5].map(i => (
                                    <Star key={i} className={cn(
                                        "h-3.5 w-3.5",
                                        i <= Math.round(vendeur.note_moyenne)
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-zinc-200"
                                    )} />
                                ))}
                                <span className="text-xs text-zinc-500 ml-1">
                                    {vendeur.note_moyenne.toFixed(1)} · {vendeur.nb_avis} avis
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tabs ────────────────────────────────────────────── */}
                <div className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
                    {TABS.map(t => {
                        const count = t.key === "annonces" ? vehicules.length
                                    : t.key === "avis"     ? avis.length
                                    : null
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
                                    tab === t.key
                                        ? "border-move-gold text-move-gold"
                                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                                )}
                            >
                                {t.label}
                                {count !== null && count > 0 && (
                                    <span className={cn(
                                        "text-xs font-bold px-1.5 py-0.5 rounded-full",
                                        tab === t.key
                                            ? "bg-move-gold/15 text-move-gold"
                                            : "bg-zinc-100 text-zinc-500"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* ── Annonces ────────────────────────────────────────── */}
                {tab === "annonces" && (
                    vehicules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-4 shadow-sm">
                                <PackageX className="h-7 w-7 text-zinc-300" />
                            </div>
                            <p className="font-bold text-zinc-900 mb-1">Aucune annonce</p>
                            <p className="text-sm text-zinc-400">Ce vendeur n&apos;a pas d&apos;annonce disponible.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {vehicules.map(v => {
                                const photo    = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
                                const imageUrl = photo ? getPhotoUrl(photo.path) : null

                                return (
                                    <Link key={v.id} href={`/vehicles/${v.id}`}>
                                        <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer">
                                            <div className="h-36 bg-zinc-100 relative">
                                                {imageUrl
                                                    ? <Image src={imageUrl} alt={`${v.description?.marque} ${v.description?.modele}`} fill className="object-cover" unoptimized />
                                                    : <div className="absolute inset-0 flex items-center justify-center"><Car className="h-8 w-8 text-zinc-300" /></div>
                                                }
                                                <span className={cn(
                                                    "absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full",
                                                    v.post_type === "vente"
                                                        ? "bg-zinc-900 text-white"
                                                        : "bg-blue-600 text-white"
                                                )}>
                                                    {v.post_type === "vente" ? "Vente" : "Location"}
                                                </span>
                                            </div>
                                            <CardContent className="p-3 space-y-1">
                                                <p className="font-bold text-zinc-900 text-sm truncate">
                                                    {v.description?.marque} {v.description?.modele}
                                                </p>
                                                <p className="text-xs text-zinc-400">{v.description?.annee}</p>
                                                <p className="text-sm font-black text-move-gold">
                                                    {Number(v.prix).toLocaleString("fr-FR")} F
                                                    {v.post_type === "location" && <span className="text-xs font-normal text-zinc-400"> /jr</span>}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    )
                )}

                {/* ── Avis clients ─────────────────────────────────────── */}
                {tab === "avis" && (
                    avis.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-4 shadow-sm">
                                <MessageSquare className="h-7 w-7 text-zinc-300" />
                            </div>
                            <p className="font-bold text-zinc-900 mb-1">Aucun avis</p>
                            <p className="text-sm text-zinc-400">Ce vendeur n&apos;a pas encore reçu d&apos;avis.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {avis.map(a => (
                                <Card key={a.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-black text-zinc-700 shrink-0">
                                                    {a.client?.fullname?.charAt(0).toUpperCase() ?? "?"}
                                                </div>
                                                <p className="text-sm font-bold text-zinc-800">
                                                    {a.client?.fullname ?? "Anonyme"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                {[1,2,3,4,5].map(i => (
                                                    <Star key={i} className={cn(
                                                        "h-3.5 w-3.5",
                                                        i <= a.note
                                                            ? "fill-amber-400 text-amber-400"
                                                            : "text-zinc-200"
                                                    )} />
                                                ))}
                                            </div>
                                        </div>
                                        {a.commentaire && (
                                            <p className="text-sm text-zinc-600 leading-relaxed">{a.commentaire}</p>
                                        )}
                                        <p className="text-xs text-zinc-400 mt-2">
                                            {format(new Date(a.date_avis), "d MMMM yyyy", { locale: fr })}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )
                )}

                {/* ── Informations ─────────────────────────────────────── */}
                {tab === "infos" && (
                    <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            {vendeur.adresse && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                                        <MapPin className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Adresse</p>
                                        <p className="text-sm font-semibold text-zinc-800">{vendeur.adresse}</p>
                                    </div>
                                </div>
                            )}
                            {vendeur.telephone && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                                        <Phone className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Téléphone</p>
                                        <a href={`tel:${vendeur.telephone}`}
                                            className="text-sm font-semibold text-move-gold hover:underline">
                                            {vendeur.telephone}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {vendeur.membre_since && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                                        <CalendarDays className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Membre depuis</p>
                                        <p className="text-sm font-semibold text-zinc-800">
                                            {format(new Date(vendeur.membre_since), "MMMM yyyy", { locale: fr })}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {!vendeur.adresse && !vendeur.telephone && !vendeur.membre_since && (
                                <p className="text-sm text-zinc-400 text-center py-4">Aucune information disponible.</p>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
