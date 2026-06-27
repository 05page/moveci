"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ArrowLeft,
    GitCompare,
    Check,
    X,
    Car,
    ExternalLink,
    Tag,
    KeyRound,
} from "lucide-react"
import { getVehicule } from "@/src/actions/vehicules.actions"
import type { vehicule } from "@/src/types"
import { getPhotoUrl } from "@/src/lib/utils"

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Retourne true si la valeur correspond à l'index i du tableau vals
 * ou si ce n'est pas comparable (ex : strings).
 * Utilisé pour mettre en valeur la cellule "gagnante" sur les critères numériques.
 */
function isMin(vals: number[], i: number): boolean {
    const valid = vals.filter(v => !isNaN(v))
    if (valid.length < 2) return false
    return vals[i] === Math.min(...valid)
}

function isMax(vals: number[], i: number): boolean {
    const valid = vals.filter(v => !isNaN(v))
    if (valid.length < 2) return false
    return vals[i] === Math.max(...valid)
}

/** Classe CSS appliquée à une cellule "meilleure valeur". */
const WINNER_CLASS = "bg-green-50 text-green-700 font-bold"

// ─── Composant principal (doit être wrappé dans <Suspense> pour useSearchParams) ──

function ComparerContent() {
    const searchParams = useSearchParams()
    const idsParam = searchParams.get("ids") ?? ""
    const ids = idsParam.split(",").filter(Boolean)

    const [vehicules, setVehicules] = useState<(vehicule | null)[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (ids.length < 2) {
            setIsLoading(false)
            return
        }

        const fetchAll = async () => {
            setIsLoading(true)
            try {
                // Charge tous les véhicules en parallèle ; null si l'un échoue
                const results = await Promise.all(
                    ids.map(id =>
                        getVehicule(id)
                            .then(res => res?.data ?? null)
                            .catch(() => null)
                    )
                )
                setVehicules(results)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsParam])

    // ── Garde : moins de 2 IDs fournis ──────────────────────────────────────
    if (!isLoading && ids.length < 2) {
        return (
            <div className="min-h-screen pt-24 px-4 max-w-6xl mx-auto">
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                        <GitCompare className="h-8 w-8 text-zinc-400" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900">
                        Sélectionnez au moins 2 véhicules
                    </h2>
                    <p className="text-sm text-zinc-500 max-w-sm">
                        Retournez au catalogue et utilisez le bouton
                        <GitCompare className="inline h-3.5 w-3.5 mx-1 text-zinc-400" />
                        sur les véhicules que vous souhaitez comparer.
                    </p>
                    <Link href="/vehicles">
                        <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Retour au catalogue
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    // ── Données dérivées pour la mise en valeur ──────────────────────────────
    const prix = vehicules.map(v => v?.prix ?? NaN)
    const annees = vehicules.map(v => v?.description?.annee ?? NaN)
    const kms = vehicules.map(v => parseInt(v?.description?.kilometrage ?? "NaN"))

    // ─── Skeleton ───────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen pt-20 px-4 max-w-6xl mx-auto space-y-6 mb-12">
                {/* En-tête */}
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-36 rounded-xl" />
                    <Skeleton className="h-8 w-56 rounded-xl" />
                </div>
                {/* Tableau skeleton */}
                <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr>
                                <td className="w-32 p-4" />
                                {ids.map((_, i) => (
                                    <td key={i} className="p-4">
                                        <div className="space-y-3">
                                            <Skeleton className="h-40 w-full rounded-xl" />
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                            <Skeleton className="h-9 w-full rounded-lg" />
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <tr key={i} className="border-t border-zinc-100">
                                    <td className="p-4">
                                        <Skeleton className="h-4 w-24" />
                                    </td>
                                    {ids.map((__, j) => (
                                        <td key={j} className="p-4">
                                            <Skeleton className="h-4 w-20" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    // ─── Rendu principal ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen pt-20 px-4 max-w-6xl mx-auto space-y-6 mb-12">

            {/* En-tête de page */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom duration-400">
                <Link href="/vehicles">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-50 gap-2 cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour au catalogue
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <GitCompare className="h-5 w-5 text-zinc-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-zinc-900 leading-tight">
                            Comparer les véhicules
                        </h1>
                        <p className="text-xs text-zinc-500">{vehicules.filter(Boolean).length} véhicules sélectionnés</p>
                    </div>
                </div>
            </div>

            {/* Tableau de comparaison — scroll horizontal sur mobile */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm animate-in fade-in slide-in-from-bottom duration-500">
                <table className="w-full min-w-[560px]">

                    {/* ── En-têtes : photo + nom + bouton ── */}
                    <thead>
                        <tr className="border-b border-zinc-200">
                            {/* Colonne label — vide en tête */}
                            <th className="w-32 p-4 text-left" />
                            {vehicules.map((v, i) => {
                                if (!v) return (
                                    <th key={i} className="p-4 text-center align-top">
                                        <div className="flex flex-col items-center gap-2 text-zinc-400 text-xs">
                                            <Car className="h-8 w-8" />
                                            Indisponible
                                        </div>
                                    </th>
                                )

                                const primaryPhoto = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
                                const imageUrl = primaryPhoto
                                    ? getPhotoUrl(primaryPhoto.path)
                                    : null

                                return (
                                    <th key={v.id} className="p-4 align-top font-normal">
                                        {/* Photo du véhicule */}
                                        <div className="relative h-40 rounded-xl overflow-hidden bg-zinc-100 flex items-center justify-center mb-3">
                                            {imageUrl
                                                ? <Image
                                                    src={imageUrl}
                                                    alt={`${v.description?.marque} ${v.description?.modele}`}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                                : <Car className="h-10 w-10 text-zinc-300" />
                                            }
                                            {/* Badge type */}
                                            <Badge className={`absolute top-2 left-2 rounded-full text-xs ${v.post_type === "vente"
                                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                }`}>
                                                {v.post_type === "vente"
                                                    ? <><Tag className="h-3 w-3 mr-1" />Vente</>
                                                    : <><KeyRound className="h-3 w-3 mr-1" />Location</>
                                                }
                                            </Badge>
                                        </div>

                                        {/* Nom + infos courtes */}
                                        <p className="font-bold text-sm text-zinc-900 text-left">
                                            {v.description?.marque} {v.description?.modele}
                                        </p>
                                        <p className="text-xs text-zinc-500 text-left mb-3">
                                            {v.description?.annee} · {v.description?.carburant}
                                        </p>

                                        {/* Lien page détail */}
                                        <Link href={`/vehicles/${v.id}`} className="block">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full rounded-lg text-xs cursor-pointer border-zinc-200 gap-1.5"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                Voir détails
                                            </Button>
                                        </Link>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {/* ── Section PRIX ── */}
                        <SectionHeader label="Prix" colCount={vehicules.length} />
                        <tr className="border-b border-zinc-100">
                            <td className="px-4 py-3 text-xs text-zinc-500">Prix</td>
                            {vehicules.map((v, i) => (
                                <td
                                    key={i}
                                    className={`px-4 py-3 text-sm text-center rounded-none ${isMin(prix, i) ? WINNER_CLASS : "text-zinc-800"}`}
                                >
                                    {v
                                        ? <>
                                            <span className="font-black">{v.prix?.toLocaleString()}</span>
                                            <span className="text-xs font-normal ml-1 text-zinc-500">
                                                FCFA{v.post_type === "location" ? "/j" : ""}
                                            </span>
                                        </>
                                        : "—"
                                    }
                                </td>
                            ))}
                        </tr>

                        {/* ── Section CARACTÉRISTIQUES ── */}
                        <SectionHeader label="Caractéristiques" colCount={vehicules.length} />

                        <RowText
                            label="Type"
                            values={vehicules.map(v =>
                                v ? (v.post_type === "vente" ? "Vente" : "Location") : "—"
                            )}
                        />
                        <RowNumber
                            label="Année"
                            values={annees}
                            format={n => String(n)}
                            winner="max"
                        />
                        <RowNumber
                            label="Kilométrage"
                            values={kms}
                            format={n => `${n.toLocaleString()} km`}
                            winner="min"
                        />
                        <RowText
                            label="Carburant"
                            values={vehicules.map(v => v?.description?.carburant ?? "—")}
                        />
                        <RowText
                            label="Transmission"
                            values={vehicules.map(v => v?.description?.transmission ?? "—")}
                        />
                        <RowText
                            label="Couleur"
                            values={vehicules.map(v => v?.description?.couleur ?? "—")}
                        />
                        <RowNumber
                            label="Portes"
                            values={vehicules.map(v => v?.description?.nombre_portes ?? NaN)}
                            format={n => String(n)}
                        />
                        <RowNumber
                            label="Places"
                            values={vehicules.map(v => v?.description?.nombre_places ?? NaN)}
                            format={n => String(n)}
                        />

                        {/* ── Section DOCUMENTS ── */}
                        <SectionHeader label="Documents" colCount={vehicules.length} />

                        <RowBool
                            label="Carte grise"
                            values={vehicules.map(v => v?.description?.carte_grise ?? null)}
                        />
                        <RowBool
                            label="Assurance"
                            values={vehicules.map(v => v?.description?.assurance ?? null)}
                        />
                        <RowBool
                            label="Visite tech."
                            values={vehicules.map(v => v?.description?.visite_technique ?? null)}
                        />
                        {/* Historique accidents — texte custom */}
                        <tr className="border-b border-zinc-100 last:border-0">
                            <td className="px-4 py-3 text-xs text-zinc-500">Historique acc.</td>
                            {vehicules.map((v, i) => (
                                <td key={i} className="px-4 py-3 text-xs text-center">
                                    {v === null
                                        ? "—"
                                        : v.description?.historique_accidents
                                            ? <span className="text-red-600 font-semibold">Accident déclaré</span>
                                            : <span className="text-green-600 font-semibold">Sans accident</span>
                                    }
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── Sous-composants de tableau ──────────────────────────────────────────────

/** Ligne de séparation de section avec titre sur fond zinc. */
function SectionHeader({ label, colCount }: { label: string; colCount: number }) {
    return (
        <tr className="bg-zinc-50 border-b border-zinc-200">
            <td
                colSpan={colCount + 1}
                className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider"
            >
                {label}
            </td>
        </tr>
    )
}

/** Ligne de texte simple sans mise en valeur. */
function RowText({ label, values }: { label: string; values: string[] }) {
    return (
        <tr className="border-b border-zinc-100">
            <td className="px-4 py-3 text-xs text-zinc-500">{label}</td>
            {values.map((val, i) => (
                <td key={i} className="px-4 py-3 text-sm text-zinc-800 text-center">{val}</td>
            ))}
        </tr>
    )
}

/**
 * Ligne numérique avec mise en valeur optionnelle du min ou du max.
 * @param winner - "min" | "max" | undefined — quel index mettre en vert
 */
function RowNumber({
    label,
    values,
    format,
    winner,
}: {
    label: string
    values: number[]
    format: (n: number) => string
    winner?: "min" | "max"
}) {
    return (
        <tr className="border-b border-zinc-100">
            <td className="px-4 py-3 text-xs text-zinc-500">{label}</td>
            {values.map((val, i) => {
                const isWinner = winner === "min" ? isMin(values, i) : winner === "max" ? isMax(values, i) : false
                return (
                    <td
                        key={i}
                        className={`px-4 py-3 text-sm text-center ${isWinner ? WINNER_CLASS : "text-zinc-800"}`}
                    >
                        {isNaN(val) ? "—" : format(val)}
                    </td>
                )
            })}
        </tr>
    )
}

/**
 * Ligne booléenne : true → icône Check vert, false → icône X rouge, null → "—".
 */
function RowBool({ label, values }: { label: string; values: (boolean | null)[] }) {
    return (
        <tr className="border-b border-zinc-100">
            <td className="px-4 py-3 text-xs text-zinc-500">{label}</td>
            {values.map((val, i) => (
                <td key={i} className="px-4 py-3 text-center">
                    {val === null
                        ? <span className="text-zinc-400 text-xs">—</span>
                        : val
                            ? <Check className="h-4 w-4 text-green-500 mx-auto" />
                            : <X className="h-4 w-4 text-red-400 mx-auto" />
                    }
                </td>
            ))}
        </tr>
    )
}

// ─── Export par défaut avec Suspense (obligatoire pour useSearchParams) ──────

export default function ComparerPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen pt-24 px-4 max-w-6xl mx-auto space-y-6">
                    <Skeleton className="h-9 w-48 rounded-xl" />
                    <Skeleton className="h-96 w-full rounded-2xl" />
                </div>
            }
        >
            <ComparerContent />
        </Suspense>
    )
}
