"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Car, ArrowRight, Sparkles, Tag, KeyRound } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/src/lib/api"
import { getPhotoUrl as buildPhotoUrl } from "@/src/lib/utils"
import { vehicule } from "@/src/types"
import { FadeIn, SlideIn, StaggerList, StaggerItem } from "@/components/ui/motion-primitives"

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Réponse retournée par GET /vehicules/suggestions.
 * `source` indique si les suggestions sont basées sur les favoris du client
 * ou sur la popularité globale (fallback quand il n'a pas encore de favoris).
 */
interface SuggestionsResponse {
  data: vehicule[]
  source: "favoris" | "populaire"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formate un nombre en prix lisible avec l'unité FCFA.
 * Ex: 3500000 → "3 500 000 FCFA"
 */
const formatPrix = (prix: number): string =>
  `${Number(prix).toLocaleString("fr-FR")} FCFA`

/**
 * Retourne l'URL de la photo principale d'un véhicule,
 * ou null si aucune photo n'est disponible.
 */
const getPhotoUrl = (v: vehicule): string | null => {
  const photo = v.photos?.find((p) => p.is_primary) ?? v.photos?.[0]
  if (!photo) return null
  return buildPhotoUrl(photo.path)
}

// ─── Sous-composant : skeleton d'une card ────────────────────────────────────

const VehicleCardSkeleton = () => (
  <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
    <Skeleton className="h-44 w-full rounded-none" />
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-9 w-full rounded-xl" />
    </CardContent>
  </Card>
)

// ─── Sous-composant : card d'un véhicule ─────────────────────────────────────

const VehicleCard = ({ v }: { v: vehicule }) => {
  const imageUrl = getPhotoUrl(v)
  const isVente = v.post_type === "vente"

  return (
    <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Vignette photo */}
      <div className="relative h-44 bg-gradient-to-br from-zinc-100 to-zinc-50 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${v.description?.marque ?? ""} ${v.description?.modele ?? ""}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <Car className="h-14 w-14 text-zinc-300" />
        )}

        {/* Badge Vente / Location — superposé sur la photo */}
        <Badge
          className={`absolute top-3 left-3 rounded-full text-xs font-semibold ${
            isVente
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
          }`}
        >
          {isVente ? (
            <Tag className="h-3 w-3 mr-1" />
          ) : (
            <KeyRound className="h-3 w-3 mr-1" />
          )}
          {isVente ? "Vente" : "Location"}
        </Badge>
      </div>

      {/* Infos */}
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-base text-zinc-900 truncate">
            {v.description?.marque} {v.description?.modele}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {v.description?.annee}
            {v.description?.carburant ? ` · ${v.description.carburant}` : ""}
          </p>
        </div>

        <p className="text-lg font-black text-zinc-900">
          {formatPrix(v.prix)}
          {!isVente && (
            <span className="text-xs font-normal text-zinc-500 ml-1">
              / jour
            </span>
          )}
        </p>

        {/* Bouton Voir — lien vers la page détail publique */}
        <Button
          asChild
          className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white font-bold gap-2 cursor-pointer"
          size="sm"
        >
          <Link href={`/vehicles/${v.id}`}>
            Voir le véhicule
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

const SuggestionsPage = () => {
  const [vehicules, setVehicules] = useState<vehicule[]>([])
  const [source, setSource] = useState<"favoris" | "populaire" | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoading(true)
        const res = await api.get<SuggestionsResponse>("/vehicules/suggestions")
        // L'API retourne { data: vehicule[], source: "favoris" | "populaire" }
        setVehicules(res.data?.data ?? [])
        setSource(res.data?.source ?? null)
      } catch {
        // Silencieux : on affiche simplement l'état vide
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuggestions()
  }, [])

  // ── État de chargement ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="pt-20 px-4 md:px-6 space-y-6 max-w-6xl mx-auto mb-12">
        {/* Skeleton en-tête */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
          <Skeleton className="h-6 w-40 rounded-full mt-1" />
        </div>

        {/* Skeleton grille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <VehicleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <FadeIn>
    <div className="pt-20 px-4 md:px-6 space-y-6 max-w-6xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom duration-500">
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <SlideIn direction="left">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">
              Suggestions pour vous
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Véhicules qui pourraient vous intéresser
            </p>
          </div>
        </div>

        {/* Badge contextuel selon la source retournée par l'API */}
        {source && (
          <Badge
            className={`rounded-full font-semibold w-fit ${
              source === "favoris"
                ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                : "bg-amber-500/10 text-amber-700 border-amber-500/20"
            }`}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {source === "favoris"
              ? "Basées sur vos favoris"
              : "Véhicules populaires"}
          </Badge>
        )}
      </div>
      </SlideIn>

      {/* ── Contenu principal ──────────────────────────────────────────────── */}
      {vehicules.length === 0 ? (
        // ── État vide ─────────────────────────────────────────────────────
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-6">
            <Car className="h-10 w-10 text-purple-300" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 mb-2">
            Aucune suggestion disponible
          </h2>
          <p className="text-sm text-zinc-500 max-w-sm mb-6">
            Ajoutez des véhicules à vos favoris pour recevoir des suggestions
            personnalisées.
          </p>
          <Button
            asChild
            className="rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white font-bold gap-2 cursor-pointer"
          >
            <Link href="/vehicles">
              Explorer le catalogue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        // ── Grille de véhicules ───────────────────────────────────────────
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {vehicules.map((v) => (
            <StaggerItem key={v.id}>
              <VehicleCard v={v} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
    </FadeIn>
  )
}

export default SuggestionsPage
