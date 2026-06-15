"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { MapPin, Star, Navigation } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGeolocation } from "@/src/hooks/useGeolocation"
import {
  getProches,
  type UserProche,
} from "@/src/actions/geolocalisation.actions"

// ─── Import dynamique obligatoire : Leaflet utilise `window` ─────────────────
const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false })

// ─── Constantes ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "vendeur", label: "Vendeurs" },
  { value: "concessionnaire", label: "Concessionnaires" },
  { value: "auto_ecole", label: "Auto-écoles" },
] as const

const RAYON_OPTIONS = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "20", label: "20 km" },
  { value: "50", label: "50 km" },
] as const

/** Couleurs de badge par rôle (cohérent avec MapView) */
const ROLE_COLORS: Record<UserProche["role"], string> = {
  vendeur: "bg-amber-100 text-amber-700",
  concessionnaire: "bg-purple-100 text-purple-700",
  auto_ecole: "bg-cyan-100 text-cyan-700",
}

const ROLE_LABELS: Record<UserProche["role"], string> = {
  vendeur: "Vendeur",
  concessionnaire: "Concessionnaire",
  auto_ecole: "Auto-école",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendeursProchesPage() {
  const { position, loading: geoLoading } = useGeolocation()

  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [rayon, setRayon] = useState<string>("20")
  const [results, setResults] = useState<UserProche[]>([])
  const [fetching, setFetching] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Référence vers le centre de la carte — permet de recentrer sans remount
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)

  // Initialise le centre de la carte dès que la position est disponible
  useEffect(() => {
    if (position && !mapCenterRef.current) {
      mapCenterRef.current = { lat: position.lat, lng: position.lng }
      setMapCenter({ lat: position.lat, lng: position.lng })
    }
  }, [position])

  // Relance la recherche quand la position ou les filtres changent
  useEffect(() => {
    if (!position) return

    const fetchData = async () => {
      setFetching(true)
      try {
        const role = roleFilter === "all" ? undefined : roleFilter
        const res = await getProches(position.lat, position.lng, Number(rayon), role)
        setResults((res.data as unknown as UserProche[]) ?? [])
      } catch {
        setResults([])
      } finally {
        setFetching(false)
      }
    }

    fetchData()
  }, [position, roleFilter, rayon])

  /** Clic sur une card → recentrer la carte sur ce vendeur */
  const handleCardClick = (user: UserProche) => {
    setSelectedId(user.id)
    setMapCenter({ lat: user.latitude, lng: user.longitude })
  }

  const isLoading = geoLoading || fetching

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[360px_1fr] h-[calc(100vh-3.5rem)] mt-14 overflow-hidden">

      {/* ── Sidebar gauche ── */}
      <aside className="flex flex-col h-full border-r border-zinc-200 bg-white overflow-hidden">

        {/* Header sidebar */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-100 shrink-0">
          <h1 className="text-base font-bold text-zinc-900 leading-tight">
            Vendeurs & partenaires proches
          </h1>

          {/* Badge position */}
          {position && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Navigation className="h-3 w-3 text-zinc-400" />
              <span className="text-xs text-zinc-500">
                {position.isFallback ? (
                  <>
                    <span className="font-medium text-amber-600">Abidjan</span>
                    {" "}(position par défaut)
                  </>
                ) : (
                  <span className="font-medium text-emerald-600">Ma position</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Filtres */}
        <div className="px-4 py-3 border-b border-zinc-100 shrink-0 flex gap-2">
          <div className="flex-1">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-28">
            <Select value={rayon} onValueChange={setRayon}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Rayon" />
              </SelectTrigger>
              <SelectContent>
                {RAYON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compteur résultats */}
        {!isLoading && (
          <p className="px-4 py-2 text-xs text-zinc-400 shrink-0">
            {results.length} résultat{results.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Liste scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">

          {/* Skeletons pendant le chargement */}
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}

          {/* Empty state */}
          {!isLoading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-8 w-8 text-zinc-300 mb-3" />
              <p className="text-sm font-medium text-zinc-600">Aucun résultat</p>
              <p className="text-xs text-zinc-400 mt-1">
                Essaie d'augmenter le rayon de recherche
              </p>
            </div>
          )}

          {/* Cards résultats */}
          {!isLoading &&
            results.map((user) => (
              <button
                key={user.id}
                onClick={() => handleCardClick(user)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer
                  ${selectedId === user.id
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-sm font-semibold text-zinc-600 uppercase">
                  {(user.raison_sociale ?? user.fullname).charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Nom */}
                  <p className="text-sm font-semibold text-zinc-900 truncate">
                    {user.raison_sociale ?? user.fullname}
                  </p>

                  {/* Rôle + distance */}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {Number(user.distance).toFixed(1)} km
                    </span>
                  </div>

                  {/* Note si disponible */}
                  {user.note_moyenne != null && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-zinc-500">
                        {Number(user.note_moyenne).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
        </div>
      </aside>

      {/* ── Carte droite ── */}
      <div className="relative h-[50vh] lg:h-full isolate">
        {mapCenter ? (
          <MapView
            center={mapCenter}
            markers={results}
            onMarkerClick={(user) => setSelectedId(user.id)}
            className="h-full w-full"
          />
        ) : (
          // Placeholder pendant que la position se résout
          <div className="h-full w-full flex items-center justify-center bg-zinc-50">
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <MapPin className="h-8 w-8 animate-pulse" />
              <p className="text-sm">Chargement de la carte...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
